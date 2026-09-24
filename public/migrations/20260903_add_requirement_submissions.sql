-- Store each person's requirement progress separately from the parish catalog.
    CREATE TABLE IF NOT EXISTS requirement_submissions (
    submission_id INT NOT NULL AUTO_INCREMENT,
    check_id INT NOT NULL,
    person_id INT NOT NULL,
    status ENUM('Pending','Submitted','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    submitted_at DATETIME NULL,
    reviewed_at DATETIME NULL,
    reviewed_by INT NULL,
    notes TEXT NULL,
    PRIMARY KEY (submission_id),
    UNIQUE KEY uq_requirement_person (check_id, person_id),
    KEY idx_requirement_submission_person (person_id),
    CONSTRAINT fk_requirement_submission_check FOREIGN KEY (check_id) REFERENCES requirement_checklists (check_id) ON DELETE CASCADE,
    CONSTRAINT fk_requirement_submission_person FOREIGN KEY (person_id) REFERENCES persons (person_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO requirement_checklists (category, requirement_name)
SELECT 'Baptism', 'Birth Certificate / PSA Certificate' WHERE NOT EXISTS (SELECT 1 FROM requirement_checklists WHERE category='Baptism' AND requirement_name='Birth Certificate / PSA Certificate');
INSERT INTO requirement_checklists (category, requirement_name)
SELECT 'Baptism', 'Parents'' Marriage Certificate' WHERE NOT EXISTS (SELECT 1 FROM requirement_checklists WHERE category='Baptism' AND requirement_name='Parents'' Marriage Certificate');
INSERT INTO requirement_checklists (category, requirement_name)
SELECT 'Baptism', 'List of Godparents' WHERE NOT EXISTS (SELECT 1 FROM requirement_checklists WHERE category='Baptism' AND requirement_name='List of Godparents');
INSERT INTO requirement_checklists (category, requirement_name)
SELECT 'Baptism', 'Godparents'' Valid IDs' WHERE NOT EXISTS (SELECT 1 FROM requirement_checklists WHERE category='Baptism' AND requirement_name='Godparents'' Valid IDs');
INSERT INTO requirement_checklists (category, requirement_name)
SELECT 'Baptism', 'Baptismal Seminar' WHERE NOT EXISTS (SELECT 1 FROM requirement_checklists WHERE category='Baptism' AND requirement_name='Baptismal Seminar');
INSERT INTO requirement_checklists (category, requirement_name)
SELECT 'Baptism', 'Parish Clearance' WHERE NOT EXISTS (SELECT 1 FROM requirement_checklists WHERE category='Baptism' AND requirement_name='Parish Clearance');

INSERT INTO requirement_checklists (category, requirement_name)
SELECT 'Marriage', requirement_name FROM (SELECT 'Baptismal Certificate' requirement_name UNION ALL SELECT 'Confirmation Certificate' UNION ALL SELECT 'Birth Certificate / PSA Certificate' UNION ALL SELECT 'CENOMAR' UNION ALL SELECT 'Marriage License' UNION ALL SELECT 'Marriage Preparation Seminar' UNION ALL SELECT 'Marriage Banns' UNION ALL SELECT 'Valid IDs' UNION ALL SELECT 'List of Witnesses') items
WHERE NOT EXISTS (SELECT 1 FROM requirement_checklists WHERE category='Marriage' AND requirement_name=items.requirement_name);

INSERT INTO requirement_checklists (category, requirement_name)
SELECT 'Confirmation', requirement_name FROM (SELECT 'Baptismal Certificate' requirement_name UNION ALL SELECT 'Confirmation Seminar' UNION ALL SELECT 'Sponsor / Godparent Information' UNION ALL SELECT 'Sponsor / Godparent Valid ID' UNION ALL SELECT 'Valid ID' UNION ALL SELECT 'Parish Clearance') items
WHERE NOT EXISTS (SELECT 1 FROM requirement_checklists WHERE category='Confirmation' AND requirement_name=items.requirement_name);