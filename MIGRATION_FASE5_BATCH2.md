# Migration — Fase 5 Batch 2: PDF-Download + Fakturaadvarsler

Kør dette SQL i Supabase SQL Editor.

---

## 1. Fakturarykker-felter på jobs-tabellen

Invoices er gemt på `jobs`-tabellen (der er ingen separat `invoices`-tabel).
Disse felter sporer automatiske rykkere og giver mulighed for at slå dem fra.

```sql
-- Fase 5 Batch 2: Invoice reminder tracking fields on jobs table

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS reminder_1_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS reminder_2_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS reminder_3_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS auto_reminders_enabled boolean NOT NULL DEFAULT true;

-- Index for finding overdue unpaid invoices efficiently
CREATE INDEX IF NOT EXISTS idx_jobs_overdue_invoices
  ON jobs (invoice_sent_at)
  WHERE status = 'invoiced' AND paid_at IS NULL AND auto_reminders_enabled = true;
```

---

## Oversigt

| Modul | Tabel | Ændring |
|-------|-------|---------|
| Fakturaadvarsler | jobs | Tilføjer `reminder_1_sent_at`, `reminder_2_sent_at`, `reminder_3_sent_at` (timestamptz) |
| Fakturaadvarsler | jobs | Tilføjer `auto_reminders_enabled` (boolean, default true) |
| Fakturaadvarsler | jobs | Opretter index `idx_jobs_overdue_invoices` på forfaldne ubetalte fakturaer |
| PDF-Download | — | Ingen database-ændringer (bruger eksisterende tabeller) |

---

## Vercel Cron Job

Tilføj til Vercel-miljøet (Environment Variables):

- `CRON_SECRET` — hemmelig nøgle til at beskytte cron-endpointet

Cron-jobbet kører dagligt kl. 08:00 og sender automatiske rykkere:
- Rykker 1: 7 dage efter forfaldsdato (venlig påmindelse)
- Rykker 2: 14 dage efter forfaldsdato (mere bestemt)
- Rykker 3: 30 dage efter forfaldsdato (nævner inkasso)
