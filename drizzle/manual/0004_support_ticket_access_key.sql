-- A per-ticket secret so a visitor with no account can still receive the reply.
--
-- Without this, an anonymous ticket is a dead end: `myTickets` matches on
-- `userId`, so there is nothing for the widget to poll, and email is not
-- configured. The widget keeps the id and key in localStorage and asks for that
-- one ticket. Knowing the key is the only authority needed, which is why it is a
-- UUID and never appears in a URL.
ALTER TABLE `support_tickets`
  ADD COLUMN `accessKey` VARCHAR(64) NULL AFTER `unreadForCustomer`;
