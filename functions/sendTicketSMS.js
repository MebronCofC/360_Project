/**
 * Firebase Cloud Function for sending ticket SMS
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Initialize functions: firebase init functions
 * 3. Install Twilio: cd functions && npm install twilio
 * 4. Set Twilio credentials:
 *    firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID"
 *    firebase functions:config:set twilio.auth_token="YOUR_AUTH_TOKEN"
 *    firebase functions:config:set twilio.phone_number="YOUR_TWILIO_NUMBER"
 * 5. Deploy: firebase deploy --only functions
 * 
 * Campaign ID: 7963690909297775523
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * HTTP Cloud Function to send ticket SMS
 * Call this from your frontend after successful ticket purchase
 */
exports.sendTicketSMS = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to send tickets.'
      );
    }

    const { phoneNumber, tickets, eventTitle, orderId } = data;

    // Validate required fields
    if (!phoneNumber || !tickets || !eventTitle || !orderId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields.'
      );
    }

    // Initialize Twilio client
    const accountSid = functions.config().twilio.account_sid;
    const authToken = functions.config().twilio.auth_token;
    const twilioNumber = functions.config().twilio.phone_number;
    
    const client = twilio(accountSid, authToken);

    // Generate message
    const seatList = tickets.map(t => t.seatId).join(', ');
    const message = `🎟️ Your Cougar Courtside Tickets!

Event: ${eventTitle}
Seats: ${seatList}
Order: ${orderId}

Show your QR code at the gate for entry.

View your tickets: https://your-app-url.web.app/my-tickets

Go Cougars! 🏀`;

    // Send SMS via Twilio
    const smsResponse = await client.messages.create({
      body: message,
      from: twilioNumber,
      to: phoneNumber,
      // Optional: Add campaign tracking
      // messagingServiceSid: '7963690909297775523' // if using Messaging Service
    });

    // Log the SMS send
    await admin.firestore().collection('smsLogs').add({
      orderId,
      phoneNumber,
      eventTitle,
      ticketCount: tickets.length,
      twilioSid: smsResponse.sid,
      status: smsResponse.status,
      userId: context.auth.uid,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: `Tickets sent to ${phoneNumber}`,
      twilioSid: smsResponse.sid
    };

  } catch (error) {
    console.error('Error sending ticket SMS:', error);
    
    // Log the error
    await admin.firestore().collection('smsErrors').add({
      error: error.message,
      data,
      userId: context.auth?.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send SMS: ' + error.message
    );
  }
});

/**
 * Alternative: HTTP endpoint version (if using REST instead of callable function)
 */
exports.sendTicketSMSHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { phoneNumber, tickets, eventTitle, orderId } = req.body;

    // Initialize Twilio
    const accountSid = functions.config().twilio.account_sid;
    const authToken = functions.config().twilio.auth_token;
    const twilioNumber = functions.config().twilio.phone_number;
    
    const client = twilio(accountSid, authToken);

    const seatList = tickets.map(t => t.seatId).join(', ');
    const message = `🎟️ Your Cougar Courtside Tickets!

Event: ${eventTitle}
Seats: ${seatList}
Order: ${orderId}

Show your QR code at the gate for entry.

Go Cougars! 🏀`;

    const smsResponse = await client.messages.create({
      body: message,
      from: twilioNumber,
      to: phoneNumber
    });

    res.status(200).json({
      success: true,
      message: `Tickets sent to ${phoneNumber}`,
      twilioSid: smsResponse.sid
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
