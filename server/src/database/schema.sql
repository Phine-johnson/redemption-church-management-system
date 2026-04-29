-- Church CMS Database Schema
-- PostgreSQL 13+
-- Run this entire script to initialize the database

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS & AUTHENTICATION
-- ============================================

-- Users table (replaces hardcoded users)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,   
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Super Admin', 'AudioVisual', 'Accountant', 'Clerk', 'Member')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  phone VARCHAR(20),
  profile_photo_url TEXT,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh tokens for JWT
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. MEMBERS & FAMILIES
-- ============================================

-- Families/Households
CREATE TABLE IF NOT EXISTS families (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  family_name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Ghana',
  primary_contact_email VARCHAR(255),
  primary_contact_phone VARCHAR(20),
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members (enhanced)
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- If member has login
  family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,

  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  address TEXT,

  -- Church Information
  member_since DATE,
  membership_status VARCHAR(50) DEFAULT 'Visitor' CHECK (membership_status IN ('Visitor', 'New Member', 'Active', 'Inactive', 'Transferred', 'Deceased')),
  ministry VARCHAR(100),
  ministry_role VARCHAR(100),
  baptism_date DATE,
  baptism_location VARCHAR(200),
  spouse_name VARCHAR(200),
  spouse_email VARCHAR(255),
  spouse_phone VARCHAR(20),
  children_names TEXT, -- JSON array or comma-separated

  -- Additional
  occupation VARCHAR(100),
  employer VARCHAR(200),
  education_level VARCHAR(100),
  how_did_you_hear TEXT,
  referral_source VARCHAR(200),
  notes TEXT,

  -- Metadata
  last_attendance_date DATE,
  last_seen TEXT,
  is_sunday_school BOOLEAN DEFAULT FALSE,
  is_youth_ministry BOOLEAN DEFAULT FALSE,
  is_worship_team BOOLEAN DEFAULT FALSE,
  is_volunteer BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Member documents (baptism certificates, IDs, etc.)
CREATE TABLE IF NOT EXISTS member_documents (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- 'baptism_certificate', 'id_front', 'id_back', 'passport', 'other'
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL, -- S3/Cloudinary URL
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Member custom fields (dynamic fields)
CREATE TABLE IF NOT EXISTS member_custom_fields (
  id SERIAL PRIMARY KEY,
  field_name VARCHAR(100) UNIQUE NOT NULL,
  field_label VARCHAR(200) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multiselect')),
  field_options JSON, -- For select/multiselect: ["Option1", "Option2"]
  is_required BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Member custom field values
CREATE TABLE IF NOT EXISTS member_custom_field_values (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  custom_field_id INTEGER NOT NULL REFERENCES member_custom_fields(id) ON DELETE CASCADE,
  value TEXT, -- Stored as text, cast based on field_type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, custom_field_id)
);

-- ============================================
-- 3. ATTENDANCE & CHECK-IN
-- ============================================

-- Service definitions (Sunday, Wednesday, etc.)
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  service_name VARCHAR(200) NOT NULL,
  service_day VARCHAR(50) NOT NULL, -- 'Sunday', 'Wednesday', 'Friday', etc.
  service_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  check_in_method VARCHAR(50) CHECK (check_in_method IN ('manual', 'qr_code', 'mobile', 'kiosk')),
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR codes for check-in (unique per member, can be regenerated)
CREATE TABLE IF NOT EXISTS member_qr_codes (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  code_value VARCHAR(500) UNIQUE NOT NULL, -- Encoded data
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. FINANCE & DONATIONS
-- ============================================

-- Donation campaigns (special offerings, building projects, etc.)
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  campaign_name VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  goal_amount DECIMAL(12, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  donor_id INTEGER REFERENCES members(id) ON DELETE SET NULL, -- NULL for anonymous
  donor_name VARCHAR(200), -- For non-members or anonymous
  donor_email VARCHAR(255),
  donation_type VARCHAR(50) CHECK (donation_type IN ('one_time', 'recurring', 'pledge', 'campaign')),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GHS',
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'check', 'bank_transfer', 'mobile_money', 'credit_card', 'online'
  payment_reference VARCHAR(200), -- Transaction ID
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  is_tax_deductible BOOLEAN DEFAULT TRUE,
  receipt_sent BOOLEAN DEFAULT FALSE,
  receipt_sent_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  donation_date DATE NOT NULL,
  recorded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pledges
CREATE TABLE IF NOT EXISTS pledges (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  pledge_amount DECIMAL(12, 2) NOT NULL,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'one_time')),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'paused')),
  total_given DECIMAL(12, 2) DEFAULT 0,
  balance DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  category_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  budget_allocation DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  category_id INTEGER NOT NULL REFERENCES expense_categories(id),
  expense_description VARCHAR(500) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GHS',
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50),
  receipt_url TEXT, -- Scanned receipt or photo
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. EVENTS & VOLUNTEERS
-- ============================================

