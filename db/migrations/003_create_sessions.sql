CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      VARCHAR(64) UNIQUE NOT NULL,
    app_id          VARCHAR(64) NOT NULL,
    user_id         VARCHAR(255),
    started_at      TIMESTAMPTZ NOT NULL,
    last_activity   TIMESTAMPTZ NOT NULL,
    page_count      INTEGER DEFAULT 0,
    event_count     INTEGER DEFAULT 0,
    user_agent      TEXT,
    screen_resolution VARCHAR(20),
    is_active       BOOLEAN DEFAULT TRUE
);
