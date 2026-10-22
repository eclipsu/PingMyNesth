package main

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/oscusm/PingMyNest/internal/catalog"
	db "github.com/oscusm/PingMyNest/internal/db"
	"github.com/oscusm/PingMyNest/internal/usm"
)

// /pulse is the public, anonymous view of what the system is doing: worker
// cycles, requests to USM, cache hits, and seats that opened. It feeds the
// "Behind the scenes" carousel on the homepage. No emails or user ids.

type pulseCycle struct {
	StartedAt       time.Time `json:"started_at"`
	DurationMs      int32     `json:"duration_ms"`
	Subjects        int32     `json:"subjects"`
	SectionsChecked int32     `json:"sections_checked"`
	USMRequests     int32     `json:"usm_requests"`
	Openings        int32     `json:"openings"`
	Errors          int32     `json:"errors"`
}

type pulseOpening struct {
	Subject      string    `json:"subject"`
	CatalogNbr   string    `json:"catalog_nbr"`
	ClassSection string    `json:"class_section"`
	Descr        string    `json:"descr"`
	Seats        int32     `json:"seats"`
	Watchers     int32     `json:"watchers"`
	Notified     int32     `json:"notified"`
	At           time.Time `json:"at"`
}

type pulseHour struct {
	Hour      time.Time `json:"hour"`
	Worker    int32     `json:"worker"`
	Search    int32     `json:"search"`
	CacheHits int32     `json:"cache_hits"`
}

type pulseTotals struct {
	Cycles          int32 `json:"cycles"`
	SectionsChecked int64 `json:"sections_checked"`
	WorkerRequests  int64 `json:"worker_requests"`
	SearchRequests  int64 `json:"search_requests"`
	CacheHits       int64 `json:"cache_hits"`
	Openings        int32 `json:"openings"`
	Alerts          int64 `json:"alerts"`
}

type pulseResponse struct {
	GeneratedAt time.Time `json:"generated_at"`
	Worker      struct {
		// live: cycled recently; stalled: no cycle for a while; offline: never ran
		Status         string      `json:"status"`
		LastCycle      *pulseCycle `json:"last_cycle"`
		PollIntervalS  float64     `json:"poll_interval_s"`
		RequestGapS    float64     `json:"request_gap_s"`
		SearchCacheTTL float64     `json:"search_cache_ttl_s"`
	} `json:"worker"`
	Catalog struct {
		Subjects    int `json:"subjects"`
		Courses     int `json:"courses"`
		Instructors int `json:"instructors"`
	} `json:"catalog"`
	Watching struct {
		Active   int32 `json:"active"`
		Sections int32 `json:"sections"`
		Subjects int32 `json:"subjects"`
	} `json:"watching"`
	Last24h        pulseTotals    `json:"last_24h"`
	AllTime        pulseTotals    `json:"all_time"`
	Traffic        []pulseHour    `json:"traffic"` // the last 24 hours, oldest first
	RecentCycles   []pulseCycle   `json:"recent_cycles"`
	RecentOpenings []pulseOpening `json:"recent_openings"`
}

type pulseConfig struct {
	pollInterval time.Duration
	requestGap   time.Duration
	cacheTTL     time.Duration
}

// loadPulseConfig reads the worker's settings; both services share one .env.
func loadPulseConfig() pulseConfig {
	return pulseConfig{
		pollInterval: durationEnvOr("POLL_INTERVAL", time.Minute),
		requestGap:   durationEnvOr("USM_REQUEST_GAP", 5*time.Second),
		cacheTTL:     time.Minute,
	}
}

func durationEnvOr(key string, fallback time.Duration) time.Duration {
	if d, err := time.ParseDuration(getEnvOrDefault(key, "")); err == nil && d > 0 {
		return d
	}
	return fallback
}

func ts(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }

