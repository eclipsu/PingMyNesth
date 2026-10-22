package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/oscusm/PingMyNest/internal/catalog"
	db "github.com/oscusm/PingMyNest/internal/db"
	"github.com/oscusm/PingMyNest/internal/notify"
)

type adminSet map[string]bool

// loadAdmins reads ADMIN_EMAILS (comma-separated). Unset means nobody can
// open /admin.
func loadAdmins() adminSet {
	set := adminSet{}
	for _, e := range strings.Split(os.Getenv("ADMIN_EMAILS"), ",") {
		if e = strings.ToLower(strings.TrimSpace(e)); e != "" {
			set[e] = true
		}
	}
	return set
}

func (a adminSet) has(email string) bool { return a[strings.ToLower(email)] }

// adminMiddleware is authMiddleware plus a check against the admin list.
func adminMiddleware(cfg sessionConfig, queries *db.Queries, admins adminSet, next http.HandlerFunc) http.HandlerFunc {
	return authMiddleware(cfg, queries, func(w http.ResponseWriter, r *http.Request) {
		if !admins.has(emailFromContext(r)) {
			writeError(w, http.StatusForbidden, "admins only")
			return
		}
		next(w, r)
	})
}

func registerAdminRoutes(mux *http.ServeMux, wrap func(http.HandlerFunc) http.HandlerFunc, queries *db.Queries, courses *catalog.Catalog, pcfg pulseConfig, sender *notify.EmailSender) {
	mux.HandleFunc("GET /admin/overview", wrap(adminOverviewHandler(queries, courses, pcfg)))
	mux.HandleFunc("GET /admin/users", wrap(adminUsersHandler(queries)))
	mux.HandleFunc("GET /admin/users/{id}", wrap(adminUserHandler(queries)))
	mux.HandleFunc("POST /admin/users/{id}/signout", wrap(adminSignOutUserHandler(queries)))
	mux.HandleFunc("DELETE /admin/users/{id}", wrap(adminDeleteUserHandler(queries)))
	mux.HandleFunc("GET /admin/watches", wrap(adminWatchesHandler(queries)))
	mux.HandleFunc("PATCH /admin/watches/{id}", wrap(adminSetWatchHandler(queries)))
	mux.HandleFunc("DELETE /admin/watches/{id}", wrap(adminDeleteWatchHandler(queries)))
	mux.HandleFunc("GET /admin/events", wrap(adminEventsHandler(queries)))
	mux.HandleFunc("GET /admin/cycles", wrap(adminCyclesHandler(queries)))
	mux.HandleFunc("POST /admin/test-alert", wrap(adminTestAlertHandler(sender)))
}

func pathID(w http.ResponseWriter, r *http.Request) (int32, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 32)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "invalid id")
		return 0, false
	}
	return int32(id), true
}

func limitParam(r *http.Request, fallback, max int32) int32 {
	n, err := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 32)
	if err != nil || n <= 0 {
		return fallback
	}
	return min(int32(n), max)
}

func timePtr(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

type adminSection struct {
	ClassNbr     int32  `json:"class_nbr"`
	Subject      string `json:"subject"`
	CatalogNbr   string `json:"catalog_nbr"`
	ClassSection string `json:"class_section"`
	Descr        string `json:"descr"`
	Seats        int32  `json:"seats"`
	Watchers     int32  `json:"watchers"`
}

func adminOverviewHandler(queries *db.Queries, courses *catalog.Catalog, pcfg pulseConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		pulse, err := buildPulse(ctx, queries, courses, pcfg, 60)
		if err != nil {
			log.Println("admin overview:", err)
			writeError(w, http.StatusInternalServerError, "error loading overview")
			return
		}
		users, err := queries.UserTotals(ctx)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error loading users")
			return
		}
		watches, err := queries.WatchTotals(ctx)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error loading watches")
			return
		}
		top, err := queries.MostWatchedSections(ctx, 8)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error loading sections")
			return
		}
		topSections := make([]adminSection, 0, len(top))
		for _, s := range top {
			topSections = append(topSections, adminSection{
				ClassNbr: s.ClassNbr, Subject: s.Subject, CatalogNbr: s.CatalogNbr, ClassSection: s.ClassSection,
				Descr: s.Descr.String, Seats: s.LastEnrollmentAvail.Int32, Watchers: s.Watchers,
			})
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"pulse": pulse,
			"users": map[string]int32{"total": users.Total, "verified": users.Verified, "new_this_week": users.NewThisWeek},
			"watches": map[string]int32{
				"active": watches.Active, "notified": watches.Notified, "sections": watches.Sections,
				"subjects": watches.Subjects, "watchers": watches.Watchers,
			},
			"top_sections": topSections,
		})
	}
}

