package main

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/oscusm/PingMyNest/internal/db"
	"github.com/oscusm/PingMyNest/internal/notify"
)

// notifyWatchers emails everyone watching the section and returns how many
// were watching and how many emails went out.
func notifyWatchers(ctx context.Context, queries *db.Queries, sender *notify.EmailSender, classNbr int32, subject, catalogNbr, section, descr string, avail int) (watching, notified int) {
	watchers, err := queries.GetActiveWatchersForSection(
		ctx,
		pgtype.Int4{Int32: classNbr, Valid: true},
	)
	if err != nil {
		log.Println("error getting watchers:", err)
		return 0, 0
	}

	for _, watcher := range watchers {
		if err := sender.SendSeatOpenedEmail(watcher.Email, subject, catalogNbr, section, descr, avail); err != nil {
			log.Printf("error sending email to %s: %v\n", watcher.Email, err)
			continue // don't deactivate if the send failed, they should still get notified next time
		}
		log.Println("notified:", watcher.Email)
		notified++

		err := queries.DeactivateWatch(ctx, db.DeactivateWatchParams{
			UserID: pgtype.Int4{
				Int32: watcher.ID,
				Valid: true,
			},
			ClassNbr: pgtype.Int4{
				Int32: classNbr,
				Valid: true,
			},
		})
		if err != nil {
			log.Printf("error deactivating watch for user %d: %v\n", watcher.ID, err)
		}
	}
	return len(watchers), notified
}
