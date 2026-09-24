-- Migration: Create event_attendance table for RSVP tracking
-- This table tracks which persons are attending which events

CREATE TABLE IF NOT EXISTS `event_attendance` (
    `attendance_id` INT AUTO_INCREMENT PRIMARY KEY,
    `person_id` INT NOT NULL,
    `schedule_id` INT NOT NULL,
    `status` ENUM('attending', 'not_attending', 'maybe') DEFAULT 'maybe',
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT `fk_attendance_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_attendance_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `parish_schedules` (`schedule_id`) ON DELETE CASCADE,
    
    -- Unique constraint: one RSVP per person per event
    UNIQUE KEY `unique_person_schedule` (`person_id`, `schedule_id`),
    
    -- Indexes for faster queries
    INDEX `idx_person_id` (`person_id`),
    INDEX `idx_schedule_id` (`schedule_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
);

-- If the table already exists, this will not cause an error due to IF NOT EXISTS
-- To manually verify the table exists, run: DESCRIBE event_attendance;
-- To see all RSVPs for a schedule: SELECT * FROM event_attendance WHERE schedule_id = X;
-- To see attendance count: SELECT COUNT(*) FROM event_attendance WHERE schedule_id = X AND status = 'attending';
