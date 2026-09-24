CREATE TABLE IF NOT EXISTS community_activity_participants (
  participant_id INT NOT NULL AUTO_INCREMENT,
  community_id INT NOT NULL,
  person_id INT NULL,
  attendee_name VARCHAR(255) NULL,
  participant_role VARCHAR(50) NOT NULL DEFAULT 'Participant',
  status ENUM('Registered','Present','Absent','Completed') NOT NULL DEFAULT 'Registered',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (participant_id),
  KEY idx_activity_participants_activity (community_id),
  KEY idx_activity_participants_person (person_id),
  CONSTRAINT fk_activity_participants_activity FOREIGN KEY (community_id)
    REFERENCES community_activities (community_id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_participants_person FOREIGN KEY (person_id)
    REFERENCES persons (person_id) ON DELETE SET NULL
);