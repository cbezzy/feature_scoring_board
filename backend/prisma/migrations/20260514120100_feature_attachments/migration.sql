-- CreateTable
CREATE TABLE `feature_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `feature_id` INTEGER NOT NULL,
    `object_key` VARCHAR(768) NOT NULL,
    `original_filename` VARCHAR(512) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NOT NULL,
    `uploaded_by_admin_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `feature_attachments_feature_id_idx`(`feature_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `feature_attachments` ADD CONSTRAINT `feature_attachments_feature_id_fkey` FOREIGN KEY (`feature_id`) REFERENCES `feature_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feature_attachments` ADD CONSTRAINT `feature_attachments_uploaded_by_admin_id_fkey` FOREIGN KEY (`uploaded_by_admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
