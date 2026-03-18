-- Full-Text Search vectors for global search
-- customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('danish',
    coalesce(full_name, '') || ' ' ||
    coalesce(address, '') || ' ' ||
    coalesce(phone, '') || ' ' ||
    coalesce(email, '')
  )
) STORED;

CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING GIN(search_vector);

-- leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('danish',
    coalesce(full_name, '') || ' ' ||
    coalesce(address, '') || ' ' ||
    coalesce(phone, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(service_type, '')
  )
) STORED;

CREATE INDEX IF NOT EXISTS idx_leads_search ON leads USING GIN(search_vector);
