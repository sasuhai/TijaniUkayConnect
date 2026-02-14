# Files to Update - Supabase to Firebase Migration

This document lists all files that need to be updated to use Firebase instead of Supabase.

## Files Using Supabase (28 files total)

### Services (1 file)
1. ❌ `services/supabaseService.ts` → DELETE (Storage moved to Firestore Custom)

### Pages - Auth (2 files)
2. `pages/auth/LandingPage.tsx`
3. `pages/auth/AuthPage.tsx`

### Pages - Public (1 file)  
4. `pages/public/VerifyInvitationPage.tsx`

### Pages - Resident (10 files)
5. `pages/resident/AnnouncementsPage.tsx`
6. `pages/resident/ContactsPage.tsx`
7. `pages/resident/DashboardContent.tsx`
8. `pages/resident/DocumentsPage.tsx`
9. `pages/resident/FacilityBookingPage.tsx`
10. `pages/resident/IssueReportingPage.tsx`
11. `pages/resident/PhotoAlbumPage.tsx`
12. `pages/resident/PollsPage.tsx`
13. `pages/resident/ProfilePage.tsx`
14. `pages/resident/VideoAlbumPage.tsx`
15. `pages/resident/VisitorInvitationPage.tsx`

### Pages - Admin (5 files)
16. `pages/admin/AnalyticsDashboard.tsx`
17. `pages/admin/ManageFacilities.tsx`
18. `pages/admin/ManagePolls.tsx`
19. `pages/admin/ManageResidents.tsx`
20. `pages/admin/ManageSettings.tsx`
21. `pages/admin/ReportsPage.tsx`

### Components (3 files)
22. `components/booking/BookingCalendar.tsx`
23. `components/layout/SidebarHeader.tsx`
24. `components/search/GlobalSearch.tsx`

### Hooks (1 file)
25. `hooks/useAdminData.ts`

### Contexts (1 file - special handling)
26. `contexts/AuthContext.tsx` (type imports only)

### App (1 file)
27. `App.tsx`

## Update Strategy

### Phase 1: Update Imports
Replace all imports:
```typescript
// FROM:
import { supabase } from '../../services/supabaseService';

// TO:
import * as firebase from '../../services/firebaseService';
```

### Phase 2: Update Function Calls

#### Auth-related changes:
```typescript
// OLD:
const { data: { session } } = await supabase.auth.getSession();
const { data: { user } } = await supabase.auth.getUser();
supabase.auth.signOut();
supabase.auth.signInWithPassword({ email, password });
supabase.auth.signUp({ email, password, options: { data } });
supabase.auth.onAuthStateChange(callback);

// NEW:
const session = await firebase.getSession();
const user = firebase.getCurrentUser();
await firebase.logOut();
await firebase.signIn(email, password);
await firebase.signUp(email, password, data);
firebase.onAuthChange(callback);
```

#### Data queries:
```typescript
// OLD Supabase:
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('field', value)
  .order('created_at', { ascending: false })
  .single();

// NEW Firebase (function-based):
const { data, error } = await firebase.getTableName();  // Gets all
const { data, error } = await firebase.getTableNameById(id);  // Gets one
```

#### Inserts/Updates:
```typescript
// OLD:
await supabase.from('table').insert(data);
await supabase.from('table').update(data).eq('id', id);
await supabase.from('table').delete().eq('id', id);

// NEW:
await firebase.createTableName(data);
await firebase.updateTableName(id, data);
await firebase.deleteTableName(id);
```

### Phase 3: Storage (Base64 in Firestore)

File uploads now use Firebase Storage:

```typescript
import * as firebase from '../../services/firebaseService';

// Upload:
const { data, error } = await firebase.uploadFile('folder-name', file);
const url = data.publicUrl;

// Delete:
await firebase.deleteFile(path);
```

## Detailed File Changes

### App.tsx
```typescript
// OLD imports:
import type { Session } from '@supabase/supabase-js';
import { supabase, withTimeout } from './services/supabaseService';

// NEW imports:
import type { User as FirebaseUser } from 'firebase/auth';
import * as firebase from './services/firebaseService';

// OLD getSession:
const { data: { session } } = await supabase.auth.getSession();

// NEW getSession:
const { data: { session } } = await firebase.getSession();

// OLD fetch profile:
await withTimeout(
  supabase.from('profiles').select('*').eq('id', session.user.id).single(),
  8000
);

// NEW fetch profile:
await firebase.withTimeout(
  firebase.getUserProfile(session.user.uid),
  8000
);

// OLD onAuthStateChange:
supabase.auth.onAuthStateChange((event, session) => { ... });

// NEW onAuthChange:
firebase.onAuthChange((event, session) => { ... });

// OLD signOut:
await supabase.auth.signOut();

// NEW logOut:
await firebase.logOut();
```

