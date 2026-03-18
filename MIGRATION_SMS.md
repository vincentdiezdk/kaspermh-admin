# SMS Integration — Database Migration

Kør dette SQL i Supabase SQL Editor for at aktivere SMS-præferencer.

## Migration

```sql
-- Add SMS preferences to company_settings
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS sms_preferences jsonb DEFAULT '{
  "job_confirmation": true,
  "en_route": true,
  "job_completed": true,
  "invoice_sent": true,
  "quote_sent": true,
  "payment_reminder": true,
  "job_reminder": true
}'::jsonb;
```

## Hvad det gør

- Tilføjer en `sms_preferences` kolonne til `company_settings` tabellen
- Standardværdi: alle SMS-typer er aktiveret
- Toggles styres fra **Indstillinger → Virksomhed → SMS-beskeder**

## Rollback

```sql
ALTER TABLE company_settings DROP COLUMN IF EXISTS sms_preferences;
```
