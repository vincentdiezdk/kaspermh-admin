# Migration — Fase 5 Batch 3: Gentagne Jobs + Ruteplanlægning

Run the following SQL in your Supabase SQL editor or via migration:

```sql
-- ============================================================
-- MODUL 4: Gentagne Jobs (Recurring Templates)
-- ============================================================

CREATE TABLE IF NOT EXISTS recurring_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id      uuid NOT NULL REFERENCES services(id),
  assigned_user_id uuid REFERENCES profiles(id),
  vehicle_id      uuid REFERENCES vehicles(id),
  frequency       text NOT NULL CHECK (frequency IN (
                    'weekly', 'biweekly', 'monthly',
                    'bimonthly', 'quarterly', 'semiannual', 'annual'
                  )),
  day_of_week     int CHECK (day_of_week BETWEEN 0 AND 6),
  preferred_time  time,
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  last_job_date   date,
  next_job_date   date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages templates"
  ON recurring_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add recurring_template_id to jobs table to track which jobs came from a template
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS recurring_template_id uuid REFERENCES recurring_templates(id);

-- Function to calculate next job date
CREATE OR REPLACE FUNCTION calculate_next_job_date(
  p_frequency text,
  p_from_date date
) RETURNS date AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'weekly'     THEN p_from_date + interval '1 week'
    WHEN 'biweekly'   THEN p_from_date + interval '2 weeks'
    WHEN 'monthly'    THEN p_from_date + interval '1 month'
    WHEN 'bimonthly'  THEN p_from_date + interval '2 months'
    WHEN 'quarterly'  THEN p_from_date + interval '3 months'
    WHEN 'semiannual' THEN p_from_date + interval '6 months'
    WHEN 'annual'     THEN p_from_date + interval '1 year'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Note:** Modul 5 (Ruteplanlægning) has no SQL migration — it uses existing tables and the Google Maps API.
