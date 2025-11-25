# Photo Album Cover Image Guide for Admins

## Overview
When creating photo albums, you can add a cover image URL to display a thumbnail. This guide explains how to get the correct URL from different photo hosting services.

## Supported Services

### ✅ OneDrive (Recommended Method: Embed)

**Step-by-Step:**
1. Open your OneDrive and navigate to the photo you want to use
2. Click on the photo to select it
3. Click the **"..."** (more options) menu at the top
4. Select **"</> Embed"**
5. Copy the embed code that appears
6. Extract the URL from `src="..."` in the code
7. Paste that URL into the "Cover Image URL" field

**Example URL Format:**
```
https://onedrive.live.com/embed?resid=XXX&authkey=XXX
```

**Alternative Method (Direct Image):**
1. Right-click on the photo
2. Select "Open image in new tab"
3. Copy the URL from the address bar
4. The URL should look like: `https://bn1304files.storage.live.com/...`

---

### ✅ Google Photos (Embed Method)

**Step-by-Step:**
1. Open the photo in Google Photos
2. Click the **"⋮"** (three dots) menu
3. Select **"</> Embed item"** or **"Get link"**
4. If using embed: Copy the URL from `src="..."` in the embed code
5. If using link: The URL should be a direct googleusercontent.com link

**Example URL Format:**
```
https://lh3.googleusercontent.com/...
```

**Note:** Google Photos album share links (like `https://photos.app.goo.gl/...`) won't work as cover images. You need the direct image URL.

---

### ✅ Direct Image URLs

Any direct image URL will work:
- `https://example.com/photo.jpg`
- `https://i.imgur.com/abc123.png`
- Any URL ending with: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`

---

### ✅ iCloud Photos / Apple Photos

**For iCloud Shared Albums:**
1. Open the shared album in iCloud.com
2. Click on the photo you want
3. Click the download icon or right-click
4. Select "Download" to save the image
5. Upload the image to a public hosting service (OneDrive, Google Drive, Imgur, etc.)
6. Use the direct image URL from that service

**Note:** iCloud doesn't provide direct embed URLs like OneDrive or Google Photos. You'll need to download and re-upload to a service that does.

---

### ❌ What DOESN'T Work

These types of URLs **will NOT work** as cover images:
- ❌ Album view URLs (e.g., `https://onedrive.live.com/?view=8&cid=...`)
- ❌ Google Photos album share links (e.g., `https://photos.app.goo.gl/...`)
- ❌ iCloud album links (e.g., `https://www.icloud.com/sharedalbum/...`)
- ❌ Dropbox folder links
- ❌ Any URL that opens a web page instead of an image

---

## Quick Reference Table

| Service | Best Method | URL Format |
|---------|-------------|------------|
| **OneDrive** | </> Embed | `https://onedrive.live.com/embed?resid=...` |
| **Google Photos** | </> Embed item | `https://lh3.googleusercontent.com/...` |
| **Imgur** | Direct link | `https://i.imgur.com/abc123.jpg` |
| **Direct URLs** | Copy URL | `https://example.com/photo.jpg` |
| **iCloud** | Download & re-upload | Use OneDrive/Google after upload |

---

## Fallback Behavior

If you leave the "Cover Image URL" field **blank** or if the URL fails to load:
- The system will automatically generate a **placeholder** with the album title
- The placeholder is a nice indigo-colored box with white text
- This ensures your photo album always looks good, even without a cover image

---

## Tips for Best Results

1. ✅ **Use the </> Embed option** when available (OneDrive, Google Photos)
2. ✅ **Test the URL** by pasting it in a new browser tab - it should show just the image
3. ✅ **Use square or landscape photos** for best thumbnail appearance
4. ✅ **Keep images under 5MB** for faster loading
5. ✅ **Use HTTPS URLs** (starting with `https://`) for security

---

## Troubleshooting

**Problem:** Image shows as placeholder even with URL
- **Solution:** Make sure you're using the embed URL, not the album/share link

**Problem:** Image loads slowly
- **Solution:** Use a smaller image or compress it before uploading

**Problem:** Image doesn't load at all
- **Solution:** Check if the URL is publicly accessible (not requiring login)

---

## Need Help?

If you're having trouble getting the cover image to work:
1. Try leaving it blank - the auto-generated placeholder looks great!
2. Use a simple direct image URL from Imgur or similar service
3. Contact support with the URL you're trying to use
