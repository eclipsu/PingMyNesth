package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	db "github.com/oscusm/PingMyNest/internal/db"
	"github.com/oscusm/PingMyNest/internal/notify"
)

type signupRequest struct {
	Email string `json:"email"`
}

func signupHandler(queries *db.Queries, sender *notify.EmailSender, guard *signupGuard) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req signupRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		email := strings.TrimSpace(strings.ToLower(req.Email))
		if !isAllowedEmail(email) {
			http.Error(w, "use your @usm.edu or @gmail.com email", http.StatusBadRequest)
			return
		}

		if ok, status, msg, wait := guard.allow(getClientIP(r), email); !ok {
			writeRetry(w, status, msg, wait)
			return
		}

		ctx := r.Context()

		user, err := queries.GetUserByEmail(ctx, email)
		if err != nil {
			user, err = queries.CreateUser(ctx, email)
			if err != nil {
				http.Error(w, "error creating user", http.StatusInternalServerError)
				return
			}
		}

		token, err := generateToken()
		if err != nil {
			http.Error(w, "error generating token", http.StatusInternalServerError)
			return
		}

		if err := queries.CreateVerificationToken(ctx, db.CreateVerificationTokenParams{
			Token:     token,
			UserID:    toNullInt4(user.ID),
			ExpiresAt: toTimestamptz(time.Now().Add(1 * time.Hour)),
		}); err != nil {
			http.Error(w, "error creating verification token", http.StatusInternalServerError)
			return
		}

		link := verificationLink(token)
		if err := sender.SendVerificationEmail(email, link); err != nil {
			log.Printf("signup %s: sending verification email: %v", email, err)
			// Local dev only: a missing key or flaky provider shouldn't block the
			// developer. The link goes to the server log, never to the page.
			if os.Getenv("DEVELOPMENT") == "true" {
				log.Printf("DEV sign-in link for %s (email not sent): %s", email, link)
				writeJSON(w, http.StatusOK, map[string]string{"message": "check your email to verify"})
				return
			}
			http.Error(w, "error sending verification email", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message":"check your email to verify"}`))
	}
}

func verificationLink(token string) string {
	frontendURL := strings.TrimRight(getEnvOrDefault("FRONTEND_URL", "http://localhost:3000"), "/")
	return frontendURL + "/verify?token=" + token
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// Sign-in is open to these domains. Gmail is allowed for now (it delivers far
// faster than USM's Outlook); remove it here and in frontend/app/signup to go
// back to USM-only.
var allowedEmailDomains = []string{"usm.edu", "gmail.com"}

// localPart is the part before the "@": letters, digits, dots, dashes,
// underscores, plus (gmail+tag). Exactly one "@" and an exact domain match,
// so "x@evilusm.edu" and "x@usm.edu.evil.com" are rejected.
var localPart = regexp.MustCompile(`^[a-z0-9._+-]+$`)

func isAllowedEmail(email string) bool {
	for _, domain := range allowedEmailDomains {
		if local, ok := strings.CutSuffix(email, "@"+domain); ok {
			return local != "" && localPart.MatchString(local)
		}
	}
	return false
}
