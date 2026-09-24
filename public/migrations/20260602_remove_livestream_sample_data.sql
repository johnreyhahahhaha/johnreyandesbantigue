-- Migration: remove redundant livestream sample rows
-- Run this if the misplaced sample inserts were already imported into the database.

DELETE FROM `livestream_access_control`
WHERE `access_id` = 1
  AND `livestream_id` = 1
  AND `access_type` = 'Public'
  AND `created_by` = 1;

DELETE FROM `livestream_events`
WHERE `livestream_id` = 1
  AND `event_type` = 'Mass'
  AND `title` = 'Sunday Mass - Test'
  AND `location` = 'Parish Church';
