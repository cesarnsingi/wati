-- ============================================================
-- WhatsApp SaaS Platform — PostgreSQL Schema
-- Multi-tenant, production-ready
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── BUSINESSES (tenants) ──────────────────────────────────────────────────────
CREATE TABLE businesses (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  plan                  TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro','enterprise')),
  -- WhatsApp Cloud API credentials (per tenant)
  wa_phone_number_id    TEXT,
  wa_business_account_id TEXT,
  wa_access_token       TEXT,            -- encrypted at app level
  wa_verify_token       TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  wa_webhook_secret     TEXT,
  -- Limits
  monthly_message_limit INT  NOT NULL DEFAULT 1000,
  messages_sent_this_month INT NOT NULL DEFAULT 0,
  -- Meta
  is_active             BOOLEAN NOT NULL DEFAULT true,
  timezone              TEXT NOT NULL DEFAULT 'Africa/Luanda',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USERS (agents / admins per business) ─────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner','admin','agent')),
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, email)
);

-- ── CONTACTS (CRM) ────────────────────────────────────────────────────────────
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL,          -- E.164 format e.g. +244923456789
  name            TEXT,
  email           TEXT,
  -- CRM fields
  tags            TEXT[]   NOT NULL DEFAULT '{}',
  custom_fields   JSONB    NOT NULL DEFAULT '{}',
  notes           TEXT,
  -- WhatsApp state
  wa_id           TEXT,                   -- WhatsApp contact ID
  opted_in        BOOLEAN NOT NULL DEFAULT false,
  opted_in_at     TIMESTAMPTZ,
  last_seen_at    TIMESTAMPTZ,
  -- Assignment
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','snoozed')),
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

CREATE INDEX contacts_business_id_idx ON contacts(business_id);
CREATE INDEX contacts_phone_idx       ON contacts(phone);
CREATE INDEX contacts_tags_idx        ON contacts USING GIN(tags);
CREATE INDEX contacts_assigned_idx    ON contacts(assigned_to);

-- ── CONVERSATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','snoozed','bot')),
  -- 24h window tracking (WhatsApp policy)
  last_customer_message_at TIMESTAMPTZ,
  window_expires_at        TIMESTAMPTZ,
  -- Meta
  unread_count    INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX conversations_business_id_idx ON conversations(business_id);
CREATE INDEX conversations_contact_id_idx  ON conversations(contact_id);
CREATE INDEX conversations_status_idx      ON conversations(status);
CREATE INDEX conversations_assigned_idx    ON conversations(assigned_to);

-- ── MESSAGES ──────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id        UUID NOT NULL REFERENCES contacts(id),
  -- Direction
  direction         TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('contact','agent','bot','system')),
  sender_id         UUID,                 -- user id if agent, null if contact/bot
  -- Content
  type              TEXT NOT NULL DEFAULT 'text'
                    CHECK (type IN ('text','image','video','audio','document','location','template','interactive','sticker','reaction','unsupported')),
  content           TEXT,                 -- text body
  media_url         TEXT,
  media_mime_type   TEXT,
  media_filename    TEXT,
  media_size        INT,
  caption           TEXT,
  -- Template
  template_name     TEXT,
  template_language TEXT,
  template_params   JSONB,
  -- WhatsApp metadata
  wa_message_id     TEXT UNIQUE,          -- WhatsApp's message ID
  wa_timestamp      TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','delivered','read','failed')),
  error_code        TEXT,
  error_message     TEXT,
  -- Reply context
  reply_to_message_id UUID REFERENCES messages(id),
  -- Meta
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX messages_business_id_idx     ON messages(business_id);
CREATE INDEX messages_wa_message_id_idx   ON messages(wa_message_id);
CREATE INDEX messages_created_at_idx      ON messages(created_at DESC);

-- ── CAMPAIGNS (broadcast messages) ───────────────────────────────────────────
CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id),
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','scheduled','running','completed','failed','paused')),
  -- Template
  template_name   TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'pt',
  template_params JSONB NOT NULL DEFAULT '[]',
  -- Targeting
  contact_filter  JSONB NOT NULL DEFAULT '{}',   -- tag filters, custom field filters
  contact_ids     UUID[],                         -- explicit contact list
  estimated_count INT,
  -- Stats
  sent_count      INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  read_count      INT NOT NULL DEFAULT 0,
  failed_count    INT NOT NULL DEFAULT 0,
  -- Scheduling
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_recipients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id   UUID NOT NULL REFERENCES contacts(id),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','sent','delivered','read','failed','skipped')),
  message_id   UUID REFERENCES messages(id),
  sent_at      TIMESTAMPTZ,
  error        TEXT,
  UNIQUE(campaign_id, contact_id)
);

-- ── AUTOMATIONS ───────────────────────────────────────────────────────────────
CREATE TABLE automations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  trigger_type  TEXT NOT NULL
                CHECK (trigger_type IN ('keyword','first_message','no_reply','opt_in','tag_added','scheduled')),
  trigger_config JSONB NOT NULL DEFAULT '{}',   -- e.g. {"keywords": ["ola","oi","hello"]}
  -- Actions are ordered array of steps
  actions       JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{"type":"send_message","delay_seconds":0,"content":"Olá! Como posso ajudar?"},
  --        {"type":"assign_agent","agent_id":"uuid"},
  --        {"type":"add_tag","tag":"novo-cliente"}]
  run_count     INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE automation_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id   UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  status          TEXT NOT NULL CHECK (status IN ('started','completed','failed')),
  steps_completed INT NOT NULL DEFAULT 0,
  error           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ── MEDIA LIBRARY ─────────────────────────────────────────────────────────────
CREATE TABLE media (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INT NOT NULL,
  url           TEXT NOT NULL,
  wa_media_id   TEXT,                     -- after uploading to WhatsApp
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── QUICK REPLIES (saved response templates) ──────────────────────────────────
CREATE TABLE quick_replies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES users(id),
  shortcut    TEXT NOT NULL,              -- e.g. "/ola"
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, shortcut)
);

-- ── WEBHOOK EVENTS (raw log for debugging) ────────────────────────────────────
CREATE TABLE webhook_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID REFERENCES businesses(id),
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  processed     BOOLEAN NOT NULL DEFAULT false,
  error         TEXT,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

CREATE INDEX webhook_events_processed_idx ON webhook_events(processed) WHERE processed = false;

-- ── updated_at triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated_at  BEFORE UPDATE ON businesses  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at       BEFORE UPDATE ON users       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_updated_at    BEFORE UPDATE ON contacts    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_campaigns_updated_at   BEFORE UPDATE ON campaigns   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_automations_updated_at BEFORE UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
