-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- PROFILES
-- ========================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CUSTOMERS
-- ========================================
CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT NOT NULL,
  address       TEXT NOT NULL,
  city          TEXT NOT NULL,
  zip_code      TEXT NOT NULL,
  lat           DECIMAL(10,8),
  lng           DECIMAL(11,8),
  notes         TEXT,
  source        TEXT CHECK (source IN ('website', 'phone', 'referral', 'manual')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- SERVICES
-- ========================================
CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  unit            TEXT NOT NULL CHECK (unit IN ('m2', 'stk', 'time', 'fast_pris')),
  base_price      DECIMAL(10,2) NOT NULL,
  min_price       DECIMAL(10,2),
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- LEADS
-- ========================================
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT NOT NULL,
  address         TEXT NOT NULL,
  city            TEXT,
  zip_code        TEXT,
  service_type    TEXT,
  estimated_area  DECIMAL(10,2),
  message         TEXT,
  calculated_price DECIMAL(10,2),
  status          TEXT NOT NULL CHECK (status IN (
    'new', 'contacted', 'quote_sent', 'won', 'lost', 'duplicate'
  )) DEFAULT 'new',
  assigned_to     UUID REFERENCES profiles(id),
  converted_customer_id UUID REFERENCES customers(id),
  source          TEXT DEFAULT 'website',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- QUOTES
-- ========================================
CREATE TABLE quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number    TEXT UNIQUE NOT NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  lead_id         UUID REFERENCES leads(id),
  line_items      JSONB NOT NULL DEFAULT '[]',
  subtotal        DECIMAL(10,2) NOT NULL,
  vat_amount      DECIMAL(10,2) NOT NULL,
  total_incl_vat  DECIMAL(10,2) NOT NULL,
  notes           TEXT,
  valid_until     DATE,
  status          TEXT NOT NULL CHECK (status IN (
    'draft', 'sent', 'accepted', 'declined', 'expired'
  )) DEFAULT 'draft',
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  declined_at     TIMESTAMPTZ,
  accept_token    TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- VEHICLES
-- ========================================
CREATE TABLE vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  color         TEXT,
  notes         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- JOBS
-- ========================================
CREATE TABLE jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number       TEXT UNIQUE NOT NULL,
  customer_id      UUID NOT NULL REFERENCES customers(id),
  quote_id         UUID REFERENCES quotes(id),
  scheduled_date   DATE NOT NULL,
  scheduled_time   TIME,
  estimated_duration INTEGER,
  assigned_user_id UUID REFERENCES profiles(id),
  vehicle_id       UUID REFERENCES vehicles(id),
  status           TEXT NOT NULL CHECK (status IN (
    'scheduled', 'en_route', 'arrived', 'in_progress',
    'completed', 'invoiced', 'cancelled'
  )) DEFAULT 'scheduled',
  started_at       TIMESTAMPTZ,
  arrived_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  address          TEXT NOT NULL,
  lat              DECIMAL(10,8),
  lng              DECIMAL(11,8),
  services         JSONB NOT NULL DEFAULT '[]',
  internal_notes   TEXT,
  customer_notes   TEXT,
  invoice_number   TEXT,
  invoice_sent_at  TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- JOB PHOTOS
-- ========================================
CREATE TABLE job_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url   TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('before', 'after', 'misc')),
  caption      TEXT,
  taken_by     UUID REFERENCES profiles(id),
  taken_at     TIMESTAMPTZ DEFAULT NOW(),
  is_portfolio BOOLEAN DEFAULT FALSE,
  service_tag  TEXT
);

-- ========================================
-- EMAIL LOG
-- ========================================
CREATE TABLE email_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL,
  recipient    TEXT NOT NULL,
  subject      TEXT NOT NULL,
  reference_id UUID,
  status       TEXT CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at      TIMESTAMPTZ DEFAULT NOW(),
  resend_id    TEXT
);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Customers (admin sees all, employees read-only)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_admin_all" ON customers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "customers_employee_select" ON customers
  FOR SELECT TO authenticated
  USING (true);

-- Services (everyone reads, admin manages)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select" ON services
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "services_admin_all" ON services
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Leads (admin only)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_admin_all" ON leads
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Quotes (admin only)
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_admin_all" ON quotes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_admin_all" ON jobs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "jobs_employee_own" ON jobs
  FOR SELECT TO authenticated
  USING (assigned_user_id = auth.uid());

CREATE POLICY "jobs_employee_update_status" ON jobs
  FOR UPDATE TO authenticated
  USING (assigned_user_id = auth.uid())
  WITH CHECK (
    assigned_user_id = auth.uid()
    AND status IN ('en_route', 'arrived', 'in_progress', 'completed')
  );

-- Job Photos
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_photos_admin_all" ON job_photos
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "job_photos_employee_own_jobs" ON job_photos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_photos.job_id
      AND jobs.assigned_user_id = auth.uid()
    )
  );

-- Vehicles (everyone reads, admin manages)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_select" ON vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "vehicles_admin_all" ON vehicles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Email Log (admin only)
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_log_admin_all" ON email_log
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- SEED DEFAULT SERVICES
-- ========================================
INSERT INTO services (name, description, unit, base_price, min_price, sort_order) VALUES
  ('Algebehandling', 'Komplet algebehandling af flader', 'm2', 75.00, 500.00, 1),
  ('Vinduespolering', 'Professionel vinduespolering', 'stk', 50.00, 300.00, 2),
  ('Tagrensning', 'Rensning og behandling af tag', 'm2', 120.00, 1500.00, 3),
  ('Rengøring af terrasse', 'Rensning af terrasse og fliser', 'm2', 45.00, 400.00, 4),
  ('Havevedligeholdelse', 'Generel havevedligeholdelse', 'time', 450.00, 450.00, 5);

-- ========================================
-- AUTO-UPDATE updated_at TRIGGER
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- AUTO-CREATE PROFILE ON AUTH SIGNUP
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
