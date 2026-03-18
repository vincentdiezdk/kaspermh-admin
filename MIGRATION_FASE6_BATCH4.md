# Migration — Fase 6 Batch 4: Kunde-Portal + Materialesporing

Run the following SQL in your Supabase SQL Editor in order.

---

## 1. Customer Portal Tokens

```sql
CREATE TABLE IF NOT EXISTS customer_portal_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customer_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tokens
CREATE POLICY "Admin manages portal tokens"
  ON customer_portal_tokens FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Public function to validate token and get customer data (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_customer_by_portal_token(p_token text)
RETURNS TABLE(customer_id uuid, customer_name text, customer_email text) AS $$
  SELECT c.id, c.full_name, c.email
  FROM customer_portal_tokens t
  JOIN customers c ON c.id = t.customer_id
  WHERE t.token = p_token
    AND t.expires_at > now()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 2. Materials & Job Materials

```sql
CREATE TABLE IF NOT EXISTS materials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  unit                text NOT NULL DEFAULT 'liter',
  cost_per_unit       decimal(10,2) NOT NULL DEFAULT 0,
  stock_quantity      decimal(10,3) NOT NULL DEFAULT 0,
  low_stock_threshold decimal(10,3),
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_materials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  material_id     uuid NOT NULL REFERENCES materials(id),
  quantity        decimal(10,3) NOT NULL,
  unit_cost       decimal(10,2) NOT NULL,
  total_cost      decimal(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  registered_by   uuid REFERENCES profiles(id),
  registered_at   timestamptz NOT NULL DEFAULT now(),
  notes           text
);

-- RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users see materials"
  ON materials FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manages materials"
  ON materials FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users see own job materials"
  ON job_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND (jobs.assigned_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Users add materials to own jobs"
  ON job_materials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND (jobs.assigned_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- Trigger: reduce stock + notify on low stock
CREATE OR REPLACE FUNCTION reduce_stock_on_material_use()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE materials
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.material_id;

  -- Check low stock and notify admin
  IF (
    SELECT stock_quantity FROM materials WHERE id = NEW.material_id
  ) < COALESCE((
    SELECT low_stock_threshold FROM materials WHERE id = NEW.material_id
  ), 0) THEN
    INSERT INTO notifications (user_id, type, title, message, href)
    SELECT p.id, 'system',
      'Lavt lager: ' || m.name,
      m.name || ' er under minimumsgrænsen (' || COALESCE(m.low_stock_threshold::text, '0') || ' ' || m.unit || ')',
      '/settings/materials'
    FROM materials m, profiles p
    WHERE m.id = NEW.material_id AND p.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reduce_stock
  AFTER INSERT ON job_materials
  FOR EACH ROW EXECUTE FUNCTION reduce_stock_on_material_use();
```
