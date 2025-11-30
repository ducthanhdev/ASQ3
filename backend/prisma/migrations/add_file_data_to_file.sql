-- Add fileData column to File table to store file binary data
ALTER TABLE `File` ADD COLUMN `fileData` LONGBLOB NULL;

-- Make storagePath nullable since we're moving to database storage
ALTER TABLE `File` MODIFY COLUMN `storagePath` VARCHAR(191) NULL;

-- Add index for better query performance (if needed)
-- Note: Can't index BLOB columns, so we skip indexing fileData

