-- Bumping token_version invalidates every access token issued before it
-- (logout on one device signs out all of them).
ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0;

-- Refresh tokens are opaque random strings; only their SHA-256 is stored, so
-- a database leak can't be replayed as live sessions. Each refresh revokes
-- the presented token and issues a new one (rotation).
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
