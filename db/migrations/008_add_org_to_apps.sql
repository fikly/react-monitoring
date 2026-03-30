-- Add org_id to apps
ALTER TABLE apps ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_apps_org ON apps (org_id);

-- Create default org and assign existing apps
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    INSERT INTO organizations (name, slug) VALUES ('Default Organization', 'default')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_org_id;

    IF default_org_id IS NULL THEN
        SELECT id INTO default_org_id FROM organizations WHERE slug = 'default';
    END IF;

    UPDATE apps SET org_id = default_org_id WHERE org_id IS NULL;
END $$;

-- Make org_id required
ALTER TABLE apps ALTER COLUMN org_id SET NOT NULL;
