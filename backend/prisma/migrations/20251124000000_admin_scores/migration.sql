-- AlterTable
ALTER TABLE `feature_score_answers`
  ADD COLUMN `admin_id` INTEGER NULL;

-- DropIndex
DROP INDEX `feature_score_answers_featureId_questionId_key` ON `feature_score_answers`;

-- CreateIndex
CREATE UNIQUE INDEX `feature_score_answers_featureId_questionId_admin_id_key`
  ON `feature_score_answers`(`featureId`, `questionId`, `admin_id`);

-- CreateIndex
CREATE INDEX `feature_score_answers_admin_id_idx`
  ON `feature_score_answers`(`admin_id`);

-- AddForeignKey
ALTER TABLE `feature_score_answers`
  ADD CONSTRAINT `feature_score_answers_admin_id_fkey`
  FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

