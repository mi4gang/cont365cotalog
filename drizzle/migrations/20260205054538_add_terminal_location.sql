-- Add terminalLocation column to containers table
ALTER TABLE containers ADD COLUMN terminalLocation VARCHAR(128) NULL AFTER description;
