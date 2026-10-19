package main

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/oscusm/PingMyNest/internal/db"
)

type watchRequest struct {
	ClassNbr int32 `json:"class_nbr"`
}

func watchHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req watchRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		email := emailFromContext(r) // set by authMiddleware, not client-supplied
		if email == "" {
			writeError(w, http.StatusUnauthorized, "not authenticated")
			return
		}
		if req.ClassNbr == 0 {
			writeError(w, http.StatusBadRequest, "class_nbr is required")
			return
		}

		ctx := r.Context()

		_, err := queries.GetSectionByClassNbr(ctx, req.ClassNbr)
		if err != nil {
			writeError(w, http.StatusNotFound, "class not found - search for it first")
			return
		}

		user, err := queries.GetUserByEmail(ctx, email)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "user not found")
			return
		}

		_, err = queries.CreateWatch(ctx, db.CreateWatchParams{
			UserID:   pgtype.Int4{Int32: user.ID, Valid: true},
			ClassNbr: pgtype.Int4{Int32: req.ClassNbr, Valid: true},
		})
		if err != nil {
			writeError(w, http.StatusConflict, "error creating watch (may already exist)")
			return
		}

		writeJSON(w, http.StatusCreated, map[string]string{"message": "watch created"})
	}
}
