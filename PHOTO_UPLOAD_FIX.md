# Photo Upload Fix & Troubleshooting Guide

## ✅ CODE FIX APPLIED

I've fixed the photo upload code. The issue was with how we were destructuring the `getPublicUrl()` response.

**What Changed:**
```typescript
// BEFORE (incorrect):
const { data: { publicUrl } } = supabase.storage
    .from('issue-photos')
    .getPublicUrl(fileName);
photoUrl = publicUrl;

// AFTER (correct):
const { data } = supabase.storage
    .from('issue-photos')
    .getPublicUrl(fileName);
photoUrl = data.publicUrl;
```

---

## 🔧 STORAGE BUCKET SETUP CHECKLIST

### Step 1: Verify Bucket Exists
1. Go to Supabase Dashboard → **Storage**
2. Check if `issue-photos` bucket exists
3. If not, create it

### Step 2: Set Bucket to Public
1. Click on `issue-photos` bucket
2. Click **Settings** (gear icon)
3. Set **Public bucket** to **ON**
4. Save

### Step 3: Set Storage Policies (IMPORTANT!)

Go to **Storage** → **Policies** and add these policies for `issue-photos`:

**Policy 1: Allow Authenticated Users to Upload**
```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'issue-photos');
```

**Policy 2: Allow Public Read Access**
```sql
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'issue-photos');
```

**Policy 3: Allow Users to Delete Their Own Photos (Optional)**
```sql
CREATE POLICY "Allow users to delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'issue-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🧪 TESTING STEPS

1. **Clear Browser Cache** (important!)
   - Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
   - Clear cached images and files

2. **Test Photo Upload:**
   - Go to "Report an Issue"
   - Fill in the form
   - Select a photo (< 5MB)
   - You should see a preview
   - Submit the issue
   - Check browser console for: `"Photo uploaded successfully: https://..."`

3. **Verify in Supabase:**
   - Go to Storage → issue-photos
   - You should see the uploaded file

4. **Check Issue List:**
   - The issue card should display
   - Click on the issue
   - The modal should show the photo

---

## 🐛 TROUBLESHOOTING

### Problem: "Failed to upload photo" toast appears

**Check Console for Error:**
Open browser console (F12) and look for error messages.

**Common Errors:**

1. **"new row violates row-level security policy"**
   - **Fix:** Add the upload policy (Policy 1 above)

2. **"Bucket not found"**
   - **Fix:** Create the `issue-photos` bucket

3. **"File size too large"**
   - **Fix:** Ensure photo is < 5MB

4. **"Invalid file type"**
   - **Fix:** Only image files are accepted (jpg, png, gif, etc.)

### Problem: Photo uploads but doesn't display

**Check:**
1. Is the bucket set to **Public**?
2. Is the read policy (Policy 2) added?
3. Clear browser cache
4. Check the photo URL in the database:
   ```sql
   SELECT photo_url FROM issues WHERE photo_url IS NOT NULL;
   ```
5. Try opening the URL directly in a new tab

### Problem: Photo URL is empty/null in database

**Check:**
1. Look at browser console during submission
2. Should see: `"Photo uploaded successfully: https://..."`
3. If not, check the upload error in console

---

## 📊 VERIFY DATABASE

Run this in Supabase SQL Editor to check if photos are being saved:

```sql
-- Check recent issues with photos
SELECT 
    id,
    title,
    priority,
    photo_url,
    created_at
FROM issues
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

---

## 🔍 DEBUG MODE

If issues persist, add this temporary debug code to see what's happening:

In `IssueReportingPage.tsx`, after line 153, add:
```typescript
console.log('Photo URL generated:', photoUrl);
console.log('Photo URL length:', photoUrl.length);
console.log('Is valid URL:', photoUrl.startsWith('http'));
```

Then check the console when submitting an issue with a photo.

---

## ✅ QUICK FIX CHECKLIST

- [ ] Code fix applied (already done)
- [ ] Bucket `issue-photos` exists
- [ ] Bucket is set to **Public**
- [ ] Upload policy added (Policy 1)
- [ ] Read policy added (Policy 2)
- [ ] Browser cache cleared
- [ ] Test upload with small image (< 1MB)
- [ ] Check console for success message
- [ ] Verify photo appears in issue modal

---

## 💡 ALTERNATIVE: Use Private Storage

If you prefer private storage (photos only visible to authenticated users):

1. Keep bucket **Private** (not public)
2. Remove Policy 2 (public read)
3. Add this policy instead:
```sql
CREATE POLICY "Allow authenticated users to read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'issue-photos');
```

4. Update the code to use signed URLs (expires after 1 hour):
```typescript
// Replace getPublicUrl with:
const { data, error } = await supabase.storage
    .from('issue-photos')
    .createSignedUrl(fileName, 3600); // 1 hour expiry

if (data) {
    photoUrl = data.signedUrl;
}
```

---

**Need more help?** Check the browser console for specific error messages and let me know what you see!