type adminUser struct {
	ID            int32      `json:"id"`
	Email         string     `json:"email"`
	Verified      bool       `json:"verified"`
	CreatedAt     *time.Time `json:"created_at"`
	ActiveWatches int32      `json:"active_watches"`
	TotalWatches  int32      `json:"total_watches"`
	Sessions      int32      `json:"sessions"`
}

func adminUsersHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := queries.AdminListUsers(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error loading users")
			return
		}
		users := make([]adminUser, 0, len(rows))
		for _, u := range rows {
			users = append(users, adminUser{
				ID: u.ID, Email: u.Email, Verified: u.Verified.Bool, CreatedAt: timePtr(u.CreatedAt),
				ActiveWatches: u.ActiveWatches, TotalWatches: u.TotalWatches, Sessions: u.Sessions,
			})
		}
		writeJSON(w, http.StatusOK, users)
	}
}

type adminWatch struct {
	ID           int32      `json:"id"`
	ClassNbr     int32      `json:"class_nbr"`
	Active       bool       `json:"active"`
	CreatedAt    *time.Time `json:"created_at"`
	UserID       int32      `json:"user_id,omitempty"`
	Email        string     `json:"email,omitempty"`
	Subject      string     `json:"subject"`
	CatalogNbr   string     `json:"catalog_nbr"`
	ClassSection string     `json:"class_section"`
	Descr        string     `json:"descr"`
	Seats        int32      `json:"seats"`
	CheckedAt    *time.Time `json:"checked_at,omitempty"`
}

func adminUserHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		ctx := r.Context()
		user, err := queries.GetUserByID(ctx, id)
		if err != nil {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		watchRows, err := queries.AdminUserWatches(ctx, pgtype.Int4{Int32: id, Valid: true})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error loading watches")
			return
		}
		sessionRows, err := queries.AdminUserSessions(ctx, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error loading sessions")
			return
		}
		watches := make([]adminWatch, 0, len(watchRows))
		for _, wr := range watchRows {
			watches = append(watches, adminWatch{
				ID: wr.ID, ClassNbr: wr.ClassNbr.Int32, Active: wr.Active.Bool, CreatedAt: timePtr(wr.CreatedAt),
				Subject: wr.Subject, CatalogNbr: wr.CatalogNbr, ClassSection: wr.ClassSection,
				Descr: wr.Descr.String, Seats: wr.LastEnrollmentAvail.Int32,
			})
		}
		type session struct {
			ID        int32      `json:"id"`
			UserAgent string     `json:"user_agent"`
			CreatedAt *time.Time `json:"created_at"`
			ExpiresAt *time.Time `json:"expires_at"`
		}
		sessions := make([]session, 0, len(sessionRows))
		for _, s := range sessionRows {
			sessions = append(sessions, session{ID: s.ID, UserAgent: s.UserAgent.String, CreatedAt: timePtr(s.CreatedAt), ExpiresAt: timePtr(s.ExpiresAt)})
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"user": adminUser{
				ID: user.ID, Email: user.Email, Verified: user.Verified.Bool, CreatedAt: timePtr(user.CreatedAt),
				TotalWatches: int32(len(watches)), Sessions: int32(len(sessions)),
			},
			"watches":  watches,
			"sessions": sessions,
		})
	}
}

func adminSignOutUserHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		if err := signOutEverywhere(r.Context(), queries, id); err != nil {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		log.Printf("admin %s signed out user %d everywhere", emailFromContext(r), id)
		writeJSON(w, http.StatusOK, map[string]string{"message": "signed out on all devices"})
	}
}

func adminDeleteUserHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		if self, _ := r.Context().Value(userIDKey).(int32); self == id {
			writeError(w, http.StatusBadRequest, "you can't delete your own account here")
			return
		}
		n, err := queries.DeleteUser(r.Context(), id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error deleting user")
			return
		}
		if n == 0 {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		log.Printf("admin %s deleted user %d", emailFromContext(r), id)
		writeJSON(w, http.StatusOK, map[string]string{"message": "user deleted"})
	}
}

func adminWatchesHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := queries.AdminListWatches(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error loading watches")
			return
		}
		watches := make([]adminWatch, 0, len(rows))
		for _, wr := range rows {
			watches = append(watches, adminWatch{
				ID: wr.ID, ClassNbr: wr.ClassNbr.Int32, Active: wr.Active.Bool, CreatedAt: timePtr(wr.CreatedAt),
				UserID: wr.UserID, Email: wr.Email, Subject: wr.Subject, CatalogNbr: wr.CatalogNbr,
				ClassSection: wr.ClassSection, Descr: wr.Descr.String, Seats: wr.LastEnrollmentAvail.Int32,
				CheckedAt: timePtr(wr.UpdatedAt),
			})
		}
		writeJSON(w, http.StatusOK, watches)
	}
}

func adminSetWatchHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var body struct {
			Active *bool `json:"active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Active == nil {
			writeError(w, http.StatusBadRequest, `body must be {"active": true|false}`)
			return
		}
		n, err := queries.SetWatchActive(r.Context(), db.SetWatchActiveParams{ID: id, Active: pgtype.Bool{Bool: *body.Active, Valid: true}})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error updating watch")
			return
		}
		if n == 0 {
			writeError(w, http.StatusNotFound, "watch not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "watch updated"})
	}
}

func adminDeleteWatchHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		n, err := queries.DeleteWatchByID(r.Context(), id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error deleting watch")
			return
		}
		if n == 0 {
			writeError(w, http.StatusNotFound, "watch not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "watch deleted"})
	}
}

func adminEventsHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := queries.RecentSeatEvents(r.Context(), limitParam(r, 100, 500))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error loading seat events")
			return
		}
		type event struct {
			pulseOpening
			ID       int64 `json:"id"`
			ClassNbr int32 `json:"class_nbr"`
		}
		events := make([]event, 0, len(rows))
		for _, e := range rows {
			events = append(events, event{
				ID: e.ID, ClassNbr: e.ClassNbr,
				pulseOpening: pulseOpening{
					Subject: e.Subject, CatalogNbr: e.CatalogNbr, ClassSection: e.ClassSection, Descr: e.Descr,
					Seats: e.Seats, Watchers: e.Watchers, Notified: e.Notified, At: e.CreatedAt.Time,
				},
			})
		}
		writeJSON(w, http.StatusOK, events)
	}
}

func adminCyclesHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := queries.RecentPollCycles(r.Context(), limitParam(r, 100, 1000))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error loading poll cycles")
			return
		}
		cycles := make([]pulseCycle, 0, len(rows))
		for _, c := range rows {
			cycles = append(cycles, pulseCycle{
				StartedAt: c.StartedAt.Time, DurationMs: c.DurationMs, Subjects: c.Subjects,
				SectionsChecked: c.SectionsChecked, USMRequests: c.UsmRequests, Openings: c.Openings, Errors: c.Errors,
			})
		}
		writeJSON(w, http.StatusOK, cycles)
	}
}

// adminTestAlertHandler sends a sample seat alert to the signed-in admin, to
// check email delivery end to end without waiting for a real seat.
func adminTestAlertHandler(sender *notify.EmailSender) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		to := emailFromContext(r)
		if err := sender.SendSeatOpenedEmail(to, "CSC", "101", "001", "Computer Science I (test alert)", 2); err != nil {
			log.Println("admin test alert:", err)
			writeError(w, http.StatusBadGateway, "email failed: "+err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "test alert sent to " + to})
	}
}
