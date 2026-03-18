-- Fase 5 Batch 2: Invoice reminder tracking fields on jobs table
-- Invoice data lives on the jobs table (no separate invoices table)

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS reminder_1_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS reminder_2_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS reminder_3_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS auto_reminders_enabled boolean NOT NULL DEFAULT true;

-- Index for finding overdue unpaid invoices efficiently
CREATE INDEX IF NOT EXISTS idx_jobs_overdue_invoices
  ON jobs (invoice_sent_at)
  WHERE status = 'invoiced' AND paid_at IS NULL AND auto_reminders_enabled = true;
