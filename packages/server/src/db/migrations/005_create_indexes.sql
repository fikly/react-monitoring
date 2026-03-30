-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_app_type_time
    ON events (app_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_session
    ON events (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_events_user
    ON events (user_id, created_at)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_path
    ON events (app_id, path, created_at DESC);

-- GIN index for JSONB property queries
CREATE INDEX IF NOT EXISTS idx_events_properties
    ON events USING GIN (properties jsonb_path_ops);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_app
    ON sessions (app_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON sessions (user_id, started_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_active
    ON sessions (is_active, last_activity DESC);

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_lookup
    ON metrics_hourly (app_id, hour DESC, event_type);

CREATE INDEX IF NOT EXISTS idx_metrics_hourly_path
    ON metrics_hourly (app_id, event_type, path, hour DESC)
    WHERE path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_metrics_daily_lookup
    ON metrics_daily (app_id, day DESC, event_type);

CREATE INDEX IF NOT EXISTS idx_metrics_daily_path
    ON metrics_daily (app_id, event_type, path, day DESC)
    WHERE path IS NOT NULL;
