-- Enable RLS on video_albums if not already enabled
ALTER TABLE video_albums ENABLE ROW LEVEL SECURITY;

-- Allow public read access to video_albums
CREATE POLICY "Public Read Access" ON video_albums
FOR SELECT
USING (true);
