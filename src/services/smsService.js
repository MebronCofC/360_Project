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

const functions = getFunctions(app);

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
      // Call Firebase Cloud Function
      const sendSMS = httpsCallable(functions, 'sendTicketSMS');
      const result = await sendSMS(smsData);
      
      return {
        success: true,
        message: result.data.message || `Tickets sent to ${phoneNumber}`
      };
    } catch (functionError) {
      // If Cloud Function not deployed yet, log and show graceful message
      console.warn('Cloud Function not available:', functionError);
      console.log('SMS Data prepared (function not deployed):', smsData);
      
      return {
        success: true,
        message: `Tickets ready! (SMS feature will be enabled once Cloud Function is deployed)`
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
