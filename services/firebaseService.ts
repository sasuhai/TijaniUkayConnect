// Firebase Service - NoSQL Database
// This service mirrors Supabase API structure to minimize app code changes
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  FirestoreError,
  onSnapshot
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { createClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Supabase Storage (Hybrid - Firebase Storage requires paid plan)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabaseStorage = createClient(supabaseUrl, supabaseAnonKey);

// Helper: Convert Firestore Timestamp to ISO string
const timestampToISO = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return new Date().toISOString();
};

// Helper: Convert ISO string to Firestore Timestamp
const isoToTimestamp = (isoString: string | undefined): Timestamp => {
  if (!isoString) return Timestamp.now();
  return Timestamp.fromDate(new Date(isoString));
};

// Helper: Format error like Supabase
const formatError = (error: any) => {
  if (error instanceof FirestoreError) {
    return { message: error.message, code: error.code };
  }
  return { message: error?.message || 'Unknown error', code: 'unknown' };
};

// ==========================================
// AUTHENTICATION
// ==========================================

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      data: {
        user: userCredential.user,
        session: { user: userCredential.user }
      },
      error: null
    };
  } catch (error: any) {
    return { data: { user: null, session: null }, error: formatError(error) };
  }
};

export const signUp = async (email: string, password: string, metadata: any = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Create profile in Firestore
    const profileData = {
      id: userCredential.user.uid,
      email: email,
      full_name: metadata.full_name || '',
      address: metadata.address || '',
      phone: metadata.phone || '',
      status: 'Pending Approval' as const,
      role: 'resident' as const,
      created_at: Timestamp.now(),
    };

    await setDoc(doc(db, 'profiles', userCredential.user.uid), profileData);

    return {
      data: {
        user: userCredential.user,
        session: { user: userCredential.user }
      },
      error: null
    };
  } catch (error: any) {
    return { data: { user: null, session: null }, error: formatError(error) };
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const getSession = async () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve({
        data: { session: user ? { user } : null },
        error: null
      });
    });
  });
};

export const onAuthChange = (callback: (event: string, session: any) => void) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback('SIGNED_IN', { user });
    } else {
      callback('SIGNED_OUT', null);
    }
  });
};

// ==========================================
// USER PROFILES
// ==========================================

