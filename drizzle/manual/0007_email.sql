-- Email: consent, suppression, and a record of what was sent.
--
-- `marketingEmails` defaults to 0 because an account existing is not consent to be
-- marketed to. Transactional mail (your render finished, your render failed) is not
-- gated on it, because pressing render is the request for that message.
--
-- `unsubscribeToken` is random per user rather than derived from the id, so a link
-- cannot be guessed to unsubscribe somebody else.
ALTER TABLE `users`
  ADD COLUMN `marketingEmails` BOOLEAN NOT NULL DEFAULT 0 AFTER `videosCreatedThisMonth`,
  ADD COLUMN `unsubscribeToken` VARCHAR(40) NULL AFTER `marketingEmails`;

CREATE INDEX `users_unsubscribe_idx` ON `users` (`unsubscribeToken`);

-- Addresses that must never be mailed. Hard bounces land here automatically.
-- Retrying a dead address every campaign is what ruins a sending reputation.
CREATE TABLE IF NOT EXISTS `email_suppressions` (
  `email` VARCHAR(320) NOT NULL PRIMARY KEY,
  `reason` VARCHAR(255) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns, kept as a record so there is an answer to "what did we send".
CREATE TABLE IF NOT EXISTS `email_campaigns` (
  `id` SERIAL PRIMARY KEY,
  `subject` VARCHAR(200) NOT NULL,
  `body` TEXT NOT NULL,
  `status` ENUM('draft', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'draft',
  `recipientCount` INT NOT NULL DEFAULT 0,
  `sentCount` INT NOT NULL DEFAULT 0,
  `failedCount` INT NOT NULL DEFAULT 0,
  `createdBy` BIGINT UNSIGNED NULL,
  `sentAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `email_campaigns_status_idx` (`status`, `id`)
);
