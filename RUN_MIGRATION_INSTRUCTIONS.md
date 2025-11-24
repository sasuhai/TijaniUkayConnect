# Database Migration Required

To complete the "Issue Reporting Enhancements" feature, you need to run a database migration to add the `priority` and `photo_url` columns to the `issues` table.

## Option 1: Run via Supabase Dashboard (SQL Editor)

1.  Go to your Supabase Project Dashboard.
2.  Navigate to the **SQL Editor**.
3.  Create a new query.
4.  Copy and paste the following SQL:

```sql
-- Add priority column with default value
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical'));

-- Add photo_url column for issue photos
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update existing rows to have Medium priority if null
UPDATE issues SET priority = 'Medium' WHERE priority IS NULL;

-- Create storage bucket for issue photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to issue photos (or restrict as needed)
CREATE POLICY "Public Access to Issue Photos" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'issue-photos' );

CREATE POLICY "Authenticated Users can Upload Issue Photos" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'issue-photos' AND auth.role() = 'authenticated' );
```

5.  Click **Run**.

## Option 2: Run via Supabase CLI (if configured)

If you are using the Supabase CLI locally:

```bash
supabase db push
```

This will apply the migration file located at `supabase/migrations/add_issue_enhancements.sql`.

## Verification

After running the migration, try to:
1.  Report a new issue with a priority and photo.
2.  View the issue in the Admin Panel > Manage Issues.
