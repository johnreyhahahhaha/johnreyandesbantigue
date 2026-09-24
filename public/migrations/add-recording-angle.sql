ALTER TABLE livestream_recordings
    ADD COLUMN recording_angle VARCHAR(50) NULL AFTER recording_url;