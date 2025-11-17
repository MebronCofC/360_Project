# SMS Ticket Delivery Setup Guide

This guide explains how to set up SMS ticket delivery for Cougar Courtside.

## Overview

When users purchase tickets, they are now required to provide a phone number. After successful purchase, an SMS is sent containing:
- Event details
- Seat information
- Link to view QR codes
- Cougar Courtside branding

**Campaign ID**: 7963690909297775523

## Features Implemented

### 1. Phone Number Validation
- Accepts multiple formats:
  - `(843) 555-5555`
  - `843-555-5555`
  - `8435555555`
  - `+1 843-555-5555`
- Automatically normalizes to E.164 format (`+18435555555`)
- Real-time validation with error messages

### 2. SMS Service Integration
- Firebase Cloud Functions ready
- Twilio integration template provided
- Graceful fallback if service not yet deployed

## Setup Instructions

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Firebase Functions

```bash
cd "/Users/mebronjc/Downloads/360_Project-main 2"
firebase init functions
```

Select:
- Use existing project: `authenticaiton-tutorial-28fc2`
- Language: JavaScript
- ESLint: Yes
- Install dependencies: Yes

### Step 3: Set Up Twilio Account

1. Go to [Twilio](https://www.twilio.com/) and create an account
2. Get your credentials:
   - Account SID
   - Auth Token
   - Twilio Phone Number

### Step 4: Configure Twilio in Firebase

Choose ONE authentication method:

- Recommended (API Key) — safer than master Auth Token

```bash
firebase functions:config:set twilio.api_key_sid="YOUR_API_KEY_SID"
firebase functions:config:set twilio.api_key_secret="YOUR_API_KEY_SECRET"
firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID"
firebase functions:config:set twilio.phone_number="YOUR_TWILIO_PHONE" # format: +1XXXXXXXXXX
```

- Alternative (Account SID + Auth Token)

```bash
firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID"
firebase functions:config:set twilio.auth_token="YOUR_AUTH_TOKEN"
firebase functions:config:set twilio.phone_number="YOUR_TWILIO_PHONE" # format: +1XXXXXXXXXX
```

### Step 5: Install Dependencies

```bash
cd functions
npm install twilio
npm install firebase-admin
npm install firebase-functions
```

### Step 6: Copy Cloud Function Code

Copy the contents of `functions/sendTicketSMS.js` to `functions/index.js` in your Firebase Functions directory.

### Step 7: Deploy Cloud Function

```bash
firebase deploy --only functions:sendTicketSMS
```

### Step 8: Update CORS Settings (if needed)

If you get CORS errors, update your Firebase Functions region in `src/services/smsService.js`:

```javascript
const functions = getFunctions(app, 'us-central1'); // or your region
```

## Testing

### Test Phone Number Validation

1. Go to checkout page
2. Try these formats:
   - `8435555555` ✓
   - `843-555-5555` ✓
   - `(843) 555-5555` ✓
   - `+1 843-555-5555` ✓
   - `123` ✗ (should show error)

### Test SMS Sending

1. Complete a ticket purchase with a valid phone number
2. Check that:
   - Success message shows SMS was sent
   - Phone number is formatted correctly
   - (If deployed) SMS is received on the phone

## File Structure

```
src/
├── utils/
│   └── phoneUtils.js          # Phone validation & formatting
├── services/
│   └── smsService.js          # SMS sending logic
└── components/
    └── checkout/
        └── index.jsx          # Updated with phone input

functions/
└── sendTicketSMS.js          # Firebase Cloud Function template
```

## Cost Considerations

- Twilio SMS pricing: ~$0.0079 per message (US)
- Firebase Functions: Free tier includes 2M invocations/month
- Estimate: $0.01 per ticket purchase

## Future Enhancements

1. **MMS Support**: Send QR code images directly in SMS
2. **Delivery Reports**: Track SMS delivery status
3. **International Numbers**: Support non-US phone numbers
4. **WhatsApp Integration**: Alternative delivery method
5. **Email Fallback**: If SMS fails, send email

## Troubleshooting

### "Cloud Function not available" message
- The Cloud Function hasn't been deployed yet
- Follow deployment steps above
- Tickets are still created successfully

### Phone validation not working
- Check console for errors
- Verify `phoneUtils.js` is imported correctly
- Test with different number formats

### SMS not received
- Check Twilio console for message status
- Verify phone number is correct
- Check Twilio account balance
- If using API Key, ensure twilio.api_key_sid and twilio.api_key_secret are both set (and twilio.account_sid)
- Review Firebase Functions logs: `firebase functions:log`

## Security Notes

- Never commit Twilio credentials to Git
- Use Firebase config for sensitive data
- Validate user authentication before sending SMS
- Rate limit SMS sending to prevent abuse

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Review Twilio message logs
3. Check browser console for errors
4. Verify all environment variables are set
