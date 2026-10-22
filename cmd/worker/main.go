package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/oscusm/PingMyNest/internal/db"
	"github.com/oscusm/PingMyNest/internal/notify"
	"github.com/oscusm/PingMyNest/internal/usm"
)

const userAgent = "PingMyNest/0.1 (student project, contact: rajeev.shrestha@usm.edu)"

func main() {
	cfg := loadConfig()
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("unable to connect to database:", err)
	}
	defer pool.Close()
	queries := db.New(pool)

	if cfg.ResendAPIKey == "" {
		if !cfg.Development {
			log.Fatal("missing required env var: RESEND_API_KEY")
		}
		log.Println("RESEND_API_KEY not set: seat alerts will be logged as send failures")
	}
	if !cfg.Development {
		cfg.FrontendURL = productionFrontendURL()
	}
	sender := notify.NewEmailSender(cfg.ResendAPIKey, cfg.FromEmail, cfg.AlertsFrom, cfg.FrontendURL)

	// no cache: the poller must see live seat counts
	var client *usm.Client
	if cfg.Development {
		client = usm.NewClient("http://localhost:"+cfg.Port+"/mock-class-search", "", userAgent, 0, 0)
		log.Println("DEVELOPMENT: polling the replica mock on :" + cfg.Port)
	} else {
		client = usm.NewClient(usm.RealSearchURL, usm.RealWarmUpURL, userAgent, cfg.RequestGap, 0)
		log.Printf("polling real USM: term %s, every %s, at most one request per %s", cfg.Term, cfg.PollInterval, cfg.RequestGap)
	}

	go pruneActivity(ctx, queries)

	// Start a cycle every PollInterval. A cycle that runs long (many watched
	// subjects x RequestGap) is followed immediately by the next one.
	for {
		start := time.Now()
		runCycle(ctx, client, cfg, queries, sender)
		elapsed := time.Since(start)
		if elapsed > cfg.PollInterval {
			log.Printf("cycle took %s, longer than POLL_INTERVAL %s; starting the next one now", elapsed.Round(time.Second), cfg.PollInterval)
			continue
		}
		time.Sleep(cfg.PollInterval - elapsed)
	}
}

// productionFrontendURL refuses to start production with a FRONTEND_URL that
// would put http:// or localhost links in emails (spam filters, broken links).
func productionFrontendURL() string {
	u := os.Getenv("FRONTEND_URL")
	if !strings.HasPrefix(u, "https://") || strings.Contains(u, "localhost") || strings.Contains(u, "127.0.0.1") {
		log.Fatalf("FRONTEND_URL=%q: production needs the public https address, e.g. https://pingmynest.lol", u)
	}
	return strings.TrimRight(u, "/")
}

// pruneActivity drops old poll cycles and traffic rows once a day; seat events
// are kept, they are the project's history.
func pruneActivity(ctx context.Context, queries *db.Queries) {
	for {
		if err := queries.PruneActivity(ctx); err != nil {
			log.Println("activity cleanup:", err)
		}
		time.Sleep(24 * time.Hour)
	}
}
