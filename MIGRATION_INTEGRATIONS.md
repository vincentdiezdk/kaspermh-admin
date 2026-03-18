# KasperMH Admin — Database Migration: Integrations

Denne migration tilføjer kolonner som er nødvendige for integrationerne (Resend email, Dinero, Website leads).

## Status

Eksisterende tabeller har allerede de nødvendige kolonner:

### `leads` tabel
Allerede oprettet med alle nødvendige kolonner:
- `source` — TEXT DEFAULT 'website' ✅
- `estimated_area` — DECIMAL(10,2) ✅ (brugt som `area_m2` i webhook)
- `calculated_price` — DECIMAL(10,2) ✅ (brugt som `estimated_price` i webhook)

### `email_log` tabel
Allerede oprettet med alle nødvendige kolonner:
- `type` — TEXT NOT NULL ✅ (bruges som template_type: 'quote', 'job_confirmation', 'job_report', 'invoice', 'admin_notification')
- `recipient` — TEXT NOT NULL ✅ (bruges som to_email)
- `reference_id` — UUID ✅ (bruges som related_id — job_id, quote_id, eller lead_id)
- `resend_id` — TEXT ✅
- `status` — TEXT CHECK ('sent', 'failed', 'bounced') ✅

### `jobs` tabel
- `total_amount` — kolonne mangler muligvis. Kør følgende SQL hvis den ikke findes:

## SQL (kør kun hvis nødvendigt)

```sql
-- Tilføj total_amount til jobs hvis den ikke allerede findes
-- Denne kolonne bruges til at gemme det samlede beløb for reporting og Dinero-sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE jobs ADD COLUMN total_amount DECIMAL(10,2);
  END IF;
END $$;
```

## Kolonnemapping: Webhook → Database

| Webhook felt | Database kolonne | Tabel |
|---|---|---|
| `name` | `full_name` | leads |
| `email` | `email` | leads |
| `phone` | `phone` | leads |
| `address` | `address` | leads |
| `service` | `service_type` | leads |
| `area_m2` | `estimated_area` | leads |
| `estimated_price` | `calculated_price` | leads |
| `message` | `message` | leads |
| `source` | `source` | leads |

## Email Log Template Types

| Template type | Beskrivelse | Trigger |
|---|---|---|
| `quote` | Tilbud sendt til kunde | Quote status → 'sent' |
| `job_confirmation` | Jobbekræftelse | Job oprettet / Quote accepteret |
| `job_report` | Jobraport med fotos | Job status → 'completed' |
| `invoice` | Faktura | Invoice genereret |
| `admin_notification` | Intern notifikation | Nyt lead / Quote accepteret |

## RLS Policies

Webhook-endpointet bruger `SUPABASE_SERVICE_ROLE_KEY` som bypasser RLS.
Ingen nye RLS policies er nødvendige.
