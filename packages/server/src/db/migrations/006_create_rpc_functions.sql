-- Function for grouped event queries (used by dashboard)
CREATE OR REPLACE FUNCTION query_events_grouped(
  p_app_id TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_event_type TEXT DEFAULT NULL,
  p_path TEXT DEFAULT NULL,
  p_group_by TEXT DEFAULT 'day',
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  period TEXT,
  count BIGINT,
  unique_sessions BIGINT,
  unique_users BIGINT,
  avg_value DOUBLE PRECISION,
  p50_value DOUBLE PRECISION,
  p95_value DOUBLE PRECISION,
  p99_value DOUBLE PRECISION
)
LANGUAGE plpgsql AS $$
BEGIN
  IF p_group_by = 'day' THEN
    RETURN QUERY
      SELECT
        to_char(date_trunc('day', e.created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as period,
        COUNT(*)::BIGINT as count,
        COUNT(DISTINCT e.session_id)::BIGINT as unique_sessions,
        COUNT(DISTINCT e.user_id) FILTER (WHERE e.user_id IS NOT NULL)::BIGINT as unique_users,
        AVG((e.properties->>'duration_ms')::numeric) FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as avg_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (e.properties->>'duration_ms')::numeric)
          FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as p50_value,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (e.properties->>'duration_ms')::numeric)
          FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as p95_value,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (e.properties->>'duration_ms')::numeric)
          FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as p99_value
      FROM events e
      WHERE e.app_id = p_app_id
        AND e.created_at >= p_from
        AND e.created_at <= p_to
        AND (p_event_type IS NULL OR e.event_type = p_event_type)
        AND (p_path IS NULL OR e.path ILIKE replace(p_path, '*', '%'))
      GROUP BY date_trunc('day', e.created_at)
      ORDER BY date_trunc('day', e.created_at) DESC
      LIMIT p_limit OFFSET p_offset;

  ELSIF p_group_by = 'hour' THEN
    RETURN QUERY
      SELECT
        to_char(date_trunc('hour', e.created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as period,
        COUNT(*)::BIGINT as count,
        COUNT(DISTINCT e.session_id)::BIGINT as unique_sessions,
        COUNT(DISTINCT e.user_id) FILTER (WHERE e.user_id IS NOT NULL)::BIGINT as unique_users,
        AVG((e.properties->>'duration_ms')::numeric) FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as avg_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (e.properties->>'duration_ms')::numeric)
          FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as p50_value,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (e.properties->>'duration_ms')::numeric)
          FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as p95_value,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (e.properties->>'duration_ms')::numeric)
          FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as p99_value
      FROM events e
      WHERE e.app_id = p_app_id
        AND e.created_at >= p_from
        AND e.created_at <= p_to
        AND (p_event_type IS NULL OR e.event_type = p_event_type)
        AND (p_path IS NULL OR e.path ILIKE replace(p_path, '*', '%'))
      GROUP BY date_trunc('hour', e.created_at)
      ORDER BY date_trunc('hour', e.created_at) DESC
      LIMIT p_limit OFFSET p_offset;

  ELSIF p_group_by = 'path' THEN
    RETURN QUERY
      SELECT
        e.path as period,
        COUNT(*)::BIGINT as count,
        COUNT(DISTINCT e.session_id)::BIGINT as unique_sessions,
        COUNT(DISTINCT e.user_id) FILTER (WHERE e.user_id IS NOT NULL)::BIGINT as unique_users,
        AVG((e.properties->>'duration_ms')::numeric) FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as avg_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (e.properties->>'duration_ms')::numeric)
          FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as p50_value,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (e.properties->>'duration_ms')::numeric)
          FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as p95_value,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (e.properties->>'duration_ms')::numeric)
          FILTER (WHERE e.properties->>'duration_ms' IS NOT NULL)::DOUBLE PRECISION as p99_value
      FROM events e
      WHERE e.app_id = p_app_id
        AND e.created_at >= p_from
        AND e.created_at <= p_to
        AND (p_event_type IS NULL OR e.event_type = p_event_type)
        AND (p_path IS NULL OR e.path ILIKE replace(p_path, '*', '%'))
      GROUP BY e.path
      ORDER BY count DESC
      LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$$;

-- Function for hourly aggregation (used by cron)
CREATE OR REPLACE FUNCTION aggregate_hourly_metrics(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE (
  app_id VARCHAR,
  event_type VARCHAR,
  path VARCHAR,
  count BIGINT,
  unique_sessions BIGINT,
  unique_users BIGINT,
  avg_value DOUBLE PRECISION,
  p50_value DOUBLE PRECISION,
  p95_value DOUBLE PRECISION,
  p99_value DOUBLE PRECISION
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.app_id,
      e.event_type,
      e.path,
      COUNT(*)::BIGINT as count,
      COUNT(DISTINCT e.session_id)::BIGINT as unique_sessions,
      COUNT(DISTINCT e.user_id) FILTER (WHERE e.user_id IS NOT NULL)::BIGINT as unique_users,
      AVG((e.properties->>'metric_value')::numeric) FILTER (WHERE e.event_type = 'performance')::DOUBLE PRECISION as avg_value,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (e.properties->>'metric_value')::numeric)
        FILTER (WHERE e.event_type = 'performance')::DOUBLE PRECISION as p50_value,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (e.properties->>'metric_value')::numeric)
        FILTER (WHERE e.event_type = 'performance')::DOUBLE PRECISION as p95_value,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (e.properties->>'metric_value')::numeric)
        FILTER (WHERE e.event_type = 'performance')::DOUBLE PRECISION as p99_value
    FROM events e
    WHERE e.created_at >= p_from AND e.created_at < p_to
    GROUP BY e.app_id, e.event_type, e.path;
END;
$$;

-- Function for daily aggregation (aggregates from hourly metrics)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE (
  app_id VARCHAR,
  event_type VARCHAR,
  path VARCHAR,
  count BIGINT,
  unique_sessions BIGINT,
  unique_users BIGINT,
  avg_value DOUBLE PRECISION,
  p50_value DOUBLE PRECISION,
  p95_value DOUBLE PRECISION,
  p99_value DOUBLE PRECISION
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
    SELECT
      mh.app_id,
      mh.event_type,
      mh.path,
      SUM(mh.count)::BIGINT as count,
      SUM(mh.unique_sessions)::BIGINT as unique_sessions,
      SUM(mh.unique_users)::BIGINT as unique_users,
      AVG(mh.avg_value) FILTER (WHERE mh.avg_value IS NOT NULL)::DOUBLE PRECISION as avg_value,
      AVG(mh.p50_value) FILTER (WHERE mh.p50_value IS NOT NULL)::DOUBLE PRECISION as p50_value,
      AVG(mh.p95_value) FILTER (WHERE mh.p95_value IS NOT NULL)::DOUBLE PRECISION as p95_value,
      AVG(mh.p99_value) FILTER (WHERE mh.p99_value IS NOT NULL)::DOUBLE PRECISION as p99_value
    FROM metrics_hourly mh
    WHERE mh.hour >= p_from AND mh.hour < p_to
    GROUP BY mh.app_id, mh.event_type, mh.path;
END;
$$;
