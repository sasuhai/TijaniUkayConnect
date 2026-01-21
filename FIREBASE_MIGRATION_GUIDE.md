# Firebase Migration Guide

## 🚀 Migration Steps

This guide walks you through migrating from Supabase to Firebase.

### Prerequisites

1. ✅ Firebase project created
2. ✅ Environment variables configured in `.env`
3. ✅ Firebase Firestore rules temporarily set to allow all writes (for migration)

### Step 1: Set Firebase Rules to Test Mode (TEMPORARY!)

Go to Firebase Console → Firestore → Rules and set:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ TEMPORARY FOR MIGRATION ONLY!
    }
  }
}
```

**IMPORTANT**: This rule allows anyone to read/write. Only use during migration!

### Step 2: Run the Data Migration

```bash
node migrate-to-firebase.js
```

This will:
- Copy all data from Supabase to Firebase
- Convert timestamps to Firestore format
- Preserve all record IDs
- Show progress for each table

Expected output:
```
🚀 Starting Supabase to Firebase Migration...
📦 Migrating profiles...
✅ profiles: 15 records migrated
📦 Migrating visitor_invitations...
✅ visitor_invitations: 23 records migrated
...
🎉 MIGRATION COMPLETE!
```

### Step 3: Verify Data in Firebase Console

1. Go to Firebase Console → Firestore
2. Check that all collections exist
3. Spot-check a few records
4. Verify timestamps are correct

### Step 4: Update Firebase Auth Users

Firebase Auth will create NEW user IDs (UIDs) different from Supabase.

**Option A: Manual User Creation** (Recommended for small # of users)
1. Go to Firebase Console → Authentication
2. For each Supabase user:
   - Click "Add User"
   - Enter their email
   - Set temporary password
   - Send them password reset email
   - **Copy the new Firebase UID**
   
3. Update user_id references in Firestore:
   - Go to Firestore → profiles collection
   - For each profile, update the document ID to match the new Firebase UID
   - Update `resident_id` fields in other collections

**Option B: Programmatic Migration** (For many users)
- Create a script to map old Supabase UUIDs to new Firebase UIDs
- Update all `user_id` and `resident_id` fields

### Step 5: Test the Application

```bash
npm run dev
```

1. Try logging in with Firebase Auth
2. Check that data loads correctly
3. Test CRUD operations
4. Verify file uploads still work (Supabase Storage)

### Step 6: Secure Firebase Rules

Once testing is complete, apply proper security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Public read, auth write
    match /profiles/{profileId} {
      allow read: if true;
      allow write: if isAuthenticated();
    }
    
    match /visitor_invitations/{invitationId} {
      allow read: if true; // QR code verification needs public read
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
                               (resource.data.resident_id == request.auth.uid || isAdmin());
    }
    
    match /facilities/{facilityId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /bookings/{bookingId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
                               (resource.data.resident_id == request.auth.uid || isAdmin());
    }
    
    match /documents/{documentId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /announcements/{announcementId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /contacts/{contactId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /photo_albums/{albumId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /video_albums/{albumId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /issues/{issueId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                       (resource.data.resident_id == request.auth.uid || isAdmin());
      allow delete: if isAdmin();
    }
    
    match /issue_updates/{updateId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if false; // Updates are immutable
    }
    
    match /polls/{pollId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /poll_votes/{voteId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if false; // Votes are immutable
    }
    
    match /settings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /page_visits/{visitId} {
      allow read: if isAdmin();
      allow create: if true; // Allow anonymous analytics
      allow update, delete: if false;
    }
  }
}
```

### Step 7: Deploy

```bash
npm run build
```

Then deploy to your hosting platform.

## 🔄 Rollback Plan

If you need to rollback to Supabase:

1. The original Supabase data is untouched
2. Change imports back from `firebaseService` to `supabaseService`
3. Redeploy

## 📊 Migration Checklist

- [ ] Firebase project created
- [ ] Environment variables configured
- [ ] Firestore rules set to test mode
- [ ] Data migration completed
- [ ] Data verified in Firebase Console
- [ ] Firebase Auth users created
- [ ] User IDs updated in Firestore
- [ ] Application tested locally
- [ ] All features working
- [ ] Firestore security rules applied
- [ ] Application deployed
- [ ] Production testing completed

## 🆘 Troubleshooting

### "Permission denied" errors
- Check Firestore rules allow the operation
- Verify user is authenticated
- Check user role for admin operations

### "User not found" errors
- Verify Firebase Auth user exists
- Check user ID matches in Firestore profile
- Try re-logging in

### "Data not loading"
- Check browser console for errors
- Verify Firestore collections and documents exist
- Check network tab for failed requests

### File upload errors
- Verify Supabase credentials are still in .env
- Check Supabase Storage is still accessible
- Test file upload manually

## 📝 Notes

- **Hybrid Storage**: We keep Supabase Storage for files (Firebase Storage requires paid plan)
- **No Cold Starts**: Firebase Firestore has no hibernation - always instant!
- **Real-time (Optional)**: You can add real-time listeners later if needed
- **Indexes**: All queries sort in JavaScript to avoid composite index creation

## 🎉 Success!

Once migration is complete, you'll have:
- ✅ Always-on database (no hibernation)
- ✅ Instant cold starts
- ✅ Better free tier limits
- ✅ Same application functionality
- ✅ File storage still working
