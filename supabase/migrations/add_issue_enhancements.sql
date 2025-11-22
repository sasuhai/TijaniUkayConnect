-- Add priority and photo_url columns to issues table

-- Add priority column with default value
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical'));

-- Add photo_url column for issue photos
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update existing rows to have Medium priority if null
UPDATE issues SET priority = 'Medium' WHERE priority IS NULL;
