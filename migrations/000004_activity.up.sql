-- What the worker and API actually did, so the homepage and the admin panel
-- can show real numbers instead of copy.

-- One row per worker poll cycle.
CREATE TABLE poll_cycles (
    id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    duration_ms INT NOT NULL,
    subjects INT NOT NULL,
    sections_checked INT NOT NULL,
    usm_requests INT NOT NULL,
    openings INT NOT NULL,
    errors INT NOT NULL
);

CREATE INDEX poll_cycles_started_at_idx ON poll_cycles (started_at DESC);

-- One row per section the worker saw flip from full to open.
CREATE TABLE seat_events (
    id BIGSERIAL PRIMARY KEY,
    class_nbr INT NOT NULL,
    subject TEXT NOT NULL,
    catalog_nbr TEXT NOT NULL,
    class_section TEXT NOT NULL,
    descr TEXT NOT NULL DEFAULT '',
    seats INT NOT NULL,
    watchers INT NOT NULL,
    notified INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX seat_events_created_at_idx ON seat_events (created_at DESC);

-- Requests to USM per hour and per process ('worker' or 'search'), with the
-- student searches the 60s cache answered without touching USM.
CREATE TABLE usm_traffic (
    hour TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL,
    requests INT NOT NULL DEFAULT 0,
    cache_hits INT NOT NULL DEFAULT 0,
    PRIMARY KEY (hour, source)
);

-- Deleting a user from the admin panel takes their watches with them.
ALTER TABLE watches DROP CONSTRAINT watches_user_id_fkey,
    ADD CONSTRAINT watches_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE verification_tokens DROP CONSTRAINT verification_tokens_user_id_fkey,
    ADD CONSTRAINT verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
