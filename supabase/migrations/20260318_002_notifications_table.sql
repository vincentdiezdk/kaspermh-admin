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
