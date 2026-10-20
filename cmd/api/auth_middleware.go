package main

import (
	"net/http"
)

type contextKey string

const userEmailKey contextKey = "userEmail"
const userIDKey contextKey = "userID"

// authMiddleware lives in session.go alongside the cookie policy it enforces.

func emailFromContext(r *http.Request) string {
	email, _ := r.Context().Value(userEmailKey).(string)
	return email
}
