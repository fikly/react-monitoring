CREATE TABLE IF NOT EXISTS metrics_hourly (
    id              BIGSERIAL PRIMARY KEY,
    app_id          VARCHAR(64) NOT NULL,
    hour            TIMESTAMPTZ NOT NULL,
    event_type      VARCHAR(32) NOT NULL,
    path            VARCHAR(1024),
    count           BIGINT NOT NULL DEFAULT 0,
    unique_sessions BIGINT DEFAULT 0,
    unique_users    BIGINT DEFAULT 0,
    avg_value       DOUBLE PRECISION,
    p50_value       DOUBLE PRECISION,
    p95_value       DOUBLE PRECISION,
    p99_value       DOUBLE PRECISION,

    UNIQUE (app_id, hour, event_type, path)
);

CREATE TABLE IF NOT EXISTS metrics_daily (
    id              BIGSERIAL PRIMARY KEY,
    app_id          VARCHAR(64) NOT NULL,
    day             DATE NOT NULL,
    event_type      VARCHAR(32) NOT NULL,
    path            VARCHAR(1024),
    count           BIGINT NOT NULL DEFAULT 0,
    unique_sessions BIGINT DEFAULT 0,
    unique_users    BIGINT DEFAULT 0,
    avg_value       DOUBLE PRECISION,
    p50_value       DOUBLE PRECISION,
    p95_value       DOUBLE PRECISION,
    p99_value       DOUBLE PRECISION,

    UNIQUE (app_id, day, event_type, path)
);
