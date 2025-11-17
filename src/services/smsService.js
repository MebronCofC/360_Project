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
      to: phoneNumber,
      campaignId: '7963690909297775523',
      phoneNumber,
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

    try {
      // Call Firebase Cloud Function (Firebase-only push notification)
      const sendNotification = httpsCallable(functionsInstance, 'sendTicketNotification');
      const result = await sendNotification({
        tickets: smsData.tickets,
        eventTitle,
        orderId
      });
      return {
        success: !!result?.data?.success,
        message: result?.data?.success ? 'Notification sent to your device' : (result?.data?.message || 'No device registered for notifications')
      };
    } catch (functionError) {
      console.warn('Notification function error:', functionError);
      return {
        success: false,
        message: 'Unable to send push notification. You can view your tickets in My Tickets.'
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
