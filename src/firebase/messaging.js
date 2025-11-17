import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { saveFcmTokenForUser } from './firestore';

// Initialize FCM for web and save token for the current user
export async function initMessagingForUser(uid) {
  try {
    if (!uid) {
      console.log('[FCM] No user ID provided');
      return null;
    }
    const supported = await isSupported();
    if (!supported) {
      console.log('[FCM] Not supported in this browser');
      return null;
    }

    const messaging = getMessaging(app);

    // You must set REACT_APP_VAPID_KEY in your environment (from Firebase Console > Cloud Messaging > Web Push certificates)
    const vapidKey = process.env.REACT_APP_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[FCM] Missing REACT_APP_VAPID_KEY; push notifications will be disabled until set.');
      return null;
    }

    // Request permission (browser prompt)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notifications permission not granted');
      return null;
    }

    // Get device token
    const token = await getToken(messaging, { vapidKey });
    if (token) {
      console.log('[FCM] Token obtained, saving to Firestore');
      await saveFcmTokenForUser(uid, token);
      return token;
    } else {
      console.warn('[FCM] No token received');
      return null;
    }
  } catch (e) {
    console.error('[FCM] Failed to initialize messaging:', e);
    return null;
  }
}

// Optional: foreground message handler (set up separately)
export function setupForegroundMessageHandler() {
  try {
    isSupported().then(async (supported) => {
      if (!supported) return;
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        console.log('[FCM] Message received in foreground:', payload);
        // You can show a custom notification here if needed
      });
    });
  } catch (e) {
    console.warn('[FCM] Could not set up foreground handler', e);
  }
}
