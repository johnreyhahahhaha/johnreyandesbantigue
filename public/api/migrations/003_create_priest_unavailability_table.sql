CREATE TABLE IF NOT EXISTS priest_unavailability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  priest_id INT NOT NULL,
  unavailable_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_priest_unavailability_priest_date (priest_id, unavailable_date),
  KEY idx_priest_unavailability_active (is_active)
);
