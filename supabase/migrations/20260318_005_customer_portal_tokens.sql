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
