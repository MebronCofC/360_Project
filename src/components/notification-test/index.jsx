import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/authContext';
import { initMessagingForUser } from '../../firebase/messaging';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '../../firebase/firebase';

export default function NotificationTest() {
  const { currentUser } = useAuth();
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState('default');
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    setLoading(true);
    setTestResult('Requesting notification permission...');
    try {
      const fcmToken = await initMessagingForUser(currentUser?.uid);
      if (fcmToken) {
        setToken(fcmToken);
        setPermission('granted');
        setTestResult(`✅ Success! Token registered:\n${fcmToken.substring(0, 50)}...`);
      } else {
        setTestResult('❌ Failed to get token. Check console for errors.');
      }
    } catch (e) {
      setTestResult(`❌ Error: ${e.message}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!currentUser) {
      setTestResult('❌ You must be logged in');
      return;
    }

    setLoading(true);
    setTestResult('Sending test notification...');
    
    try {
      const functions = getFunctions(app, 'us-central1');
      const sendNotification = httpsCallable(functions, 'sendTicketNotification');
      
      const result = await sendNotification({
        tickets: [{
          ticketId: 'test-123',
          seatId: 'TEST-A1',
          qrPayload: 'test-qr-code',
          eventTitle: 'Test Event',
          eventTime: new Date().toISOString()
        }],
        eventTitle: 'Test Event',
        orderId: 'test-order-123'
      });

      if (result.data.success) {
        setTestResult(`✅ Notification sent!\nSent: ${result.data.sent}\nFailed: ${result.data.failed}`);
      } else {
        setTestResult(`⚠️ ${result.data.message || 'No tokens available'}`);
      }
    } catch (e) {
      setTestResult(`❌ Error: ${e.message}`);
      console.error('Full error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-12">
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold mb-6">🔔 Notification Test Center</h1>
        
        {!currentUser ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">⚠️ You must be logged in to test notifications</p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Current User:</strong> {currentUser.email}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>UID:</strong> {currentUser.uid}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Notification Permission:</strong>{' '}
                <span className={permission === 'granted' ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                  {permission}
                </span>
              </p>
            </div>

            {token && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>FCM Token Registered:</strong>
                </p>
                <p className="text-xs text-gray-500 font-mono break-all">
                  {token}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-3">Step 1: Register Your Device</h2>
                <button
                  onClick={handleRequestPermission}
                  disabled={loading || permission === 'granted'}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    permission === 'granted'
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {permission === 'granted' ? '✅ Already Registered' : '🔔 Enable Notifications'}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  This will request browser permission and save your device token to Firestore
                </p>
              </div>

              {permission === 'granted' && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Step 2: Send Test Notification</h2>
                  <button
                    onClick={handleSendTestNotification}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:bg-gray-400"
                  >
                    {loading ? '⏳ Sending...' : '📤 Send Test Notification'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    This calls the Firebase Cloud Function to send a push notification
                  </p>
                </div>
              )}

              {testResult && (
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold mb-2">Result:</h3>
                  <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
                </div>
              )}
            </div>

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold mb-2">🔍 Debugging Checklist:</h3>
              <ul className="text-sm space-y-2">
                <li>✓ Check browser console (F12) for [FCM] logs</li>
                <li>✓ Make sure .env file has REACT_APP_VAPID_KEY set</li>
                <li>✓ Check Firestore database → userTokens collection for your UID</li>
                <li>✓ Check Firebase Console → Functions → Logs for sendTicketNotification errors</li>
                <li>✓ Verify your browser supports notifications (Chrome, Firefox, Edge)</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
