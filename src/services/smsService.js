/**
 * SMS Service for sending ticket confirmations
 * 
 * Campaign ID: 7963690909297775523
 * 
 * This service sends SMS messages with ticket information including:
 * - QR code
 * - Event details
 * - Seat information
 * - Cougar Courtside logo
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/firebase';

// Ensure region matches deployed Cloud Function region
const functionsInstance = getFunctions(app, 'us-central1');

/**
 * Sends ticket confirmation via SMS
 * 
 * @param {string} phoneNumber - Normalized phone number in E.164 format (+1XXXXXXXXXX)
 * @param {Array} tickets - Array of ticket objects
 * @param {string} eventTitle - Event title
 * @param {string} orderIdnpm  - Order ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendTicketSMS(phoneNumber, tickets, eventTitle, orderId) {
  try {
    const smsData = {
      campaignId: '7963690909297775523',
      phoneNumber, // E.164 format +1XXXXXXXXXX
      tickets: tickets.map(t => ({
        ticketId: t.ticketId || t.id,
        seatId: t.seatId,
        qrPayload: t.qrPayload,
        eventTitle: t.eventTitle,
        eventTime: t.startTime
      })),
      eventTitle,
      orderId
    };

    // 1) Try Twilio SMS via callable function (requires functions config and deployment)
    try {
      const callable = httpsCallable(functionsInstance, 'sendTicketSMS');
      const result = await callable({
        phoneNumber: smsData.phoneNumber,
        tickets: smsData.tickets,
        eventTitle: smsData.eventTitle,
        orderId: smsData.orderId
      });
      if (result?.data?.success) {
        return { success: true, message: result.data.message || 'SMS sent' };
      }
      // If Twilio function returned non-success, fall back
      console.warn('sendTicketSMS returned non-success:', result?.data);
    } catch (twilioErr) {
      console.warn('sendTicketSMS callable failed, falling back to push:', twilioErr);
    }

    // 2) Fallback: push notification to registered devices (no cost)
    try {
      const sendNotification = httpsCallable(functionsInstance, 'sendTicketNotification');
      const notifyResult = await sendNotification({
        tickets: smsData.tickets,
        eventTitle: smsData.eventTitle,
        orderId: smsData.orderId
      });
      return {
        success: !!notifyResult?.data?.success,
        message: notifyResult?.data?.success
          ? 'Notification sent to your device'
          : (notifyResult?.data?.message || 'No device registered for notifications')
      };
    } catch (notifyErr) {
      console.warn('sendTicketNotification failed:', notifyErr);
      return {
        success: false,
        message: 'Unable to send SMS or push. You can view your tickets in My Tickets.'
      };
    }
    
  } catch (error) {
    console.error('Error sending ticket SMS:', error);
    return {
      success: false,
      message: 'Failed to send SMS. Please check your tickets in My Tickets.'
    };
  }
}

/**
 * Validates SMS service configuration
 */
export function isSMSConfigured() {
  // Check if SMS service is properly configured
  // This would check for API keys, campaign ID, etc.
  return true; // For now, always return true
}
