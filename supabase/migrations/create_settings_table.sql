-- Create settings table for app configuration
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name TEXT NOT NULL DEFAULT 'Tijani Ukay Connect',
    version TEXT NOT NULL DEFAULT '1.0.0',
    author TEXT,
    resident_name TEXT,
    resident_address TEXT,
    information1 TEXT,
    information2 TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

-- Insert default settings (only one row should exist)
INSERT INTO settings (app_name, version, author, resident_name, resident_address, information1, information2)
VALUES (
    'Tijani Ukay Connect',
    '1.0.0',
    'Tijani Ukay Management',
    'Tijani Ukay Residences',
    'Tijani Ukay, Malaysia',
    'For inquiries, please contact the management office.',
    'Operating hours: 9 AM - 6 PM'
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policy: Everyone can read settings
CREATE POLICY "Settings are viewable by everyone"
    ON settings FOR SELECT
    USING (true);

-- Create policy: Only admins can update settings
CREATE POLICY "Only admins can update settings"
    ON settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Add comment
COMMENT ON TABLE settings IS 'Application-wide settings and configuration. Should contain only one row.';
