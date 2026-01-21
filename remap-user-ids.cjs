require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, setDoc, deleteDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// User ID mapping from Supabase to Firebase
const userMapping = {
    // sasuhai@yahoo.com (Tester 2)
    '838622e7-25b3-4b84-ae4b-2ba5e7454cf5': 'YCCDWWRTpeaUHNJQvZGZmxGKazw2',

    // sasuhai0@gmail.com (Suhaidi Two)
    '197c8257-7cca-4e9c-9337-84b40b2ca5ff': 'i3JiK4REZSfSUImPOgYFOX7w7pd2',

    // tijanitest@yahoo.com (Tijani Test User)
    '18641eed-9a3e-4151-b78f-adee4200b2e8': 'EWNaTxCOQ8UIQMC1bvhvbNeghHD2'
};

async function remapUserIds() {
    console.log('🔄 Starting User ID Remapping...\n');

    try {
        // Step 1: Remap profiles
        console.log('📝 Remapping profiles...');
        for (const [oldId, newId] of Object.entries(userMapping)) {
            try {
                // Get old profile
                const oldDocRef = doc(db, 'profiles', oldId);
                const oldDocSnap = await getDoc(oldDocRef);

                if (oldDocSnap.exists()) {
                    const profileData = oldDocSnap.data();

                    // Create new profile with Firebase UID
                    const newDocRef = doc(db, 'profiles', newId);
                    await setDoc(newDocRef, {
                        ...profileData,
                        id: newId // Update the id field
                    });

                    console.log(`  ✅ Remapped profile: ${profileData.email || oldId}`);
                    console.log(`     Old ID: ${oldId}`);
                    console.log(`     New ID: ${newId}\n`);

                    // Delete old profile
                    await deleteDoc(oldDocRef);
                    console.log(`  🗑️  Deleted old profile document\n`);
                } else {
                    console.log(`  ⚠️  Profile not found for old ID: ${oldId}\n`);
                }
            } catch (error) {
                console.error(`  ❌ Error remapping profile ${oldId}:`, error.message);
            }
        }

        // Step 2: Update related collections
        const collectionsToUpdate = [
            'visitor_invitations',
            'bookings',
            'issues',
            'poll_votes'
        ];

        for (const collectionName of collectionsToUpdate) {
            console.log(`\n📝 Updating ${collectionName}...`);

            const collectionRef = collection(db, collectionName);
            const { getDocs, query } = require('firebase/firestore');
            const snapshot = await getDocs(collectionRef);

            let updated = 0;
            for (const document of snapshot.docs) {
                const data = document.data();
                let needsUpdate = false;
                const updates = {};

                // Check resident_id field
                if (data.resident_id && userMapping[data.resident_id]) {
                    updates.resident_id = userMapping[data.resident_id];
                    needsUpdate = true;
                }

                // Check user_id field (for poll_votes)
                if (data.user_id && userMapping[data.user_id]) {
                    updates.user_id = userMapping[data.user_id];
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    const docRef = doc(db, collectionName, document.id);
                    await setDoc(docRef, updates, { merge: true });
                    updated++;
                }
            }

            console.log(`  ✅ Updated ${updated} documents in ${collectionName}`);
        }

        console.log('\n\n🎉 User ID remapping completed successfully!');
        console.log('\nSummary:');
        console.log(`- Remapped ${Object.keys(userMapping).length} user profiles`);
        console.log('- Updated all related collections');
        console.log('\n✅ Your Firebase database now uses the correct Firebase Auth UIDs!');

    } catch (error) {
        console.error('\n❌ Error during remapping:', error);
        throw error;
    }
}

// Run the remapping
remapUserIds()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });
