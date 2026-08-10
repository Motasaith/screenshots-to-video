-- Requests to talk to a person, raised from the support widget.
--
-- `userId` is nullable because a visitor with no account can raise one; `email`
-- is required so there is always some way to reply.
--
-- `transcript` snapshots the chat at the moment the ticket was raised, so an
-- admin sees what the assistant already tried. `replies` holds the back and
-- forth afterwards, kept on the ticket so an answer survives the customer
-- starting a new chat or closing the tab.
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` SERIAL PRIMARY KEY,
  `userId` BIGINT UNSIGNED NULL,
  `email` VARCHAR(320) NOT NULL,
  `name` VARCHAR(255) NULL,
  `subject` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `transcript` JSON,
  `pageUrl` VARCHAR(500) NULL,
  `accountSummary` TEXT NULL,
  `status` ENUM('open', 'in_progress', 'waiting', 'resolved') NOT NULL DEFAULT 'open',
  `replies` JSON,
  `internalNote` TEXT NULL,
  `unreadForCustomer` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- The admin queue is "open tickets, newest first".
  INDEX `support_tickets_status_idx` (`status`, `id`),
  -- The widget asks "any replies for me?" on open.
  INDEX `support_tickets_user_idx` (`userId`, `id`)
);
