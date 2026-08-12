-- Settings an admin changes from the dashboard instead of by deploying.
--
-- Key and value, so adding a setting never needs another migration.
-- `api/lib/appSettings.ts` owns the shape, the defaults and the validation; a row
-- here is only storage, and an unrecognised key is ignored on read.
--
-- Seeds the two decisions already made: a free allowance of 6 videos a month, and
-- the 4x launch promotion that makes it 24.
CREATE TABLE IF NOT EXISTS `app_settings` (
  `key` VARCHAR(64) NOT NULL PRIMARY KEY,
  `value` JSON,
  `updatedBy` BIGINT UNSIGNED NULL,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO `app_settings` (`key`, `value`) VALUES
  ('freeVideosPerMonth', '6'),
  ('promoMultiplier', '4'),
  ('promoLabel', '"Launch offer: 4x free videos"')
ON DUPLICATE KEY UPDATE `key` = `key`;
