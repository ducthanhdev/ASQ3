-- Migration: Add minDay and maxDay fields to Questionnaire table
-- Date: 2024
-- Description: Adds day precision to age range for questionnaires

ALTER TABLE `Questionnaire`
ADD COLUMN `minDay` INT NOT NULL DEFAULT 0,
ADD COLUMN `maxDay` INT NOT NULL DEFAULT 0;

