const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

// Callable function to send a push notification with ticket info
exports.sendTicketNotification = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { userId, tickets, eventTitle, orderId } = data || {};
    const uid = userId || context.auth.uid;
    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing user id');
    }

    // Read tokens from Firestore
    const ref = admin.firestore().collection('userTokens').doc(uid);
    const snap = await ref.get();
    const tokensMap = snap.exists ? (snap.data().tokens || {}) : {};
    const tokens = Object.keys(tokensMap).filter(Boolean);

    if (!tokens.length) {
      return { success: false, message: 'No device tokens available for user' };
    }

    const seatList = (tickets || []).map(t => t.seatId).join(', ');

    const payload = {
      notification: {
        title: 'Cougar Courtside Tickets',
        body: `${eventTitle} — Seats: ${seatList}`,
        icon: 'https://your-domain.example/cougarCourtsideLOGO.png',
      },
      data: {
        orderId: String(orderId || ''),
        click_action: '/my-tickets'
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: payload.notification,
      data: payload.data,
      webpush: {
        notification: {
          icon: payload.notification.icon,
          badge: payload.notification.icon,
          // Open My Tickets when clicked
          data: { click_action: '/my-tickets' }
        },
        fcmOptions: {
          link: '/my-tickets'
        }
      }
    });

    // Cleanup invalid tokens
    const invalid = [];
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          invalid.push(tokens[idx]);
        }
      }
    });
    if (invalid.length) {
      const updates = {};
      invalid.forEach(tok => updates[`tokens.${tok}`] = admin.firestore.FieldValue.delete());
      await ref.set(updates, { merge: true });
    }

    return { success: true, sent: response.successCount, failed: response.failureCount };
  } catch (e) {
    console.error('sendTicketNotification error', e);
    throw new functions.https.HttpsError('internal', e.message || 'Failed to send notification');
  }
});
