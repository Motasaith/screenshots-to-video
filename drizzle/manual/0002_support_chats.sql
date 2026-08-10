-- Support widget conversations for signed-in users.
--
-- One row per conversation; the newest row for a user is the active one, so
-- "New chat" is an insert and the previous thread stays recoverable.
--
-- `messages` holds the transcript as JSON. Attachments are not stored: an image
-- arrives as a multi-megabyte base64 data URI and a voice note as a blob URL
-- that is meaningless outside the tab that made it, so both are recorded as
-- flags inside the JSON instead.
CREATE TABLE IF NOT EXISTS `support_chats` (
  `id` SERIAL PRIMARY KEY,
  `userId` BIGINT UNSIGNED NOT NULL,
  `messages` JSON,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Every read is "newest conversation for this user", which is exactly this
  -- index walked backwards.
  INDEX `support_chats_user_idx` (`userId`, `id`)
);
