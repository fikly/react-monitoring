CREATE TABLE IF NOT EXISTS events (
    id                  UUID DEFAULT gen_random_uuid(),
    app_id              VARCHAR(64) NOT NULL,
    session_id          VARCHAR(64) NOT NULL,
    user_id             VARCHAR(255),
    event_type          VARCHAR(32) NOT NULL,
    url                 TEXT NOT NULL,
    path                VARCHAR(1024) NOT NULL,
    user_agent          TEXT,
    screen_resolution   VARCHAR(20),
    viewport_size       VARCHAR(20),
    properties          JSONB NOT NULL DEFAULT '{}',
    metadata            JSONB DEFAULT '{}',
    client_timestamp    TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (id)
);
