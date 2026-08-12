-- Teams: shared subscriptions, shared projects, and a record of who did what.
--
-- A user belongs to at most one team, enforced by the UNIQUE on team_members.userId
-- rather than by hoping the code never inserts twice. With multiple memberships,
-- every query about "my projects" would have to ask which team was meant.
--
-- Total seats are seatsIncluded + seatsPurchased. Pending invitations count against
-- them, or a three-seat team could invite ten people and the limit would be
-- decoration.

CREATE TABLE IF NOT EXISTS `teams` (
  `id` SERIAL PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  -- One billing owner, always. A column rather than a role, so deleting the last
  -- admin cannot leave a team with nobody able to pay for it.
  `ownerUserId` BIGINT UNSIGNED NOT NULL,
  `seatsIncluded` INT NOT NULL DEFAULT 3,
  `seatsPurchased` INT NOT NULL DEFAULT 0,
  -- Logo, colours and intro/outro defaults. JSON because nothing queries inside it.
  `brandKit` JSON,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `teams_owner_idx` (`ownerUserId`)
);

CREATE TABLE IF NOT EXISTS `team_members` (
  `id` SERIAL PRIMARY KEY,
  `teamId` BIGINT UNSIGNED NOT NULL,
  -- UNIQUE is the "one team per person" rule, enforced by the database.
  `userId` BIGINT UNSIGNED NOT NULL UNIQUE,
  `role` ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
  `joinedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `team_members_team_idx` (`teamId`)
);

CREATE TABLE IF NOT EXISTS `team_invites` (
  `id` SERIAL PRIMARY KEY,
  `teamId` BIGINT UNSIGNED NOT NULL,
  -- By email, because the person invited usually has no account yet.
  `email` VARCHAR(320) NOT NULL,
  `role` ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  -- What the accept link carries, so it is random and long.
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `invitedBy` BIGINT UNSIGNED NOT NULL,
  -- Expiry stops an abandoned invitation holding a seat forever.
  `expiresAt` TIMESTAMP NOT NULL,
  `acceptedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `team_invites_team_idx` (`teamId`, `acceptedAt`)
);

-- Who did what. Sold as a Team feature, but it exists because admin impersonation
-- mints a session as any user and previously left no trace at all. teamId is NULL
-- for platform events such as that one.
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` SERIAL PRIMARY KEY,
  `teamId` BIGINT UNSIGNED NULL,
  `actorUserId` BIGINT UNSIGNED NULL,
  `action` VARCHAR(64) NOT NULL,
  `targetType` VARCHAR(32) NULL,
  `targetId` VARCHAR(64) NULL,
  `metadata` JSON,
  `ip` VARCHAR(64) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `audit_team_idx` (`teamId`, `id`),
  INDEX `audit_action_idx` (`action`, `id`)
);

-- The shared library. NULL means a personal project, which is what every existing
-- row becomes, so nothing that exists today is suddenly shared with anyone.
ALTER TABLE `projects`
  ADD COLUMN `teamId` BIGINT UNSIGNED NULL AFTER `userId`;

CREATE INDEX `projects_team_idx` ON `projects` (`teamId`, `id`);
