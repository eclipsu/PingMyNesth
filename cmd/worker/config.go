package main

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type config struct {
	DatabaseURL  string
	Development  bool
	Port         string
	ResendAPIKey string
	FromEmail    string
	AlertsFrom   string
	FrontendURL  string
	Term         string
	// PollInterval: how often each watched section is checked.
	PollInterval time.Duration
	// RequestGap: minimum time between requests to USM (politeness cap).
	RequestGap time.Duration
}

func loadConfig() config {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, relying on real environment variables")
	}

	return config{
		DatabaseURL:  mustGetEnv("DATABASE_URL"),
		Development:  os.Getenv("DEVELOPMENT") == "true",
		Port:         getEnvOrDefault("PORT", "8081"),
		ResendAPIKey: os.Getenv("RESEND_API_KEY"), // checked in main
		FromEmail:    os.Getenv("NOTIFY_FROM_EMAIL"),
		AlertsFrom:   os.Getenv("ALERTS_FROM_EMAIL"),
		FrontendURL:  getEnvOrDefault("FRONTEND_URL", "http://localhost:3000"),
		Term:         getEnvOrDefault("TERM_CODE", "4271"),
		PollInterval: durationEnv("POLL_INTERVAL", time.Minute),
		RequestGap:   durationEnv("USM_REQUEST_GAP", 5*time.Second),
	}
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil || d <= 0 {
		log.Fatalf("%s=%q: want a duration like 1m or 5s", key, v)
	}
	return d
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing required env var: %s", key)
	}
	return v
}

func getEnvOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
