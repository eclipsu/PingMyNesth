package main

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strconv"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/oscusm/PingMyNest/internal/db"
	"github.com/oscusm/PingMyNest/internal/notify"
	"github.com/oscusm/PingMyNest/internal/usm"
)

func runCycle(ctx context.Context, client *usm.Client, cfg config, queries *db.Queries, sender *notify.EmailSender) {
	subjects, err := queries.GetDistinctWatchedSubjects(ctx)
	if err != nil {
		log.Println("error getting watched subjects:", err)
		return
	}
	if len(subjects) == 0 {
		return // nothing to watch; don't touch USM at all
	}

	checked := 0
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
				break
			}
			classes := make([]usm.ClassSection, 0, len(result.Classes))
			for _, s := range result.Classes {
				classes = append(classes, s.Flatten())
			}
			checkForOpenings(ctx, queries, sender, classes)
			checked += len(classes)
			if page >= result.PageCount {
				break
			}
		}
	}
	fmt.Printf("cycle complete: %d subject(s), %d section(s) checked\n", len(subjects), checked)
}

func checkForOpenings(ctx context.Context, queries *db.Queries, sender *notify.EmailSender, classes []usm.ClassSection) {
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
