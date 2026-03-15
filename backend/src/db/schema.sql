-- ============================================================
-- CreatorLink Database Schema
-- PostgreSQL 16+
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('creator', 'client', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deleted', 'pending_verification');
CREATE TYPE project_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE notification_type AS ENUM (
  'new_message', 'project_application', 'application_accepted',
  'application_rejected', 'new_review', 'project_update',
  'project_invitation', 'account_verification'
);
CREATE TYPE social_platform AS ENUM ('instagram', 'tiktok', 'youtube', 'twitch', 'twitter', 'linkedin', 'facebook');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE report_type AS ENUM ('spam', 'harassment', 'fake_profile', 'inappropriate_content', 'scam', 'other');

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               VARCHAR(255) UNIQUE NOT NULL,
  email_verified      BOOLEAN DEFAULT false,
  email_verify_token  VARCHAR(255),
  password_hash       VARCHAR(255),                          -- NULL for OAuth-only users
  google_id           VARCHAR(255) UNIQUE,
  role                user_role NOT NULL DEFAULT 'creator',
  status              account_status NOT NULL DEFAULT 'pending_verification',

  -- Profile
  username            VARCHAR(50) UNIQUE NOT NULL,
  display_name        VARCHAR(100),
  bio                 TEXT,
  avatar_url          TEXT,
  banner_url          TEXT,
  location            VARCHAR(100),
  languages           TEXT[] DEFAULT '{}',
  website             TEXT,
  phone               VARCHAR(30),

  -- Creator-specific
  hourly_rate         DECIMAL(10,2),
  project_rate_min    DECIMAL(10,2),
  project_rate_max    DECIMAL(10,2),
  rate_negotiable     BOOLEAN DEFAULT true,
  availability_status VARCHAR(30) DEFAULT 'available',       -- available, busy, unavailable
  response_time       VARCHAR(50),

  -- Privacy
  show_email          BOOLEAN DEFAULT false,
  show_phone          BOOLEAN DEFAULT false,
  profile_public      BOOLEAN DEFAULT true,

  -- Notifications prefs (stored as JSONB for flexibility)
  notification_prefs  JSONB DEFAULT '{"email_messages": true, "email_applications": true, "email_reviews": true, "push_all": true}',

  -- Stats (denormalised for performance)
  profile_views       INTEGER DEFAULT 0,
  total_reviews       INTEGER DEFAULT 0,
  avg_rating          DECIMAL(3,2) DEFAULT 0,
  completed_projects  INTEGER DEFAULT 0,

  -- Timestamps
  last_seen_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_location ON users USING gin(to_tsvector('english', coalesce(location, '')));
CREATE INDEX idx_users_bio_search ON users USING gin(to_tsvector('english', coalesce(bio, '') || ' ' || coalesce(display_name, '')));

-- ============================================================
-- SOCIAL LINKS
-- ============================================================

CREATE TABLE social_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform        social_platform NOT NULL,
  url             TEXT NOT NULL,
  handle          VARCHAR(100),
  followers_count INTEGER DEFAULT 0,
  verified        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_social_links_user ON social_links(user_id);
CREATE INDEX idx_social_links_platform ON social_links(platform);

-- ============================================================
-- SKILLS
-- ============================================================

CREATE TABLE skills (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  VARCHAR(100) UNIQUE NOT NULL,
  slug  VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50)
);

CREATE TABLE user_skills (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id   UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level      VARCHAR(20) DEFAULT 'intermediate',  -- beginner, intermediate, expert
  PRIMARY KEY (user_id, skill_id)
);

CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill_id);

-- ============================================================
-- PORTFOLIO
-- ============================================================

CREATE TABLE portfolio_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  cover_url     TEXT,
  project_url   TEXT,
  media_urls    TEXT[] DEFAULT '{}',
  tags          TEXT[] DEFAULT '{}',
  featured      BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_user ON portfolio_items(user_id);

-- ============================================================
-- PROJECTS (Announcements)
-- ============================================================

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  parent_id   UUID REFERENCES categories(id)
);

CREATE TABLE projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES categories(id),

  title            VARCHAR(200) NOT NULL,
  slug             VARCHAR(250) UNIQUE NOT NULL,
  description      TEXT NOT NULL,
  requirements     TEXT,

  budget_min       DECIMAL(10,2),
  budget_max       DECIMAL(10,2),
  budget_fixed     DECIMAL(10,2),
  budget_type      VARCHAR(20) DEFAULT 'fixed',              -- fixed, range, negotiable
  currency         CHAR(3) DEFAULT 'EUR',

  deadline         DATE,
  duration_days    INTEGER,

  status           project_status NOT NULL DEFAULT 'open',
  platforms        TEXT[] DEFAULT '{}',
  skills_required  TEXT[] DEFAULT '{}',
  tags             TEXT[] DEFAULT '{}',
  attachments      TEXT[] DEFAULT '{}',

  min_followers    INTEGER,
  location_req     VARCHAR(100),
  language_req     TEXT[] DEFAULT '{}',

  views            INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  featured         BOOLEAN DEFAULT false,
  featured_until   TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category_id);
