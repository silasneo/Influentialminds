-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'CONTENT_EDITOR') NOT NULL DEFAULT 'CONTENT_EDITOR',
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `name` VARCHAR(160) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `tier` ENUM('ANONYMOUS', 'REGISTERED', 'SUBSCRIBER') NOT NULL DEFAULT 'REGISTERED',
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `site_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `siteTitle` VARCHAR(160) NOT NULL,
    `tagline` VARCHAR(240) NOT NULL,
    `heroEyebrow` VARCHAR(240) NOT NULL,
    `heroDeck` TEXT NOT NULL,
    `heroBody` TEXT NOT NULL,
    `heroImageUrl` VARCHAR(1024) NOT NULL,
    `hostName` VARCHAR(160) NOT NULL,
    `hostRole` VARCHAR(200) NOT NULL,
    `hostPortraitUrl` VARCHAR(1024) NOT NULL,
    `hostBio` TEXT NOT NULL,
    `hostQuote` TEXT NULL,
    `hostLongBio` LONGTEXT NULL,
    `youtubePlaylistUrl` VARCHAR(1024) NULL,
    `newsletterHeading` VARCHAR(240) NOT NULL,
    `newsletterBody` TEXT NOT NULL,
    `metaDescription` VARCHAR(400) NOT NULL,
    `askSuggestions` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `episodes` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(240) NOT NULL,
    `episodeNumber` INTEGER NULL,
    `season` INTEGER NULL,
    `description` TEXT NULL,
    `summary` LONGTEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `durationSeconds` INTEGER NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `youtubeVideoId` VARCHAR(20) NOT NULL,
    `youtubeUrl` VARCHAR(1024) NOT NULL,
    `youtubePlaylistId` VARCHAR(64) NULL,
    `thumbnailUrl` VARCHAR(1024) NOT NULL,
    `spotifyUrl` VARCHAR(1024) NULL,
    `applePodcastsUrl` VARCHAR(1024) NULL,
    `lipsyncTracks` JSON NOT NULL,
    `seoTitle` VARCHAR(240) NULL,
    `seoDescription` VARCHAR(400) NULL,
    `ogImageUrl` VARCHAR(1024) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `episodes_slug_key`(`slug`),
    INDEX `episodes_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `episodes_youtubeVideoId_idx`(`youtubeVideoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guests` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `role` VARCHAR(160) NULL,
    `company` VARCHAR(160) NULL,
    `bio` LONGTEXT NULL,
    `headshotUrl` VARCHAR(1024) NULL,
    `websiteUrl` VARCHAR(1024) NULL,
    `expertise` JSON NOT NULL,
    `socialLinks` JSON NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `seoTitle` VARCHAR(240) NULL,
    `seoDescription` VARCHAR(400) NULL,
    `ogImageUrl` VARCHAR(1024) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `guests_slug_key`(`slug`),
    INDEX `guests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topics` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `imageUrl` VARCHAR(1024) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `seoTitle` VARCHAR(240) NULL,
    `seoDescription` VARCHAR(400) NULL,
    `ogImageUrl` VARCHAR(1024) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `topics_slug_key`(`slug`),
    INDEX `topics_featured_sortOrder_idx`(`featured`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collections` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `curatorNote` TEXT NULL,
    `coverUrl` VARCHAR(1024) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `seoTitle` VARCHAR(240) NULL,
    `seoDescription` VARCHAR(400) NULL,
    `ogImageUrl` VARCHAR(1024) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `collections_slug_key`(`slug`),
    INDEX `collections_featured_sortOrder_idx`(`featured`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `episode_guests` (
    `episodeId` VARCHAR(191) NOT NULL,
    `guestId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `episode_guests_guestId_idx`(`guestId`),
    PRIMARY KEY (`episodeId`, `guestId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `episode_topics` (
    `episodeId` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,

    INDEX `episode_topics_topicId_idx`(`topicId`),
    PRIMARY KEY (`episodeId`, `topicId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_episodes` (
    `collectionId` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `collection_episodes_episodeId_idx`(`episodeId`),
    PRIMARY KEY (`collectionId`, `episodeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `takeaways` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `takeaways_episodeId_sortOrder_idx`(`episodeId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotes` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `attribution` VARCHAR(160) NULL,
    `timestampSeconds` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `quotes_episodeId_sortOrder_idx`(`episodeId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transcripts` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `language` VARCHAR(12) NOT NULL DEFAULT 'en',
    `sourceFileName` VARCHAR(260) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `indexedAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transcripts_episodeId_language_key`(`episodeId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transcript_segments` (
    `id` VARCHAR(191) NOT NULL,
    `transcriptId` VARCHAR(191) NOT NULL,
    `startSeconds` INTEGER NOT NULL,
    `endSeconds` INTEGER NULL,
    `speaker` VARCHAR(120) NULL,
    `text` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `transcript_segments_transcriptId_startSeconds_idx`(`transcriptId`, `startSeconds`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_magnets` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `coverUrl` VARCHAR(1024) NULL,
    `fileUrl` VARCHAR(1024) NULL,
    `fileName` VARCHAR(260) NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `lead_magnets_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `consent` BOOLEAN NOT NULL DEFAULT false,
    `sourcePage` VARCHAR(512) NULL,
    `leadMagnetId` VARCHAR(191) NULL,
    `episodeId` VARCHAR(191) NULL,
    `ipHash` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `leads_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `leads_email_leadMagnetId_key`(`email`, `leadMagnetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_assets` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(260) NOT NULL,
    `storageKey` VARCHAR(512) NOT NULL,
    `url` VARCHAR(1024) NOT NULL,
    `mimeType` VARCHAR(160) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `kind` ENUM('IMAGE', 'DOCUMENT', 'TRANSCRIPT') NOT NULL DEFAULT 'IMAGE',
    `alt` VARCHAR(400) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `media_assets_storageKey_key`(`storageKey`),
    INDEX `media_assets_kind_createdAt_idx`(`kind`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_query_usage` (
    `id` VARCHAR(191) NOT NULL,
    `subjectKey` VARCHAR(80) NOT NULL,
    `tier` ENUM('ANONYMOUS', 'REGISTERED', 'SUBSCRIBER') NOT NULL DEFAULT 'ANONYMOUS',
    `dayBucket` VARCHAR(10) NOT NULL,
    `queryCount` INTEGER NOT NULL DEFAULT 0,
    `lastQueryAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_query_usage_dayBucket_idx`(`dayBucket`),
    UNIQUE INDEX `ai_query_usage_subjectKey_dayBucket_key`(`subjectKey`, `dayBucket`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_query_logs` (
    `id` VARCHAR(191) NOT NULL,
    `questionHash` VARCHAR(64) NOT NULL,
    `question` TEXT NULL,
    `tier` ENUM('ANONYMOUS', 'REGISTERED', 'SUBSCRIBER') NOT NULL DEFAULT 'ANONYMOUS',
    `episodeId` VARCHAR(191) NULL,
    `resultCount` INTEGER NOT NULL DEFAULT 0,
    `noMatch` BOOLEAN NOT NULL DEFAULT false,
    `latencyMs` INTEGER NOT NULL DEFAULT 0,
    `provider` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_query_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorEmail` VARCHAR(254) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(80) NULL,
    `summary` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `episode_guests` ADD CONSTRAINT `episode_guests_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `episode_guests` ADD CONSTRAINT `episode_guests_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `guests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `episode_topics` ADD CONSTRAINT `episode_topics_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `episode_topics` ADD CONSTRAINT `episode_topics_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_episodes` ADD CONSTRAINT `collection_episodes_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `collections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_episodes` ADD CONSTRAINT `collection_episodes_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `takeaways` ADD CONSTRAINT `takeaways_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transcripts` ADD CONSTRAINT `transcripts_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transcript_segments` ADD CONSTRAINT `transcript_segments_transcriptId_fkey` FOREIGN KEY (`transcriptId`) REFERENCES `transcripts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_leadMagnetId_fkey` FOREIGN KEY (`leadMagnetId`) REFERENCES `lead_magnets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

