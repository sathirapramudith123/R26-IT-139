-- Token revocation (backend/src/utils/tokenVersion.js)
-- Every login token carries the user's token_version; raising the number signs the user
-- out on every device. Only ADDS a column — existing rows keep all their data (value 0).
-- Safe to run more than once.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
