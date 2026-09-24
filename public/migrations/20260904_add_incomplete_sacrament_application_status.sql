ALTER TABLE sacrament_applications
    MODIFY status ENUM('Pending', 'Processing', 'Incomplete', 'Approved', 'Rejected', 'Completed') NOT NULL DEFAULT 'Pending';  