func buildPulse(ctx context.Context, queries *db.Queries, courses *catalog.Catalog, cfg pulseConfig, cycleLimit int32) (*pulseResponse, error) {
	now := time.Now()
	day := now.Add(-24 * time.Hour)
	var p pulseResponse
	p.GeneratedAt = now
	p.Worker.PollIntervalS = cfg.pollInterval.Seconds()
	p.Worker.RequestGapS = cfg.requestGap.Seconds()
	p.Worker.SearchCacheTTL = cfg.cacheTTL.Seconds()
	p.Catalog.Subjects, p.Catalog.Courses, p.Catalog.Instructors = courses.Counts()

	watches, err := queries.WatchTotals(ctx)
	if err != nil {
		return nil, err
	}
	p.Watching.Active, p.Watching.Sections, p.Watching.Subjects = watches.Active, watches.Sections, watches.Subjects

	cycles, err := queries.RecentPollCycles(ctx, cycleLimit)
	if err != nil {
		return nil, err
	}
	p.RecentCycles = make([]pulseCycle, len(cycles))
	for i, c := range cycles { // newest first from the query; flip to oldest first
		p.RecentCycles[len(cycles)-1-i] = pulseCycle{
			StartedAt: c.StartedAt.Time, DurationMs: c.DurationMs, Subjects: c.Subjects,
			SectionsChecked: c.SectionsChecked, USMRequests: c.UsmRequests, Openings: c.Openings, Errors: c.Errors,
		}
	}
	p.Worker.Status = "offline"
	if len(cycles) > 0 {
		last := p.RecentCycles[len(p.RecentCycles)-1]
		p.Worker.LastCycle = &last
		// a cycle that ran long delays the next one, so allow for it
		finished := last.StartedAt.Add(time.Duration(last.DurationMs) * time.Millisecond)
		if now.Sub(finished) < 3*cfg.pollInterval+time.Minute {
			p.Worker.Status = "live"
		} else {
			p.Worker.Status = "stalled"
		}
	}

	for _, span := range []struct {
		since time.Time
		into  *pulseTotals
	}{{day, &p.Last24h}, {time.Time{}, &p.AllTime}} {
		c, err := queries.PollCycleTotalsSince(ctx, ts(span.since))
		if err != nil {
			return nil, err
		}
		span.into.Cycles, span.into.SectionsChecked = c.Cycles, c.SectionsChecked
		s, err := queries.SeatEventTotalsSince(ctx, ts(span.since))
		if err != nil {
			return nil, err
		}
		span.into.Openings, span.into.Alerts = s.Openings, s.Alerts
		traffic, err := queries.USMTrafficSince(ctx, ts(span.since))
		if err != nil {
			return nil, err
		}
		for _, t := range traffic {
			if t.Source == "worker" {
				span.into.WorkerRequests += int64(t.Requests)
			} else {
				span.into.SearchRequests += int64(t.Requests)
			}
			span.into.CacheHits += int64(t.CacheHits)
		}
	}

	// hourly buckets for the last 24 hours, zero-filled
	first := now.Truncate(time.Hour).Add(-23 * time.Hour)
	p.Traffic = make([]pulseHour, 24)
	for i := range p.Traffic {
		p.Traffic[i].Hour = first.Add(time.Duration(i) * time.Hour)
	}
	traffic, err := queries.USMTrafficSince(ctx, ts(first))
	if err != nil {
		return nil, err
	}
	for _, t := range traffic {
		i := int(t.Hour.Time.Sub(first) / time.Hour)
		if i < 0 || i >= len(p.Traffic) {
			continue
		}
		if t.Source == "worker" {
			p.Traffic[i].Worker += t.Requests
		} else {
			p.Traffic[i].Search += t.Requests
		}
		p.Traffic[i].CacheHits += t.CacheHits
	}

	events, err := queries.RecentSeatEvents(ctx, 8)
	if err != nil {
		return nil, err
	}
	p.RecentOpenings = make([]pulseOpening, 0, len(events))
	for _, e := range events {
		p.RecentOpenings = append(p.RecentOpenings, pulseOpening{
			Subject: e.Subject, CatalogNbr: e.CatalogNbr, ClassSection: e.ClassSection, Descr: e.Descr,
			Seats: e.Seats, Watchers: e.Watchers, Notified: e.Notified, At: e.CreatedAt.Time,
		})
	}
	return &p, nil
}

// pulseHandler serves buildPulse, cached briefly: the homepage polls it, and
// every visitor would otherwise cost a handful of queries.
func pulseHandler(queries *db.Queries, courses *catalog.Catalog, cfg pulseConfig) http.HandlerFunc {
	const ttl = 5 * time.Second
	var (
		mu      sync.Mutex
		cached  *pulseResponse
		expires time.Time
	)
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		mu.Lock()
		defer mu.Unlock()
		if cached == nil || time.Now().After(expires) {
			p, err := buildPulse(r.Context(), queries, courses, cfg, 30)
			if err != nil {
				log.Println("pulse:", err)
				writeError(w, http.StatusInternalServerError, "error loading activity")
				return
			}
			cached, expires = p, time.Now().Add(ttl)
		}
		w.Header().Set("Cache-Control", "no-store")
		writeJSON(w, http.StatusOK, cached)
	}
}

// recordSearchTraffic flushes the search client's request and cache-hit
// counts to usm_traffic every 30 seconds.
func recordSearchTraffic(queries *db.Queries, client *usm.Client) {
	for range time.Tick(30 * time.Second) {
		requests, hits := client.TakeCounts()
		if requests == 0 && hits == 0 {
			continue
		}
		err := queries.AddUSMTraffic(context.Background(), db.AddUSMTrafficParams{
			Source: "search", Requests: int32(requests), CacheHits: int32(hits),
		})
		if err != nil {
			log.Println("recording search traffic:", err)
		}
	}
}
