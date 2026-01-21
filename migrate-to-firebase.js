// Migration Script - Supabase to Firebase
// This script migrates all data from Supabase to Firebase Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase with SERVICE ROLE KEY to bypass RLS
console.log('🔑 Using Supabase Service Role Key to bypass RLS...\n');
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY // Using service role key!
);

// Initialize Firebase
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Tables/Collections to migrate
const TABLES = [
    'profiles',
    'visitor_invitations',
    'facilities',
    'bookings',
    'documents',
    'announcements',
    'contacts',
    'photo_albums',
    'video_albums',
    'issues',
    'issue_updates',
    'polls',
    'poll_votes',
    'settings',
    'page_visits',
];

// Helper: Convert date string to Firestore Timestamp
const convertToTimestamp = (dateString) => {
    if (!dateString) return null;
    try {
        return Timestamp.fromDate(new Date(dateString));
    } catch {
        return null;
    }
};

// Helper: Process record for Firebase
const processRecord = (tableName, record) => {
    const processed = { ...record };

    // Remove 'id' from data (it becomes document ID)
    delete processed.id;

    // Convert timestamp fields
    const timestampFields = ['created_at', 'updated_at', 'approval_date', 'resolved_at', 'visit_date_time', 'timestamp'];

    for (const field of timestampFields) {
        if (processed[field]) {
            const timestamp = convertToTimestamp(processed[field]);
            if (timestamp) {
                processed[field] = timestamp;
            } else {
                delete processed[field];
            }
        }
    }

    return processed;
};

// Migrate a single table
async function migrateTable(tableName) {
    console.log(`\n📦 Migrating ${tableName}...`);

    try {
        // Get all data from Supabase
        const { data, error } = await supabase.from(tableName).select('*');

        if (error) {
            console.error(`❌ Error fetching ${tableName}:`, error.message);
            return 0;
        }

        if (!data || data.length === 0) {
            console.log(`ℹ️  ${tableName}: No data to migrate`);
            return 0;
        }

        // Migrate each record to Firebase
        let migratedCount = 0;
        for (const record of data) {
            try {
                const docId = record.id.toString();
                const firestoreData = processRecord(tableName, record);

                // Write to Firestore
                await setDoc(doc(db, tableName, docId), firestoreData);
                migratedCount++;

                // Progress indicator
                if (migratedCount % 10 === 0) {
                    process.stdout.write(`  ⏳ ${migratedCount}/${data.length}...\r`);
                }
            } catch (err) {
                console.error(`  ⚠️  Failed to migrate record ${record.id}:`, err.message);
            }
        }

        console.log(`✅ ${tableName}: ${migratedCount}/${data.length} records migrated`);
        return migratedCount;

    } catch (err) {
        console.error(`❌ Error migrating ${tableName}:`, err.message);
        return 0;
    }
}

// Main migration function
async function migrate() {
    console.log('🚀 Starting Supabase to Firebase Migration...\n');
    console.log('📊 Configuration:');
    console.log(`   Supabase URL: ${process.env.VITE_SUPABASE_URL}`);
    console.log(`   Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}\n`);
    console.log('⚠️  WARNING: This will copy all data to Firebase!');
    console.log('   Make sure Firebase Firestore rules are set to allow writes.\n');

    let totalMigrated = 0;
    const results = {};

    for (const table of TABLES) {
        const count = await migrateTable(table);
        results[table] = count;
        totalMigrated += count;

        // Small delay between tables
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 MIGRATION COMPLETE!\n');
    console.log('📊 Summary:');

    for (const [table, count] of Object.entries(results)) {
        console.log(`   ${table.padEnd(25)} : ${count} records`);
    }

    console.log('\n   ' + '-'.repeat(40));
    console.log(`   ${'TOTAL'.padEnd(25)} : ${totalMigrated} records`);
    console.log('='.repeat(50));

    console.log('\n✨ Next Steps:');
    console.log('   1. Verify data in Firebase Console');
    console.log('   2. Update Firebase Auth users (see update-user-ids.js)');
    console.log('   3. Test the application locally');
    console.log('   4. Update Firebase security rules\n');
}

// Run migration
migrate()
    .then(() => {
        console.log('✅ Migration script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
