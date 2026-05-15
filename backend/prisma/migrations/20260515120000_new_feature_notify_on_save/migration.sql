-- AlterTable
ALTER TABLE `feature_requests` ADD COLUMN `new_feature_notify_sent` BOOLEAN NOT NULL DEFAULT false;

-- Do not email legacy rows on their next save
UPDATE `feature_requests` SET `new_feature_notify_sent` = true;
