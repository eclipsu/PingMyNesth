package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/time/rate"

	db "github.com/oscusm/PingMyNest/internal/db"
	"github.com/oscusm/PingMyNest/internal/notify"
)

func runCycle(ctx context.Context, client *http.Client, cfg config, limiter *rate.Limiter, queries *db.Queries, sender *notify.EmailSender) {
	if err := warmUpSession(ctx, client, cfg, limiter); err != nil {
		log.Println("error warming up session:", err)
		return
	}

	subjects, err := queries.GetDistinctWatchedSubjects(ctx)
	if err != nil {
		log.Println("error getting watched subjects:", err)
		return
	}
	if len(subjects) == 0 {
		fmt.Println("no active watches, skipping cycle")
		return
	}

	for _, subj := range subjects {
		// big subjects span several pages; walk all of them so sections
		// past page 1 still get checked
		for page := 1; ; page++ {
			result, err := fetchClassSearch(ctx, client, cfg, limiter, subj, cfg.Term, page)
			if err != nil {
				log.Println("error polling", subj, "page", page, ":", err)
				break
			}
			checkForOpenings(ctx, queries, sender, result.Classes)
			if page >= result.PageCount {
				break
			}
		}
	}
	fmt.Println("--- cycle complete ---")
}

func checkForOpenings(ctx context.Context, queries *db.Queries, sender *notify.EmailSender, classes []ClassSection) {
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
			notifyWatchers(ctx, queries, sender, int32(c.ClassNbr), c.Subject, c.CatalogNbr, c.ClassSection, c.Descr, c.EnrollmentAvail)
		}
	}
}
