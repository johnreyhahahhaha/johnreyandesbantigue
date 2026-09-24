-- Add an explicit review state before any cemetery transfer or common-grave action.
ALTER TABLE cemetery_contracts
    MODIFY COLUMN status ENUM('Active', 'Expired', 'For Transfer', 'Transferred') NOT NULL DEFAULT 'Active';
        