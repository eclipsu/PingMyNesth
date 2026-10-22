-- name: CreateUser :one
INSERT INTO users (email) VALUES ($1) RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: VerifyUser :exec
UPDATE users SET verified = true WHERE id = $1;

-- name: CreateWatch :one
INSERT INTO watches (user_id, class_nbr) VALUES ($1, $2)
ON CONFLICT (user_id, class_nbr) DO UPDATE SET active = true
RETURNING *;

-- name: GetActiveWatchersForSection :many
SELECT
    u.id,
    u.email
FROM watches w
JOIN users u ON u.id = w.user_id
WHERE w.class_nbr = $1
  AND w.active = true
  AND u.verified = true;

-- name: UpsertSection :exec
INSERT INTO sections (class_nbr, subject, catalog_nbr, class_section, descr, term, last_enrollment_avail)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (class_nbr) DO UPDATE SET last_enrollment_avail = $7, updated_at = now();

-- name: GetSectionLastAvail :one
SELECT last_enrollment_avail FROM sections WHERE class_nbr = $1;

-- name: GetDistinctWatchedSubjects :many
SELECT DISTINCT s.subject FROM sections s
JOIN watches w ON w.class_nbr = s.class_nbr
WHERE w.active = true;

-- name: DeactivateWatch :exec
UPDATE watches
SET active = false
WHERE user_id = $1
  AND class_nbr = $2;

-- name: CreateVerificationToken :exec
INSERT INTO verification_tokens (token, user_id, expires_at)
VALUES ($1, $2, $3);

-- name: GetVerificationToken :one
SELECT * FROM verification_tokens WHERE token = $1;

-- name: MarkTokenUsed :exec
UPDATE verification_tokens SET used = true WHERE token = $1;

-- name: GetSectionByClassNbr :one
SELECT * FROM sections WHERE class_nbr = $1;

-- name: GetWatchesForEmail :many
SELECT w.id, w.class_nbr, w.active, w.created_at,
       s.subject, s.catalog_nbr, s.class_section, s.descr, s.last_enrollment_avail
FROM watches w
JOIN users u ON u.id = w.user_id
JOIN sections s ON s.class_nbr = w.class_nbr
WHERE u.email = $1
ORDER BY w.created_at DESC;

-- name: DeleteWatchByUserAndClass :exec
DELETE FROM watches
WHERE user_id = (SELECT id FROM users WHERE email = $1)
  AND class_nbr = $2;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;
-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
VALUES ($1, $2, $3, $4);

-- name: GetRefreshToken :one
SELECT * FROM refresh_tokens WHERE token_hash = $1;

-- name: RevokeRefreshToken :execrows
UPDATE refresh_tokens SET revoked_at = now()
WHERE id = $1 AND revoked_at IS NULL;

-- name: RevokeAllRefreshTokensForUser :exec
UPDATE refresh_tokens SET revoked_at = now()
WHERE user_id = $1 AND revoked_at IS NULL;

-- name: BumpTokenVersion :one
UPDATE users SET token_version = token_version + 1
WHERE id = $1
RETURNING token_version;

-- name: DeleteExpiredRefreshTokens :exec
DELETE FROM refresh_tokens WHERE expires_at < now() - interval '7 days';


-- name: InsertPollCycle :exec
INSERT INTO poll_cycles (started_at, duration_ms, subjects, sections_checked, usm_requests, openings, errors)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: InsertSeatEvent :exec
INSERT INTO seat_events (class_nbr, subject, catalog_nbr, class_section, descr, seats, watchers, notified)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

-- name: AddUSMTraffic :exec
INSERT INTO usm_traffic (hour, source, requests, cache_hits)
VALUES (date_trunc('hour', now()), $1, $2, $3)
ON CONFLICT (hour, source) DO UPDATE
SET requests = usm_traffic.requests + EXCLUDED.requests,
    cache_hits = usm_traffic.cache_hits + EXCLUDED.cache_hits;

-- name: RecentPollCycles :many
SELECT * FROM poll_cycles ORDER BY started_at DESC LIMIT $1;

