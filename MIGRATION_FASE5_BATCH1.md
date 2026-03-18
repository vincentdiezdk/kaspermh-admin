# Fase 5 Batch 1 — Migrations

Kør følgende SQL i Supabase SQL Editor i den viste rækkefølge.

---

## 1. Full-Text Search vectors til global søgning

```sql
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
```

---

## 2. Notifications tabel

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN (
                'new_lead', 'quote_accepted', 'quote_rejected',
                'job_completed', 'payment_overdue', 'payment_received',
                'new_employee', 'system'
              )),
  title       text NOT NULL,
  message     text NOT NULL,
  href        text,
  read        boolean NOT NULL DEFAULT false,
  dismissed   boolean NOT NULL DEFAULT false,
  expires_at  timestamptz DEFAULT now() + interval '30 days',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON notifications FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read)
  WHERE dismissed = false;
```

---

## 3. Aktiver Realtime for notifications

Gå til **Supabase Dashboard → Database → Replication** og aktiver Realtime for `notifications`-tabellen, eller kør:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```
