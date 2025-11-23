-- Add banner1 column to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS banner1 TEXT;
