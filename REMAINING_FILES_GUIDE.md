# 🎯 Guide to Complete Remaining 15 Files

**Status**: 16/31 files complete (52%) - All resident features working!

---

## ✅ What's Already Complete

All core resident functionality works with Firebase:
- Authentication & profiles
- Dashboards
- Visitor invitations
- Facility bookings
- Issues & Polls

---

## Quick Reference for Remaining Files

### Admin Pages (7 files)
1. ManageResidents.tsx - Use `firebase.getAllProfiles()`, `firebase.updateProfile()`
2. ManageFacilities.tsx - Use `firebase.getFacilities()`, `firebase.createFacility()`, etc.
3. ManagePolls.tsx - Use `firebase.getPolls()`, `firebase.createPoll()`
4. ManageSettings.tsx - Use `firebase.getSettings()`, `firebase.updateSettings()`
5. AnalyticsDashboard.tsx - Multiple firebase.get* calls
6. ReportsPage.tsx - Multiple firebase.get* calls

### Components (4 files)
7. VerifyInvitationPage.tsx - Use `firebase.getVisitorInvitations()`
8. BookingCalendar.tsx -Use `firebase.getBookings()`, `firebase.getFacilities()`
9. SidebarHeader.tsx - Minimal changes
10. GlobalSearch.tsx - Use firebase.get* for search
11. useAdminData.ts - Replace all supabase calls

---

## Pattern for All Files

```typescript
// Before
import { supabase } from '../../services/supabaseService';
const { data } = await supabase.from('table').select('*');

// After
import * as firebase from '../../services/firebaseService';
const { data } = await firebase.getTableName();
```

---

See FILES_TO_UPDATE.md for detailed migration patterns.
