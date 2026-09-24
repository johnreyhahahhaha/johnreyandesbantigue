-- Allow multiple person records without an email address.
-- MySQL unique indexes allow multiple NULL values but only one empty string.
ALTER TABLE persons
    MODIFY email VARCHAR(100) NULL DEFAULT NULL;
