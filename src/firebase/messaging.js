import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { saveFcmTokenForUser } from './firestore';

// Initialize FCM for web and save token for the current user
export async function initMessagingForUser(uid) {
  try {
    if (!uid) return;
    const supported = await isSupported();
    if (!supported) return;

    const messaging = getMessaging(app);

    // You must set REACT_APP_VAPID_KEY in your environment (from Firebase Console > Cloud Messaging > Web Push certificates)
    const vapidKey = process.env.REACT_APP_VAPID_KEY;
    if (!vapidKey) {
      console.warn('Missing REACT_APP_VAPID_KEY; push notifications will be disabled until set.');
      return;
    }

    // Request permission (browser prompt)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notifications permission not granted');
      return;
    }

    // Get device token
    const token = await getToken(messaging, { vapidKey });
    if (token) {
      await saveFcmTokenForUser(uid, token);
    }

    // Optional: foreground message handler
    onMessage(messaging, (payload) => {
      console.log('[FCM] Message received in foreground:', payload);
    });
  } catch (e) {
    console.warn('Failed to initialize FCM messaging', e);
  }
}
