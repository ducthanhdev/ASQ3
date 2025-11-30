-- Add childId column to File table
ALTER TABLE `File` ADD COLUMN `childId` INT NULL;

-- Add foreign key constraint
ALTER TABLE `File` ADD CONSTRAINT `File_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `Child`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX `File_childId_idx` ON `File`(`childId`);