export const getUserProfile = async (userId: string) => {
  try {
    const docRef = doc(db, 'profiles', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        data: {
          ...data,
          id: docSnap.id,
          created_at: timestampToISO(data.created_at),
          approval_date: data.approval_date ? timestampToISO(data.approval_date) : undefined,
        },
        error: null
      };
    } else {
      return { data: null, error: { message: 'Profile not found', code: 'not-found' } };
    }
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const getAllProfiles = async () => {
  try {
    const q = query(collection(db, 'profiles'));
    const snapshot = await getDocs(q);
    const profiles = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      created_at: timestampToISO(doc.data().created_at),
      approval_date: doc.data().approval_date ? timestampToISO(doc.data().approval_date) : undefined,
    }));

    // Sort in JavaScript to avoid composite index
    profiles.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return { data: profiles, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    const docRef = doc(db, 'profiles', userId);
    const updateData: any = { ...updates };

    // Convert date strings to Timestamps
    if (updates.approval_date) {
      updateData.approval_date = isoToTimestamp(updates.approval_date);
    }

    await updateDoc(docRef, updateData);
    return { data: updates, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deleteProfile = async (userId: string) => {
  try {
    await deleteDoc(doc(db, 'profiles', userId));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// VISITOR INVITATIONS
// ==========================================

export const getVisitorInvitations = async (residentId?: string) => {
  try {
    let q;
    if (residentId) {
      q = query(collection(db, 'visitor_invitations'), where('resident_id', '==', residentId));
    } else {
      q = query(collection(db, 'visitor_invitations'));
    }

    const snapshot = await getDocs(q);
    const invitations = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      created_at: timestampToISO(doc.data().created_at),
      visit_date_time: timestampToISO(doc.data().visit_date_time),
    }));

    // Sort in JavaScript
    invitations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: invitations, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const getVisitorInvitationById = async (id: string) => {
  try {
    const docRef = doc(db, 'visitor_invitations', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        data: {
          ...data,
          id: docSnap.id,
          created_at: timestampToISO(data.created_at),
          visit_date_time: timestampToISO(data.visit_date_time),
        },
        error: null
      };
    } else {
      return { data: null, error: { message: 'Invitation not found', code: 'not-found' } };
    }
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const createVisitorInvitation = async (invitation: any) => {
  try {
    const invitationData = {
      ...invitation,
      created_at: Timestamp.now(),
      visit_date_time: isoToTimestamp(invitation.visit_date_time),
    };

    const docRef = await addDoc(collection(db, 'visitor_invitations'), invitationData);
    return { data: { id: docRef.id, ...invitation }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deleteVisitorInvitation = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'visitor_invitations', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// FACILITIES
// ==========================================

export const getFacilities = async () => {
  try {
    const q = query(collection(db, 'facilities'));
    const snapshot = await getDocs(q);
    const facilities = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    }));

    facilities.sort((a, b) => a.name.localeCompare(b.name));

    return { data: facilities, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createFacility = async (facility: any) => {
  try {
    const docRef = await addDoc(collection(db, 'facilities'), facility);
    return { data: { id: docRef.id, ...facility }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const updateFacility = async (id: string, updates: any) => {
  try {
    await updateDoc(doc(db, 'facilities', id), updates);
    return { data: updates, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deleteFacility = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'facilities', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// BOOKINGS
// ==========================================

export const getBookings = async (facilityId?: string, residentId?: string) => {
  try {
    let q;
    if (facilityId && residentId) {
      q = query(
        collection(db, 'bookings'),
        where('facility_id', '==', facilityId),
        where('resident_id', '==', residentId)
      );
    } else if (facilityId) {
      q = query(collection(db, 'bookings'), where('facility_id', '==', facilityId));
    } else if (residentId) {
      q = query(collection(db, 'bookings'), where('resident_id', '==', residentId));
    } else {
      q = query(collection(db, 'bookings'));
    }

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      created_at: timestampToISO(doc.data().created_at),
    }));

    // Sort in JavaScript
    bookings.sort((a, b) => {
      const dateCompare = b.booking_date.localeCompare(a.booking_date);
      if (dateCompare !== 0) return dateCompare;
      return b.booking_slot.localeCompare(a.booking_slot);
    });

    return { data: bookings, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createBooking = async (booking: any) => {
  try {
    const bookingData = {
      ...booking,
      created_at: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'bookings'), bookingData);
    return { data: { id: docRef.id, ...booking }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deleteBooking = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'bookings', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// DOCUMENTS
// ==========================================

export const getDocuments = async () => {
  try {
    const q = query(collection(db, 'documents'));
    const snapshot = await getDocs(q);
    const documents = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      created_at: timestampToISO(doc.data().created_at),
    }));

    documents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: documents, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createDocument = async (document: any) => {
  try {
    const docData = {
      ...document,
      created_at: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'documents'), docData);
    return { data: { id: docRef.id, ...document }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deleteDocument = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'documents', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// ANNOUNCEMENTS
// ==========================================

export const getAnnouncements = async () => {
  try {
    const q = query(collection(db, 'announcements'));
    const snapshot = await getDocs(q);
    const announcements = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      created_at: timestampToISO(doc.data().created_at),
    }));

    announcements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: announcements, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createAnnouncement = async (announcement: any) => {
  try {
    const announcementData = {
      ...announcement,
      created_at: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'announcements'), announcementData);
    return { data: { id: docRef.id, ...announcement }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deleteAnnouncement = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'announcements', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// CONTACTS
// ==========================================

export const getContacts = async () => {
  try {
    const q = query(collection(db, 'contacts'));
    const snapshot = await getDocs(q);
    const contacts = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    }));

    contacts.sort((a, b) => a.name.localeCompare(b.name));

    return { data: contacts, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createContact = async (contact: any) => {
  try {
    const docRef = await addDoc(collection(db, 'contacts'), contact);
    return { data: { id: docRef.id, ...contact }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const updateContact = async (id: string, updates: any) => {
  try {
    await updateDoc(doc(db, 'contacts', id), updates);
    return { data: updates, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deleteContact = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'contacts', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// PHOTO ALBUMS
// ==========================================

export const getPhotoAlbums = async () => {
  try {
    const q = query(collection(db, 'photo_albums'));
    const snapshot = await getDocs(q);
    const albums = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      created_at: timestampToISO(doc.data().created_at),
    }));

    albums.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: albums, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createPhotoAlbum = async (album: any) => {
  try {
    const albumData = {
      ...album,
      created_at: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'photo_albums'), albumData);
    return { data: { id: docRef.id, ...album }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const updatePhotoAlbum = async (id: string, updates: any) => {
  try {
    const updateData: any = { ...updates };
    if (updates.created_at) {
      updateData.created_at = isoToTimestamp(updates.created_at);
    }

    await updateDoc(doc(db, 'photo_albums', id), updateData);
    return { data: updates, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deletePhotoAlbum = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'photo_albums', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// VIDEO ALBUMS
// ==========================================

export const getVideoAlbums = async () => {
  try {
    const q = query(collection(db, 'video_albums'));
    const snapshot = await getDocs(q);
    const albums = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      created_at: timestampToISO(doc.data().created_at),
    }));

    albums.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: albums, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createVideoAlbum = async (album: any) => {
  try {
    const albumData = {
      ...album,
      created_at: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'video_albums'), albumData);
    return { data: { id: docRef.id, ...album }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deleteVideoAlbum = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'video_albums', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// ISSUES
// ==========================================

export const getIssues = async (residentId?: string) => {
  try {
    let q;
    if (residentId) {
      q = query(collection(db, 'issues'), where('resident_id', '==', residentId));
    } else {
      q = query(collection(db, 'issues'));
    }

    const snapshot = await getDocs(q);
    const issues = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      created_at: timestampToISO(doc.data().created_at),
      resolved_at: doc.data().resolved_at ? timestampToISO(doc.data().resolved_at) : undefined,
    }));

    issues.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: issues, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createIssue = async (issue: any) => {
  try {
    const issueData = {
      ...issue,
      created_at: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'issues'), issueData);
    return { data: { id: docRef.id, ...issue }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const updateIssue = async (id: string, updates: any) => {
  try {
    const updateData: any = { ...updates };
    if (updates.resolved_at) {
      updateData.resolved_at = isoToTimestamp(updates.resolved_at);
    }

    await updateDoc(doc(db, 'issues', id), updateData);
    return { data: updates, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deleteIssue = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'issues', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// ISSUE UPDATES
// ==========================================

export const getIssueUpdates = async (issueId: string) => {
  try {
    const q = query(collection(db, 'issue_updates'), where('issue_id', '==', issueId));
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      created_at: timestampToISO(doc.data().created_at),
    }));

    updates.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return { data: updates, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createIssueUpdate = async (update: any) => {
  try {
    const updateData = {
      ...update,
      created_at: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'issue_updates'), updateData);
    return { data: { id: docRef.id, ...update }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

// ==========================================
// POLLS
// ==========================================

export const getPolls = async () => {
  try {
    const q = query(collection(db, 'polls'));
    const snapshot = await getDocs(q);
    const polls = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    }));

    return { data: polls, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createPoll = async (poll: any) => {
  try {
    const docRef = await addDoc(collection(db, 'polls'), poll);
    return { data: { id: docRef.id, ...poll }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const updatePoll = async (id: string, updates: any) => {
  try {
    await updateDoc(doc(db, 'polls', id), updates);
    return { data: updates, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const deletePoll = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'polls', id));
    return { error: null };
  } catch (error: any) {
    return { error: formatError(error) };
  }
};

// ==========================================
// POLL VOTES
// ==========================================

export const getPollVotes = async (pollId: string, userId?: string) => {
  try {
    let q;
    if (userId) {
      q = query(
        collection(db, 'poll_votes'),
        where('poll_id', '==', pollId),
        where('user_id', '==', userId)
      );
    } else {
      q = query(collection(db, 'poll_votes'), where('poll_id', '==', pollId));
    }

    const snapshot = await getDocs(q);
    const votes = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    }));

    return { data: votes, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

export const createPollVote = async (vote: any) => {
  try {
    const docRef = await addDoc(collection(db, 'poll_votes'), vote);
    return { data: { id: docRef.id, ...vote }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

// ==========================================
// SETTINGS
// ==========================================

export const getSettings = async () => {
  try {
    const q = query(collection(db, 'settings'), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { data: null, error: { message: 'Settings not found', code: 'not-found' } };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      data: {
        ...data,
        id: doc.id,
        created_at: timestampToISO(data.created_at),
        updated_at: timestampToISO(data.updated_at),
      },
      error: null
    };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const updateSettings = async (settingsId: string, updates: any) => {
  try {
    const updateData: any = { ...updates };
    updateData.updated_at = Timestamp.now();

    await updateDoc(doc(db, 'settings', settingsId), updateData);
    return { data: updates, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

// ==========================================
// ANALYTICS
// ==========================================

export const trackPageVisit = async (pageData: any) => {
  try {
    const visitData = {
      ...pageData,
      timestamp: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'page_visits'), visitData);
    return { data: { id: docRef.id }, error: null };
  } catch (error: any) {
    return { data: null, error: formatError(error) };
  }
};

export const getPageVisits = async (startDate?: string, endDate?: string) => {
  try {
    let q;

    if (startDate && endDate) {
      q = query(
        collection(db, 'page_visits'),
        where('timestamp', '>=', isoToTimestamp(startDate)),
        where('timestamp', '<=', isoToTimestamp(endDate))
      );
    } else {
      q = query(collection(db, 'page_visits'));
    }

    const snapshot = await getDocs(q);
    const visits = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      timestamp: timestampToISO(doc.data().timestamp),
    }));

    return { data: visits, error: null };
  } catch (error: any) {
    return { data: [], error: formatError(error) };
  }
};

// Helper for timeout
export const withTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Request timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};
