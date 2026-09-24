-- Add explicit references for document requests and parish schedules.
-- IF NOT EXISTS keeps this safe when a deployment has already added a field.
ALTER TABLE document_requests
  ADD COLUMN IF NOT EXISTS record_type VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS record_id INT NULL;

ALTER TABLE parish_schedules
  ADD COLUMN IF NOT EXISTS related_record_type VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS related_record_id INT NULL;

ALTER TABLE parish_schedules
  ADD INDEX IF NOT EXISTS idx_schedule_related_record (related_record_type, related_record_id);