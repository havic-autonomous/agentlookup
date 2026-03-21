-- Migration: Add key_last_chars to api_keys table for better key identification
-- Date: 2026-03-21

-- Add the new column
ALTER TABLE api_keys ADD COLUMN key_last_chars TEXT;

-- Note: Existing keys won't have last_chars populated since we don't store the plaintext
-- New keys will have this field populated