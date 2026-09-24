-- The record_id column is polymorphic (its target depends on record_type),
-- so it cannot safely have foreign keys to multiple sacrament tables.
ALTER TABLE seminar_attendance
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Present';

UPDATE seminar_attendance
SET status = 'Present'
WHERE status = 'Attended';

UPDATE seminar_attendance
SET status = 'Incomplete'
WHERE status IS NULL OR TRIM(status) = '' OR status NOT IN ('Present', 'Absent', 'Excused', 'Incomplete');

ALTER TABLE seminar_attendance
  MODIFY COLUMN status ENUM('Present','Absent','Excused','Incomplete') NOT NULL DEFAULT 'Present',
  ADD COLUMN attendee_name VARCHAR(255) NULL,
  ADD COLUMN related_record_type VARCHAR(30) NULL,
  ADD COLUMN related_record_id INT NULL,
  ADD COLUMN participant_role VARCHAR(30) NULL;

ALTER TABLE godparents_records
  DROP FOREIGN KEY fk_gp_baptism,
  DROP FOREIGN KEY fk_gp_baptism_final,
  DROP FOREIGN KEY fk_gp_confirmation;

ALTER TABLE godparents_records
  ADD INDEX idx_gp_record_lookup (record_type, record_id);

-- Backfill existing text-based participants so older records also appear in
-- Godparents Records. New records are synchronized by sacraments.php.
INSERT INTO godparents_records (person_id, record_type, record_id, godparent_name)
SELECT b.person_id, 'Baptismal', b.baptism_id, TRIM(b.godparents)
FROM baptismal_records b
WHERE b.godparents IS NOT NULL AND TRIM(b.godparents) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM godparents_records g
    WHERE g.record_type = 'Baptismal' AND g.record_id = b.baptism_id
      AND g.person_id = b.person_id AND g.godparent_name = TRIM(b.godparents)
  );

INSERT INTO godparents_records (person_id, record_type, record_id, godparent_name)
SELECT c.person_id, 'Confirmation', c.confirmation_id, TRIM(c.sponsor_names)
FROM confirmation_records c
WHERE c.sponsor_names IS NOT NULL AND TRIM(c.sponsor_names) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM godparents_records g
    WHERE g.record_type = 'Confirmation' AND g.record_id = c.confirmation_id
      AND g.person_id = c.person_id AND g.godparent_name = TRIM(c.sponsor_names)
  );

INSERT INTO godparents_records (person_id, record_type, record_id, godparent_name)
SELECT m.groom_id, 'Marriage', m.marriage_id, TRIM(m.witnesses)
FROM marriage_records m
WHERE m.witnesses IS NOT NULL AND TRIM(m.witnesses) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM godparents_records g
    WHERE g.record_type = 'Marriage' AND g.record_id = m.marriage_id
      AND g.person_id = m.groom_id AND g.godparent_name = TRIM(m.witnesses)
  )
UNION ALL
SELECT m.bride_id, 'Marriage', m.marriage_id, TRIM(m.witnesses)
FROM marriage_records m
WHERE m.witnesses IS NOT NULL AND TRIM(m.witnesses) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM godparents_records g
    WHERE g.record_type = 'Marriage' AND g.record_id = m.marriage_id
      AND g.person_id = m.bride_id AND g.godparent_name = TRIM(m.witnesses)
  );