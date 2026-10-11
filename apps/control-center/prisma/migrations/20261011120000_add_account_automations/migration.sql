CREATE TABLE monitor_account_automations (
    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('offer', 'message')),
    enabled BOOLEAN NOT NULL DEFAULT false,
    account_id BIGINT NOT NULL CHECK (account_id > 0),
    domain VARCHAR(255) NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 10 CHECK (discount_percent BETWEEN 1 AND 50),
    max_price_minor INTEGER NOT NULL DEFAULT 10000 CHECK (max_price_minor BETWEEN 1 AND 1000000),
    message_template TEXT NOT NULL DEFAULT '',
    enabled_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (monitor_id, kind)
);
CREATE INDEX monitor_account_automations_enabled_enabled_at_idx ON monitor_account_automations(enabled, enabled_at);

CREATE TABLE account_automation_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    item_id BIGINT NOT NULL,
    monitor_id INTEGER NOT NULL,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('offer', 'message')),
    status VARCHAR(20) NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'uncertain', 'skipped')),
    reason VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP(6),
    UNIQUE (user_id, account_id, domain, item_id, kind)
);
CREATE INDEX account_automation_attempts_user_id_account_id_domain_created_at_idx ON account_automation_attempts(user_id, account_id, domain, created_at);
CREATE INDEX account_automation_attempts_monitor_id_created_at_idx ON account_automation_attempts(monitor_id, created_at);

INSERT INTO feature_policies (feature, enabled, free_enabled, premium_enabled, admin_enabled, revision, updated_at)
VALUES ('auto_offers', true, true, true, true, 1, CURRENT_TIMESTAMP),
       ('auto_messages', true, true, true, true, 1, CURRENT_TIMESTAMP)
ON CONFLICT (feature) DO NOTHING;

-- Account changes and unlinking disarm both modules, including when the same
-- identity is linked again later. A fresh explicit enable is required.
CREATE FUNCTION disarm_account_automations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.vinted_user_id = NEW.vinted_user_id AND OLD.domain = NEW.domain THEN
        RETURN NEW;
    END IF;
    UPDATE monitor_account_automations a SET enabled = false, revision = revision + 1, updated_at = CURRENT_TIMESTAMP
    FROM monitors m WHERE m.id = a.monitor_id AND m."userId" = OLD.user_id AND a.enabled;
    RETURN OLD;
END;
$$;
CREATE TRIGGER vinted_session_disarm_automations
AFTER UPDATE OF vinted_user_id, domain OR DELETE ON vinted_sessions
FOR EACH ROW EXECUTE FUNCTION disarm_account_automations();
