package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	authpkg "github.com/oscusm/PingMyNest/internal/auth"
	db "github.com/oscusm/PingMyNest/internal/db"
)

// Session policy
//
//   - pmn_access:  15-minute JWT (user id, email, token_version). httpOnly, so
//     page JavaScript (and any XSS) can't read it.
//   - pmn_refresh: random 30-day token, httpOnly; only its SHA-256 is stored.
//     Every /refresh revokes it and issues a new one (rotation), so staying
//     active keeps you signed in indefinitely.
//   - Reuse detection: presenting an already-rotated refresh token means it
//     was copied. That signs the user out everywhere.
//   - Logout bumps users.token_version and revokes every refresh token, so
//     all devices are signed out, including access tokens still in flight.
const (
	accessCookie  = "pmn_access"
	refreshCookie = "pmn_refresh"
	// hintCookie is readable by JavaScript and holds no secret; it only tells
	// the frontend a refresh is worth attempting, so anonymous visitors don't
	// spend rate-limit budget on /refresh calls that can't succeed.
	hintCookie = "pmn_signed_in"

	// Two tabs refreshing at the same moment both present the same token;
	// the loser shouldn't be treated as theft.
	refreshReuseGrace = 30 * time.Second
)

type sessionConfig struct {
	secret string
	// Secure cookies require HTTPS; off only for local development.
	secure bool
}

func (c sessionConfig) setCookie(w http.ResponseWriter, name, value string, maxAge time.Duration) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   int(maxAge.Seconds()),
		HttpOnly: name != hintCookie,
		Secure:   c.secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (c sessionConfig) clearCookies(w http.ResponseWriter) {
	for _, name := range []string{accessCookie, refreshCookie, hintCookie} {
		http.SetCookie(w, &http.Cookie{
			Name: name, Value: "", Path: "/", MaxAge: -1,
			HttpOnly: name != hintCookie, Secure: c.secure, SameSite: http.SameSiteLaxMode,
		})
	}
}

// issueSession creates a refresh token row and sets both cookies.
func (c sessionConfig) issueSession(ctx context.Context, w http.ResponseWriter, r *http.Request, queries *db.Queries, user db.User) error {
	access, err := authpkg.GenerateToken(c.secret, user.ID, user.Email, user.TokenVersion)
	if err != nil {
		return err
	}
	refresh, hash, err := authpkg.NewRefreshToken()
	if err != nil {
		return err
	}
	if err := queries.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: hash,
		ExpiresAt: toTimestamptz(time.Now().Add(authpkg.RefreshTokenTTL)),
		UserAgent: pgtype.Text{String: r.UserAgent(), Valid: r.UserAgent() != ""},
	}); err != nil {
		return err
	}
	c.setCookie(w, accessCookie, access, authpkg.AccessTokenTTL)
	c.setCookie(w, refreshCookie, refresh, authpkg.RefreshTokenTTL)
	c.setCookie(w, hintCookie, "1", authpkg.RefreshTokenTTL)
	return nil
}

// signOutEverywhere invalidates every access and refresh token for a user.
func signOutEverywhere(ctx context.Context, queries *db.Queries, userID int32) error {
	if _, err := queries.BumpTokenVersion(ctx, userID); err != nil {
		return err
	}
	return queries.RevokeAllRefreshTokensForUser(ctx, userID)
}

func refreshHandler(queries *db.Queries, cfg sessionConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		ctx := r.Context()

		cookie, err := r.Cookie(refreshCookie)
		if err != nil || cookie.Value == "" {
			writeError(w, http.StatusUnauthorized, "not signed in")
			return
		}

		record, err := queries.GetRefreshToken(ctx, authpkg.HashRefreshToken(cookie.Value))
		if err != nil {
			cfg.clearCookies(w)
			writeError(w, http.StatusUnauthorized, "session expired")
			return
		}

		if record.RevokedAt.Valid {
			if time.Since(record.RevokedAt.Time) > refreshReuseGrace {
				log.Printf("refresh token reuse for user %d; signing out everywhere", record.UserID)
				if err := signOutEverywhere(ctx, queries, record.UserID); err != nil {
					log.Println("sign out everywhere:", err)
				}
				cfg.clearCookies(w)
			}
			// inside the grace window another tab already rotated; its new
			// cookies are in the jar, so the client just retries
			writeError(w, http.StatusUnauthorized, "session expired")
			return
		}

		if time.Now().After(record.ExpiresAt.Time) {
			cfg.clearCookies(w)
			writeError(w, http.StatusUnauthorized, "session expired")
			return
		}

		// revoke-then-issue; if a concurrent request already revoked it, lose the race quietly
		n, err := queries.RevokeRefreshToken(ctx, record.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error refreshing session")
			return
		}
		if n == 0 {
			writeError(w, http.StatusUnauthorized, "session expired")
			return
		}

		user, err := queries.GetUserByID(ctx, record.UserID)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "session expired")
			return
		}
		if err := cfg.issueSession(ctx, w, r, queries, user); err != nil {
			writeError(w, http.StatusInternalServerError, "error refreshing session")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"id": user.ID, "email": user.Email, "verified": user.Verified.Bool})
	}
}

// logoutHandler signs the user out on every device. It identifies the user
// from the refresh cookie, or the access cookie if that's all there is.
func logoutHandler(queries *db.Queries, cfg sessionConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		ctx := r.Context()

		var userID int32
		if c, err := r.Cookie(refreshCookie); err == nil && c.Value != "" {
			if record, err := queries.GetRefreshToken(ctx, authpkg.HashRefreshToken(c.Value)); err == nil {
				userID = record.UserID
			}
		}
		if userID == 0 {
			if c, err := r.Cookie(accessCookie); err == nil {
				if claims, err := authpkg.ParseToken(cfg.secret, c.Value); err == nil {
					userID = claims.UserID
				}
			}
		}
		if userID != 0 {
			if err := signOutEverywhere(ctx, queries, userID); err != nil && !errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusInternalServerError, "error signing out")
				return
			}
		}

		cfg.clearCookies(w)
		writeJSON(w, http.StatusOK, map[string]string{"message": "signed out on all devices"})
	}
}

// authMiddleware accepts only the httpOnly access cookie, and rejects tokens
// whose version is older than the user's current token_version.
func authMiddleware(cfg sessionConfig, queries *db.Queries, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(accessCookie)
		if err != nil || cookie.Value == "" {
			writeError(w, http.StatusUnauthorized, "not signed in")
			return
		}

		claims, err := authpkg.ParseToken(cfg.secret, cookie.Value)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "session expired")
			return
		}

		user, err := queries.GetUserByID(r.Context(), claims.UserID)
		if err != nil || user.TokenVersion != claims.Version {
			writeError(w, http.StatusUnauthorized, "session expired")
			return
		}

		ctx := context.WithValue(r.Context(), userEmailKey, user.Email)
		ctx = context.WithValue(ctx, userIDKey, user.ID)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// csrfMiddleware requires a custom header on state-changing requests. Browsers
// won't let another site add one without a CORS preflight (which this API
// never approves), so a forged cross-site form or fetch can't ride the
// session cookies.
func csrfMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
		default:
			if r.Header.Get("X-Requested-With") != "PingMyNest" {
				writeError(w, http.StatusForbidden, "missing X-Requested-With header")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

// cleanupRefreshTokens prunes long-expired rows once a day.
func cleanupRefreshTokens(queries *db.Queries) {
	for {
		if err := queries.DeleteExpiredRefreshTokens(context.Background()); err != nil {
			log.Println("refresh token cleanup:", err)
		}
		time.Sleep(24 * time.Hour)
	}
}
