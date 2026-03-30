CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS apps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id      VARCHAR(64) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    api_key     VARCHAR(128) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(48), 'hex'),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    is_active   BOOLEAN DEFAULT TRUE
);

-- Insert default AOP app
-- Insert a default app (change these values for your project)
INSERT INTO apps (app_id, name) VALUES ('my-app', 'My Application')
ON CONFLICT (app_id) DO NOTHING;
