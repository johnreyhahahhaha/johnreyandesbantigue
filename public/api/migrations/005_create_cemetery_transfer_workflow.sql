-- Track cemetery transfer requests and their approval/completion lifecycle.
CREATE TABLE IF NOT EXISTS cemetery_transfers (
    transfer_id INT(11) NOT NULL AUTO_INCREMENT,
    contract_id INT(11) NOT NULL,
    deceased_id INT(11) DEFAULT NULL,
    original_struct_id INT(11) DEFAULT NULL,
    destination_struct_id INT(11) DEFAULT NULL,
    destination_location VARCHAR(150) DEFAULT NULL,
    reason ENUM('Expired Lease', 'Family Request', 'Transfer') NOT NULL DEFAULT 'Expired Lease',
    status ENUM('Pending', 'Approved', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
    requested_by INT(11) DEFAULT NULL,
    approved_by INT(11) DEFAULT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    PRIMARY KEY (transfer_id),
    KEY idx_cemetery_transfers_contract (contract_id),
    KEY idx_cemetery_transfers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