-- Events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  event_title VARCHAR(300) NOT NULL,
  event_description TEXT,
  event_type VARCHAR(100),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(300),
  is_public BOOLEAN DEFAULT TRUE,
  max_attendees INTEGER,
  registration_required BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Volunteer teams
CREATE TABLE IF NOT EXISTS volunteer_teams (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  team_name VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  leader_id INTEGER REFERENCES members(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Volunteer assignments (members can be on multiple teams)
CREATE TABLE IF NOT EXISTS volunteer_assignments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES volunteer_teams(id) ON DELETE CASCADE,
  role VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, team_id)
);

-- ============================================
-- 6. BULK SMS & COMMUNICATIONS
-- ============================================

-- SMS templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  template_name VARCHAR(200) NOT NULL,
  template_content TEXT NOT NULL,
  category VARCHAR(100), -- 'general', 'follow_up', 'event', 'birthday', 'anniversary'
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS campaigns (bulk sends)
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  campaign_name VARCHAR(200) NOT NULL,
  template_id INTEGER REFERENCES sms_templates(id),
  sender_name VARCHAR(50), -- Sender ID
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS recipients (who received what)
CREATE TABLE IF NOT EXISTS sms_recipients (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  phone_number VARCHAR(20), -- Non-member contact
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opted_out')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  UNIQUE(campaign_id, member_id, phone_number)
);

-- ============================================
-- 7. EQUIPMENT & INVENTORY
-- ============================================

-- Equipment/inventory items
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  equipment_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'audio', 'video', 'lighting', 'furniture', 'other'
  model VARCHAR(200),
  serial_number VARCHAR(200) UNIQUE,
  asset_tag VARCHAR(100) UNIQUE,
  purchase_date DATE,
  purchase_price DECIMAL(12, 2),
  current_value DECIMAL(12, 2),
  condition VARCHAR(50) DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'out_of_service')),
  location VARCHAR(200),
  assigned_to INTEGER REFERENCES members(id) ON DELETE SET NULL, -- Who is responsible
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment maintenance logs
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(100), -- 'routine', 'repair', 'inspection'
  description TEXT NOT NULL,
  performed_by VARCHAR(200),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cost DECIMAL(12, 2),
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. CLUSTER FOLLOW-UP & CARE
-- ============================================