-- name: PollCycleTotalsSince :one
SELECT count(*)::int AS cycles,
       coalesce(sum(sections_checked), 0)::bigint AS sections_checked,
       coalesce(sum(usm_requests), 0)::bigint AS usm_requests,
       coalesce(sum(errors), 0)::bigint AS errors,
       coalesce(avg(duration_ms), 0)::float8 AS avg_duration_ms
FROM poll_cycles WHERE started_at >= $1;

-- name: RecentSeatEvents :many
SELECT * FROM seat_events ORDER BY created_at DESC LIMIT $1;

-- name: SeatEventTotalsSince :one
SELECT count(*)::int AS openings, coalesce(sum(notified), 0)::bigint AS alerts
FROM seat_events WHERE created_at >= $1;

-- name: USMTrafficSince :many
SELECT hour, source, requests, cache_hits FROM usm_traffic
WHERE hour >= $1 ORDER BY hour;

-- name: PruneActivity :exec
WITH c AS (DELETE FROM poll_cycles WHERE started_at < now() - interval '30 days')
DELETE FROM usm_traffic WHERE hour < now() - interval '90 days';

-- name: WatchTotals :one
SELECT count(*) FILTER (WHERE w.active)::int AS active,
       count(*) FILTER (WHERE NOT w.active)::int AS notified,
       count(DISTINCT w.class_nbr) FILTER (WHERE w.active)::int AS sections,
       count(DISTINCT s.subject) FILTER (WHERE w.active)::int AS subjects,
       count(DISTINCT w.user_id)::int AS watchers
FROM watches w JOIN sections s ON s.class_nbr = w.class_nbr;

-- name: MostWatchedSections :many
SELECT s.class_nbr, s.subject, s.catalog_nbr, s.class_section, s.descr, s.last_enrollment_avail,
       count(*)::int AS watchers
FROM watches w JOIN sections s ON s.class_nbr = w.class_nbr
WHERE w.active
GROUP BY s.class_nbr
ORDER BY watchers DESC, s.subject, s.catalog_nbr
LIMIT $1;


-- name: UserTotals :one
SELECT count(*)::int AS total,
       count(*) FILTER (WHERE verified)::int AS verified,
       count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_this_week
FROM users;

-- name: AdminListUsers :many
SELECT u.id, u.email, u.verified, u.created_at,
       count(w.id) FILTER (WHERE w.active)::int AS active_watches,
       count(w.id)::int AS total_watches,
       (SELECT count(*) FROM refresh_tokens r
         WHERE r.user_id = u.id AND r.revoked_at IS NULL AND r.expires_at > now())::int AS sessions
FROM users u LEFT JOIN watches w ON w.user_id = u.id
GROUP BY u.id
ORDER BY u.created_at DESC;

-- name: AdminUserSessions :many
SELECT id, user_agent, created_at, expires_at FROM refresh_tokens
WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
ORDER BY created_at DESC;

-- name: AdminUserWatches :many
SELECT w.id, w.class_nbr, w.active, w.created_at,
       s.subject, s.catalog_nbr, s.class_section, s.descr, s.last_enrollment_avail
FROM watches w JOIN sections s ON s.class_nbr = w.class_nbr
WHERE w.user_id = $1
ORDER BY w.created_at DESC;

-- name: DeleteUser :execrows
DELETE FROM users WHERE id = $1;

-- name: AdminListWatches :many
SELECT w.id, w.class_nbr, w.active, w.created_at, u.id AS user_id, u.email,
       s.subject, s.catalog_nbr, s.class_section, s.descr, s.last_enrollment_avail, s.updated_at
FROM watches w
JOIN users u ON u.id = w.user_id
JOIN sections s ON s.class_nbr = w.class_nbr
ORDER BY w.active DESC, w.created_at DESC;

-- name: SetWatchActive :execrows
UPDATE watches SET active = $2 WHERE id = $1;

-- name: DeleteWatchByID :execrows
DELETE FROM watches WHERE id = $1;