### AuthPage.tsx
```typescript
// Sign in:
// OLD:
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// NEW:
const { data, error } = await firebase.signIn(email, password);

// Sign up:
// OLD:
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name, address, phone } }
});

// NEW:
const { data, error } = await firebase.signUp(email, password, {
  full_name, address, phone
});
```

### Data Pages (Generic Pattern)

For any page fetching data:

```typescript
// OLD:
const { data, error } = await supabase
  .from('announcements')
  .select('*')
  .order('created_at', { ascending: false });

// NEW:
const { data, error } = await firebase.getAnnouncements();
// Note: Sorting is done in the service layer
```

For creating data:

```typescript
// OLD:
const { data, error } = await supabase
  .from('announcements')
  .insert([newAnnouncement])
  .select()
  .single();

// NEW:
const { data, error } = await firebase.createAnnouncement(newAnnouncement);
```

For updating data:

```typescript
// OLD:
const { error } = await supabase
  .from('announcements')
  .update(updates)
  .eq('id', id);

// NEW:
const { error } = await firebase.updateAnnouncement(id, updates);
```

For deleting data:

```typescript
// OLD:
const { error } = await supabase
  .from('announcements')
  .delete()
  .eq('id', id);

// NEW:
const { error } = await firebase.deleteAnnouncement(id);
```

## Function Mapping Reference

| Supabase Pattern | Firebase Function |
|------------------|-------------------|
| `.from('profiles').select('*')` | `getProfileProfile()` or `getAllProfiles()` |
| `.from('profiles').select('*').eq('id', id).single()` | `getUserProfile(id)` |
| `.from('visitor_invitations').select('*')` | `getVisitorInvitations()` |
| `.from('visitor_invitations').select('*').eq('resident_id', id)` | `getVisitorInvitations(residentId)` |
| `.from('facilities').select('*')` | `getFacilities()` |
| `.from('bookings').select('*')` | `getBookings()` |
| `.from('bookings').select('*').eq('facility_id', id)` | `getBookings(facilityId)` |
| `.from('documents').select('*')` | `getDocuments()` |
| `.from('announcements').select('*')` | `getAnnouncements()` |
| `.from('contacts').select('*')` | `getContacts()` |
| `.from('photo_albums').select('*')` | `getPhotoAlbums()` |
| `.from('video_albums').select('*')` | `getVideoAlbums()` |
| `.from('issues').select('*')` | `getIssues()` |
| `.from('issues').select('*').eq('resident_id', id)` | `getIssues(residentId)` |
| `.from('issue_updates').select('*').eq('issue_id', id)` | `getIssueUpdates(issueId)` |
| `.from('polls').select('*')` | `getPolls()` |
| `.from('poll_votes').select('*').eq('poll_id', id)` | `getPollVotes(pollId)` |
| `.from('settings').select('*').single()` | `getSettings()` |
| `.from(...).insert(data)` | `create{TableName}(data)` |
| `.from(...).update(data).eq('id', id)` | `update{TableName}(id, data)` |
| `.from(...).delete().eq('id', id)` | `delete{TableName}(id)` |

## Storage Operations (Use Firebase)

All storage operations now use the Firebase service helper:

```typescript
import * as firebase from '../services/firebaseService';

// Upload and get URL:
const { data, error } = await firebase.uploadFile('bucket-name', file);
if (data) {
    const url = data.publicUrl;
}

// Delete:
const { error } = await firebase.deleteFile(path);
```

## Testing Checklist

After updating each file, test:
- [ ] Page loads without errors
- [ ] Data displays correctly
- [ ] Create operations work
- [ ] Update operations work
- [ ] Delete operations work
- [ ] File uploads work (if applicable)
- [ ] Authentication works
- [ ] No console errors

## Priority Order

1. **High Priority** (Must work first):
   - App.tsx
   - AuthPage.tsx
   - ProfilePage.tsx

2. **Medium Priority** (Core features):
   - DashboardContent.tsx
   - ManageResidents.tsx
   - AnnouncementsPage.tsx

3. **Low Priority** (Can update later):
   - AnalyticsDashboard.tsx
   - ReportsPage.tsx
   - Search components

## Notes

- ✅ All Firebase functions return `{ data, error }` format
- ✅ Timestamps are automatically converted
- ✅ Sorting is done in JavaScript (no indexes needed)
- ✅ Storage uses Firestore Base64
- ✅ User IDs need to be updated after Firebase Auth setup
