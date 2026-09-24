CREATE TABLE IF NOT EXISTS sacrament_applications (
    application_id INT NOT NULL AUTO_INCREMENT,
    person_id INT NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    category ENUM('Baptism', 'Marriage', 'Confirmation') NOT NULL,
    purpose TEXT NULL,
    status ENUM('Pending', 'Processing', 'Approved', 'Rejected', 'Completed') NOT NULL DEFAULT 'Pending',
    application_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_user_id INT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    notes TEXT NULL,
    PRIMARY KEY (application_id),
    KEY idx_sacrament_applications_person (person_id),
    KEY idx_sacrament_applications_category (category),
    CONSTRAINT fk_sacrament_applications_person FOREIGN KEY (person_id) REFERENCES persons (person_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO sacrament_applications (person_id, applicant_name, category, purpose, status, application_date)
SELECT person_id, requester_name,
       CASE document_type
           WHEN 'Baptism Application' THEN 'Baptism'
           WHEN 'Marriage Application' THEN 'Marriage'
           WHEN 'Confirmation Application' THEN 'Confirmation'
       END,
       purpose,
       CASE status
           WHEN 'Processing' THEN 'Processing'
           WHEN 'Approved' THEN 'Approved'
           WHEN 'Rejected' THEN 'Rejected'
           WHEN 'Ready for Pickup' THEN 'Approved'
           WHEN 'Released' THEN 'Completed'
           ELSE 'Pending'
       END,
       request_date
FROM document_requests
WHERE document_type IN ('Baptism Application', 'Marriage Application', 'Confirmation Application')
  AND NOT EXISTS (
      SELECT 1 FROM sacrament_applications sa
      WHERE sa.person_id = document_requests.person_id
        AND sa.category = CASE document_requests.document_type
            WHEN 'Baptism Application' THEN 'Baptism'
            WHEN 'Marriage Application' THEN 'Marriage'
            WHEN 'Confirmation Application' THEN 'Confirmation'
        END
        AND sa.purpose = document_requests.purpose
        AND sa.application_date = document_requests.request_date
  );

DELETE FROM document_requests
WHERE document_type IN ('Baptism Application', 'Marriage Application', 'Confirmation Application');
