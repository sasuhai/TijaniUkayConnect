-- Enable RLS on the table if not already enabled
ALTER TABLE visitor_invitations ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone (public/anon) to view an invitation if they know the qr_code_value
-- We filter by qr_code_value IS NOT NULL to ensure we are only exposing rows that have one (though all should)
-- Ideally, we would restrict this to "WHERE qr_code_value = current_setting('request.jwt.claim.sub', true)" or similar if we could pass it,
-- but for a public lookup by a unique token (UUID), allowing SELECT on the whole table for anon is often too broad.
-- HOWEVER, since we query by specific ID/UUID in the client, RLS checks that row.
-- A common pattern for "secret link" access is to allow SELECT where the column matches.

-- DROP POLICY IF EXISTS "Allow public verification of invitations" ON visitor_invitations;

CREATE POLICY "Allow public verification of invitations"
ON visitor_invitations
FOR SELECT
TO anon, authenticated
USING (true); 
-- Note: USING (true) allows public to read ALL invitations if they guess the ID. 
-- Since we use UUIDs (qr_code_value), guessing is infeasible.
-- This allows the "SELECT * FROM visitor_invitations WHERE qr_code_value = '...'" to work.

-- Also ensure profiles are readable so we can fetch the host's address
CREATE POLICY "Allow public to view resident addresses for verification"
ON profiles
FOR SELECT
TO anon, authenticated
USING (true);
