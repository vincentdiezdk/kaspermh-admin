# Fase 4 — Database Migration SQL

Run this SQL in the Supabase SQL Editor (https://supabase.com/dashboard/project/nmfyyudgfkuzyuklmtfv/sql).

## 1. Company Settings Table

```sql
-- Company settings table for storing business information
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'KasperMH Haveservice',
  address text DEFAULT '',
  postal_code text DEFAULT '',
  city text DEFAULT '',
  cvr text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  logo_url text DEFAULT '',
  mobilepay_number text DEFAULT '',
  bank_reg text DEFAULT '',
  bank_account text DEFAULT '',
  default_quote_validity_days integer DEFAULT 14,
  default_quote_notes text DEFAULT '',
  invoice_reminder_days integer DEFAULT 7,
  invoice_due_days integer DEFAULT 14,
  updated_at timestamptz DEFAULT now()
);

-- Insert default row
INSERT INTO company_settings (company_name) VALUES ('KasperMH Haveservice');

-- RLS policies
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read company_settings"
  ON company_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update company_settings"
  ON company_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

## 2. Indexes for Report Queries

```sql
-- Indexes to speed up report queries
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_paid_at ON jobs (paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);
```

## 3. Storage Bucket for Company Assets

```sql
-- Create storage bucket for company assets (logo, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read company assets
CREATE POLICY "Public read access for company-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

-- Allow admins to upload company assets
CREATE POLICY "Admins can upload company-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update company-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

## 4. Ensure profiles table has role and is_active columns

```sql
-- Add role column if not exists (may already exist)
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
EXCEPTION WHEN others THEN NULL;
END $$;
```

## 5. Add total_amount to jobs if not exists

```sql
-- Add total_amount column for easier report queries
DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Backfill total_amount from services JSON for existing jobs
UPDATE jobs
SET total_amount = (
  SELECT COALESCE(SUM((item->>'line_total')::numeric), 0)
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(services::jsonb) = 'array' THEN services::jsonb
      ELSE '[]'::jsonb
    END
  ) AS item
)
WHERE total_amount = 0 OR total_amount IS NULL;
```