CREATE INDEX idx_projects_created ON projects(created_at DESC);
CREATE INDEX idx_projects_search ON projects USING gin(
  to_tsvector('english', title || ' ' || description)
);
CREATE INDEX idx_projects_tags ON projects USING gin(tags);
CREATE INDEX idx_projects_platforms ON projects USING gin(platforms);

-- ============================================================
-- PROJECT APPLICATIONS
-- ============================================================

CREATE TABLE applications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creator_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       application_status NOT NULL DEFAULT 'pending',
  cover_letter TEXT,
  proposed_rate DECIMAL(10,2),
  proposed_timeline VARCHAR(100),
  portfolio_urls TEXT[] DEFAULT '{}',
  client_note  TEXT,                                         -- client's private note
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, creator_id)
);

CREATE INDEX idx_applications_project ON applications(project_id);
CREATE INDEX idx_applications_creator ON applications(creator_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================

CREATE TABLE conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  attachments     TEXT[] DEFAULT '{}',
  is_system_msg   BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at       TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title          VARCHAR(200),
  body           TEXT NOT NULL,
  is_public      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reviewer_id, reviewee_id, project_id)
);

CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_project ON reviews(project_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;

-- ============================================================
-- REPORTS
-- ============================================================

CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type         report_type NOT NULL,
  description  TEXT NOT NULL,
  status       report_status NOT NULL DEFAULT 'pending',
  admin_note   TEXT,
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

-- ============================================================
-- SAVED / BOOKMARKS
-- ============================================================

CREATE TABLE saved_creators (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, creator_id)
);

CREATE TABLE saved_projects (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================

CREATE TABLE password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMIN AUDIT LOG
-- ============================================================

CREATE TABLE admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLATFORM ANALYTICS (denormalised daily snapshots)
-- ============================================================

CREATE TABLE analytics_daily (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date                 DATE UNIQUE NOT NULL,
  new_users            INTEGER DEFAULT 0,
  active_users         INTEGER DEFAULT 0,
  new_projects         INTEGER DEFAULT 0,
  new_applications     INTEGER DEFAULT 0,
  messages_sent        INTEGER DEFAULT 0,
  new_reviews          INTEGER DEFAULT 0
);

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Update user avg_rating and total_reviews
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET
    avg_rating   = (SELECT AVG(rating) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = true),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = true)
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_rating AFTER INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- ============================================================
-- TRIGGER: increment application count on project
-- ============================================================

CREATE OR REPLACE FUNCTION update_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET applications_count = applications_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET applications_count = GREATEST(0, applications_count - 1) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_app_count AFTER INSERT OR DELETE ON applications FOR EACH ROW EXECUTE FUNCTION update_application_count();

-- ============================================================
-- DEFAULT CATEGORIES SEED
-- ============================================================

INSERT INTO categories (name, slug, icon) VALUES
  ('Video & Animation', 'video-animation', 'video'),
  ('Design & Creative', 'design-creative', 'palette'),
  ('Writing & Content', 'writing-content', 'pen'),
  ('Music & Audio', 'music-audio', 'music'),
  ('Marketing & Social', 'marketing-social', 'trending-up'),
  ('Web & Development', 'web-development', 'code'),
  ('Photography', 'photography', 'camera'),
  ('Consulting', 'consulting', 'briefcase'),
  ('Gaming', 'gaming', 'gamepad'),
  ('Lifestyle & Beauty', 'lifestyle-beauty', 'star');

-- Default skills
INSERT INTO skills (name, slug, category) VALUES
  ('Video Editing', 'video-editing', 'Video'),
  ('Motion Graphics', 'motion-graphics', 'Video'),
  ('Photography', 'photography', 'Design'),
  ('Graphic Design', 'graphic-design', 'Design'),
  ('UI/UX Design', 'ui-ux-design', 'Design'),
  ('Copywriting', 'copywriting', 'Writing'),
  ('SEO Writing', 'seo-writing', 'Writing'),
  ('Social Media Management', 'social-media-management', 'Marketing'),
  ('Influencer Marketing', 'influencer-marketing', 'Marketing'),
  ('Web Development', 'web-development', 'Tech'),
  ('React', 'react', 'Tech'),
  ('Python', 'python', 'Tech'),
  ('Podcast Production', 'podcast-production', 'Audio'),
  ('Music Production', 'music-production', 'Audio'),
  ('Brand Strategy', 'brand-strategy', 'Marketing'),
  ('Content Strategy', 'content-strategy', 'Marketing'),
  ('3D Modeling', '3d-modeling', 'Design'),
  ('Illustration', 'illustration', 'Design'),
  ('Community Management', 'community-management', 'Marketing'),
  ('Email Marketing', 'email-marketing', 'Marketing');
