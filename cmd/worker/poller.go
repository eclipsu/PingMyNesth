package main

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/oscusm/PingMyNest/internal/db"
	"github.com/oscusm/PingMyNest/internal/notify"
	"github.com/oscusm/PingMyNest/internal/usm"
)

// cycleStats is what one poll cycle did; it becomes a poll_cycles row.
type cycleStats struct {
	subjects, sections, openings, errors int
}

func runCycle(ctx context.Context, client *usm.Client, cfg config, queries *db.Queries, sender *notify.EmailSender) {
	start := time.Now()
	stats := pollSubjects(ctx, client, cfg, queries, sender)
	requests, _ := client.TakeCounts()

	err := queries.InsertPollCycle(ctx, db.InsertPollCycleParams{
		StartedAt:       pgtype.Timestamptz{Time: start, Valid: true},
		DurationMs:      int32(time.Since(start).Milliseconds()),
		Subjects:        int32(stats.subjects),
		SectionsChecked: int32(stats.sections),
		UsmRequests:     int32(requests),
		Openings:        int32(stats.openings),
		Errors:          int32(stats.errors),
	})
	if err != nil {
		log.Println("error recording poll cycle:", err)
	}
	if requests > 0 {
		if err := queries.AddUSMTraffic(ctx, db.AddUSMTrafficParams{Source: "worker", Requests: int32(requests)}); err != nil {
			log.Println("error recording USM traffic:", err)
		}
	}
}

func pollSubjects(ctx context.Context, client *usm.Client, cfg config, queries *db.Queries, sender *notify.EmailSender) cycleStats {
	var stats cycleStats
	subjects, err := queries.GetDistinctWatchedSubjects(ctx)
	if err != nil {
		log.Println("error getting watched subjects:", err)
		stats.errors++
		return stats
	}
	if len(subjects) == 0 {
		return stats // nothing to watch; don't touch USM at all
	}
	stats.subjects = len(subjects)

	for _, subj := range subjects {
		// big subjects span several pages; walk all of them so sections
		// past page 1 still get checked
		for page := 1; ; page++ {
			q := url.Values{}
			q.Set("institution", "USM01")
			q.Set("term", cfg.Term)
			q.Set("subject", subj)
			// no campus/career/enrl_stat filters: watches can be on any campus, and
			// enrl_stat=O drops full sections, so a 0 -> open flip would never be seen
			q.Set("session_code", "1")
			q.Set("page", strconv.Itoa(page))

			result, err := client.Search(ctx, q)
			if err != nil {
				log.Println("error polling", subj, "page", page, ":", err)
				stats.errors++
				break
			}
			classes := make([]usm.ClassSection, 0, len(result.Classes))
			for _, s := range result.Classes {
				classes = append(classes, s.Flatten())
			}
			stats.openings += checkForOpenings(ctx, queries, sender, classes)
			stats.sections += len(classes)
			if page >= result.PageCount {
				break
			}
		}
	}
	fmt.Printf("cycle complete: %d subject(s), %d section(s) checked\n", stats.subjects, stats.sections)
	return stats
}

// checkForOpenings stores the latest seat counts and alerts watchers of every
// section that went from full to open. It returns how many sections opened.
func checkForOpenings(ctx context.Context, queries *db.Queries, sender *notify.EmailSender, classes []usm.ClassSection) int {
	opened := 0
	for _, c := range classes {
		prevAvail, lookupErr := queries.GetSectionLastAvail(ctx, int32(c.ClassNbr))
		seen := lookupErr == nil

		err := queries.UpsertSection(ctx, db.UpsertSectionParams{
			ClassNbr:            int32(c.ClassNbr),
			Subject:             c.Subject,
			CatalogNbr:          c.CatalogNbr,
			ClassSection:        c.ClassSection,
			Descr:               pgtype.Text{String: c.Descr, Valid: true},
			Term:                c.Strm,
			LastEnrollmentAvail: pgtype.Int4{Int32: int32(c.EnrollmentAvail), Valid: true},
		})
		if err != nil {
			log.Println("error upserting section:", err)
			continue
		}

		if seen && prevAvail.Valid && prevAvail.Int32 == 0 && c.EnrollmentAvail > 0 {
			log.Printf("SEAT OPENED: %s %s-%s (%s) - now %d available\n",
				c.Subject, c.CatalogNbr, c.ClassSection, c.Descr, c.EnrollmentAvail)
			watchers, notified := notifyWatchers(ctx, queries, sender, int32(c.ClassNbr), c.Subject, c.CatalogNbr, c.ClassSection, c.Descr, c.EnrollmentAvail)
			opened++
			err := queries.InsertSeatEvent(ctx, db.InsertSeatEventParams{
				ClassNbr:     int32(c.ClassNbr),
				Subject:      c.Subject,
				CatalogNbr:   c.CatalogNbr,
				ClassSection: c.ClassSection,
				Descr:        c.Descr,
				Seats:        int32(c.EnrollmentAvail),
				Watchers:     int32(watchers),
				Notified:     int32(notified),
			})
			if err != nil {
				log.Println("error recording seat event:", err)
			}
		}
	}
	return opened
}