-- Clusters (small groups/areas of responsibility)
CREATE TABLE IF NOT EXISTS clusters (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  cluster_name VARCHAR(200) NOT NULL,
  description TEXT,
  leader_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  deputy_leader_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  meeting_day VARCHAR(50),
  meeting_time TIME,
  meeting_location VARCHAR(300),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cluster members (many-to-many)
CREATE TABLE IF NOT EXISTS cluster_members (
  id SERIAL PRIMARY KEY,
  cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(cluster_id, member_id)
);

-- Follow-up tasks/visits
CREATE TABLE IF NOT EXISTS follow_ups (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  follow_up_type VARCHAR(100) NOT NULL, -- 'visit', 'phone_call', 'email', 'sms', 'prayer', 'counseling'
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject VARCHAR(300) NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  scheduled_for DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prayer requests (submitted by members/visitors)
CREATE TABLE IF NOT EXISTS prayer_requests (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL, -- NULL for visitor/guest
  requester_name VARCHAR(200),
  requester_email VARCHAR(255),
  request_text TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE, -- Private means only leaders see it
  category VARCHAR(100),
  assigned_to INTEGER REFERENCES users(id), -- Leader assigned to follow up
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'responded', 'closed')),
  response_text TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. ANNOUNCEMENTS & COMMUNICATIONS
-- ============================================

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(100), -- 'general', 'event', 'urgent', 'ministry'
  target_audience JSON, -- Array of roles or 'all'
  priority INTEGER DEFAULT 0, -- 0=normal, 1=important, 2=urgent
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. SYSTEM & AUDIT
-- ============================================

-- Audit log (track all important actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'export'
  resource_type VARCHAR(100), -- 'member', 'donation', 'attendance', etc.
  resource_id INTEGER, -- ID of affected record
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(200) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 11. FAMILIES (Enhanced)
-- ============================================

ALTER TABLE families ADD COLUMN IF NOT EXISTS family_type VARCHAR(50) DEFAULT 'nuclear' CHECK (family_type IN ('nuclear', 'extended', 'single_parent', 'blended', 'individual'));
ALTER TABLE families ADD COLUMN IF NOT EXISTS home_phone VARCHAR(20);
ALTER TABLE families ADD COLUMN IF NOT EXISTS wedding_anniversary DATE;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Members
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_ministry ON members(ministry);
CREATE INDEX IF NOT EXISTS idx_members_family ON members(family_id);
CREATE INDEX IF NOT EXISTS idx_members_last_seen ON members(last_seen);

-- Attendance
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_service ON attendance(service_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checkin ON attendance(check_in_time);

-- Donations
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- ============================================
-- INITIAL SEED DATA
-- ============================================

-- Default admin user (password: Admin@2024! - change immediately)
INSERT INTO users (email, password_hash, first_name, last_name, role, phone) VALUES
  ('admin@redemptionpresby.org', '$2b$10$YourHashedPasswordHere', 'Administrator', 'System', 'Super Admin', '+233123456789')
ON CONFLICT (email) DO NOTHING;

-- Default roles data
INSERT INTO expense_categories (category_name, description) VALUES
  ('General Operations', 'Day-to-day church operations'),
  ('Missions', 'Local and international mission work'),
  ('Ministry', 'Children, youth, and adult ministries'),
  ('Building & Maintenance', 'Facility upkeep and improvements'),
  ('Utilities', 'Electricity, water, internet'),
  ('Staff Salaries', 'Pastoral and staff compensation'),
  ('Outreach', 'Community outreach programs'),
  ('Miscellaneous', 'Other expenses')
ON CONFLICT (category_name) DO NOTHING;

-- Default services
INSERT INTO services (service_name, service_day, service_time, duration_minutes) VALUES
  ('Sunday Celebration Service', 'Sunday', '09:00', 120),
  ('Wednesday Bible Study', 'Wednesday', '18:30', 90),
  ('Prayer Meeting', 'Friday', '06:00', 60),
  ('Youth Service', 'Saturday', '16:00', 120)
ON CONFLICT DO NOTHING;

-- Default volunteer teams
INSERT INTO volunteer_teams (team_name, description) VALUES
  ('Worship & Production', 'Lead worship and manage audio/visual'),
  ('Ushering', 'Greet and seat attendees'),
  ('Children Ministry', ' care for children during services'),
  ('Youth Ministry', 'Engage youth activities'),
  ('Outreach', 'Community outreach programs'),
  ('Prayer Team', 'Prayer ministry support')
ON CONFLICT DO NOTHING;

-- Settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('church_name', 'Redemption Presbyterian Church', 'Church display name'),
  ('church_address', '123 Main Street, Accra, Ghana', 'Church physical address'),
  ('church_phone', '+233302345678', 'Main contact number'),
  ('church_email', 'info@redemptionpresby.org', 'Main email'),
  ('timezone', 'Africa/Accra', 'Church timezone'),
  ('currency', 'GHS', 'Default currency'),
  ('attendance_reminder_enabled', 'true', 'Enable absence notifications')
ON CONFLICT (setting_key) DO NOTHING;
