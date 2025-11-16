#!/usr/bin/env node
/**
 * Backfill Firestore `users` collection from existing Firebase Authentication users.
 *
 * Fields written per user document:
 *  - uid
 *  - email
 *  - provider (first provider: 'google' or 'email')
 *  - accountCreatedAt (Date -> Firestore Timestamp)
 *  - lastSignInAt (Date -> Firestore Timestamp)
 *  - updatedAt (serverTimestamp)
 *
 * We DO NOT store passwords or sensitive provider details.
 *
 * Usage:
 *   node scripts/backfillUsers.js --credentials /path/to/serviceAccount.json [--dry-run]
 *
 * Or set GOOGLE_APPLICATION_CREDENTIALS env var:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   npm run backfill:users
 *
 * Options:
 *  --credentials <file>   Path to service account JSON (if not using env var)
 *  --batch <n>            Max write batch size (default 400)
 *  --dry-run              Do not write, just log what would happen
 *
 * Service account JSON should be kept OUT of version control.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parse args
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}
const credPath = getArg('--credentials') || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const dryRun = args.includes('--dry-run');
const batchLimit = parseInt(getArg('--batch') || '400', 10);

if (!credPath) {
  console.error('Missing credentials. Pass --credentials <file> or set GOOGLE_APPLICATION_CREDENTIALS env variable.');
  process.exit(1);
}
if (!fs.existsSync(credPath)) {
  console.error('Credentials file not found:', credPath);
  process.exit(1);
}

const serviceAccount = require(path.resolve(credPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function backfill() {
  console.log('Starting backfill of users collection...');
  let nextPageToken = undefined;
  let totalProcessed = 0;
  let totalWritten = 0;
  let totalSkipped = 0;

  while (true) {
    const listResult = await auth.listUsers(1000, nextPageToken);
    const users = listResult.users;
    if (!users.length) break;

    // Prepare batch
    let batch = db.batch();
    let batchCount = 0;

    for (const user of users) {
      totalProcessed++;
      const docRef = db.collection('users').doc(user.uid);
      const snap = await docRef.get();

      // Provider determination
      const providerIds = (user.providerData || []).map(p => p.providerId);
      const usedGoogle = providerIds.includes('google.com');
      const provider = usedGoogle ? 'google' : 'email';

      // Auth metadata times are ISO strings; convert to Date for Firestore
      const creationTimeStr = user.metadata?.creationTime;
      const lastSignInTimeStr = user.metadata?.lastSignInTime;
      const creationDate = creationTimeStr ? new Date(creationTimeStr) : new Date();
      const lastSignInDate = lastSignInTimeStr ? new Date(lastSignInTimeStr) : new Date();

      if (snap.exists) {
        // Skip if doc already has core fields (uid + email)
        const data = snap.data() || {};
        if (data.uid && data.email) {
          totalSkipped++;
          continue;
        }
      }

      const writeData = {
        uid: user.uid,
        email: user.email || null,
        provider,
        accountCreatedAt: creationDate,
        lastSignInAt: lastSignInDate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (dryRun) {
        console.log('[DRY RUN] Would upsert:', writeData);
        continue;
      }

      batch.set(docRef, writeData, { merge: true });
      batchCount++;
      totalWritten++;

      if (batchCount >= batchLimit) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} writes (running total written: ${totalWritten}).`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining writes in batch
    if (!dryRun && batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} writes for this page.`);
    }

    nextPageToken = listResult.pageToken;
    if (!nextPageToken) break;
  }

  console.log('Backfill complete.');
  console.log({ totalProcessed, totalWritten, totalSkipped, dryRun });
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
