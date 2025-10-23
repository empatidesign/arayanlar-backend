-- Add validation fields to reports table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS validity VARCHAR(20) CHECK (validity IN ('valid', 'invalid', 'needs_investigation')),
ADD COLUMN IF NOT EXISTS action_taken VARCHAR(50) CHECK (action_taken IN ('warning_sent', 'content_removed', 'user_suspended', 'user_banned', 'no_action')),
ADD COLUMN IF NOT EXISTS invalid_reason VARCHAR(50) CHECK (invalid_reason IN ('insufficient_evidence', 'false_accusation', 'spam_report', 'misunderstanding', 'resolved_privately'));

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_reports_validity ON reports(validity);
CREATE INDEX IF NOT EXISTS idx_reports_action_taken ON reports(action_taken);