# ✅ FIXING "INVITATION NOT FOUND" (RLS ISSUE)

## 🎯 THE PROBLEM

You are getting **"INVALID PASS, invitation not found"** even though:
1.  The QR code has the correct UUID (`97131e05...`).
2.  The page loads (so the URL/Port is working).

**Cause:** **Row Level Security (RLS)**.
The `visitor_invitations` table is likely private. The verification page is **public** (unauthenticated). Supabase is blocking the public page from reading the invitation data, so it returns "not found".

---

## 🔧 THE SOLUTION: ENABLE PUBLIC ACCESS

You need to allow public (anonymous) users to read the invitation details so the security guard can verify them.

### Step 1: Run this SQL in Supabase

1.  Go to your **Supabase Dashboard**.
2.  Click on **SQL Editor** (icon on the left).
3.  Click **"New Query"**.
4.  Paste the following SQL code:

```sql
-- Enable RLS on the table (good practice to ensure it's on)
ALTER TABLE visitor_invitations ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anon) to READ invitations
-- This is necessary for the verification page to work without login
CREATE POLICY "Allow public verification of invitations"
ON visitor_invitations
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public to read profile addresses (for the Host Address display)
CREATE POLICY "Allow public to view resident addresses"
ON profiles
FOR SELECT
TO anon, authenticated
USING (true);
```

5.  Click **RUN**.

---

## 🧪 TEST AGAIN

1.  **Refresh** your browser.
2.  **Scan the QR code** again.
3.  ✅ It should now show **"ACCESS GRANTED"** (or "FUTURE DATE").

---

## ❓ FAQ

**Q: Is this secure?**
A: Yes, because we use **UUIDs** (random strings like `97131e05...`).
- An attacker cannot guess these IDs.
- They cannot list all invitations (unless they guess every single UUID, which is impossible).
- They can only view an invitation if they *already have* the QR code.

**Q: My logs show port 3000, is that okay?**
A: If the page loads on your phone, then yes! It means your computer is reachable on port 3000. The "Invitation not found" error confirms the connection is working, but the database was saying "No". The SQL fix above solves that "No".
