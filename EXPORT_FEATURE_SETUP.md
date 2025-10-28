# Export Feature Setup Guide

This guide explains how to configure and use the SMS/MMS export feature to send data from the Identity Resolution Visualizer to a phone number.

## Overview

The export feature allows you to send various types of data (events, user profiles, API results) directly to a phone number via SMS using Twilio.

## Prerequisites

✅ **Already Configured:**
- Twilio Account SID
- Twilio Auth Token  
- Twilio Phone Number

## Twilio Console Setup

### 1. Verify MMS Capabilities

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your phone number: `+14157070208`
4. Check the **Capabilities** section
5. Verify that **SMS** is enabled (MMS is optional for text-only exports)

### 2. Trial Account Limitations

If you're still on a **trial account**, you need to:

1. Navigate to **Phone Numbers** → **Verified Caller IDs**
2. Click **Add a new Caller ID**
3. Enter the phone number that will receive exports
4. Complete the verification process (you'll receive a call or SMS with a code)

**Trial Account Restrictions:**
- Can only send to verified phone numbers
- Limited to 500 SMS per month
- Twilio branding included in messages
- Cannot send to international numbers (US/Canada only)

### 3. Upgrade to Production (Optional)

To remove trial limitations:

1. Go to **Account** → **Billing**
2. Click **Upgrade Account**
3. Add payment method
4. Complete the upgrade process

**Production Benefits:**
- Send to any phone number
- No Twilio branding
- Higher volume limits
- International messaging (if enabled)

### 4. Optional: Create Messaging Service

For better deliverability and features:

1. Go to **Messaging** → **Services**
2. Click **Create Messaging Service**
3. Name it: "Identity Resolution Exports"
4. Add your Twilio phone number to the sender pool
5. Configure settings:
   - **Use Case**: Notifications
   - **Content Type**: Transactional
6. Save the Messaging Service SID

If you create a Messaging Service, add to `.env`:
```bash
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then update the backend to use it (optional enhancement).

## How It Works

### Backend Endpoint

The export feature uses the `/api/twilio/send-export` endpoint:

**Request:**
```json
{
  "to": "+14155551234",
  "exportType": "EVENTS",
  "data": {...},
  "fileName": "events-2025-10-27.json"
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "timestamp": "2025-10-27T22:30:00.000Z"
}
```

### Export Types Available

1. **Event List** - All events in the event builder
2. **Current User** - Current user context/state
3. **Unique Users** - List of all unique users tracked
4. **Profile Results** - Profile API lookup results
5. **Full Export** - All data combined

### Data Format

Exports are sent as JSON text in SMS messages:

```
Identity Resolution Export
Type: EVENTS
File: events-2025-10-27.json

[
  {
    "id": "evt_123",
    "event": "Page Viewed",
    ...
  }
]
```

**Message Limits:**
- SMS: Up to 1600 characters (concatenated messages)
- Long data is truncated with preview in SMS

## Usage

1. **Set Up Phone Number:**
   - Click **Voice Tutorial** button in navbar
   - Enter your phone number
   - Complete the voice tutorial (this saves your number)

2. **Access Export Dropdown:**
   - After completing tutorial, phone number button appears in navbar
   - Click the phone number button to open export dropdown

3. **Select Export Type:**
   - Choose what data to export
   - Data is sent immediately via SMS

4. **Check Your Phone:**
   - You'll receive an SMS with the export data
   - May arrive as multiple messages if data is large

## Costs

**Twilio Pricing (US/Canada):**
- SMS: ~$0.0079 per message
- MMS: ~$0.02 per message (for future file attachments)

**Trial Credits:**
- New accounts get $15.50 in free credits
- Enough for ~1,900 SMS messages

## Troubleshooting

### "Failed to send export"

**Solution:** Check that:
1. Phone number is verified in Twilio (trial accounts)
2. Your Twilio credentials are correct in `.env`
3. You have remaining credits/balance in Twilio account

### "Phone number not configured"

**Solution:** Verify `.env` has:
```bash
TWILIO_PHONE_NUMBER=+14157070208
```

### Not receiving messages

**Solution:**
1. Check Twilio Console → **Monitor** → **Logs** → **Messaging**
2. Look for the message SID from the export response
3. Check delivery status (queued, sent, delivered, failed)
4. Verify recipient number is correct format: `+1XXXXXXXXXX`

### Rate limiting errors

**Solution:**
1. Twilio has rate limits (1 msg/second for trial)
2. Wait a few seconds between exports
3. Upgrade account for higher limits

## Future Enhancements

Potential improvements to consider:

1. **File Attachments via MMS:**
   - Upload JSON to cloud storage (S3, Cloudinary)
   - Send download link or direct MMS attachment
   
2. **Message History:**
   - Track sent exports in localStorage
   - Display history in dropdown

3. **Export Scheduling:**
   - Schedule daily/weekly exports
   - Automated report delivery

4. **Multiple Recipients:**
   - Save multiple phone numbers
   - Send to team members

5. **Export Formatting:**
   - CSV option for spreadsheet import
   - HTML formatted reports
   - PDF generation

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to git (already in `.gitignore`)
- Phone numbers are stored in localStorage (client-side only)
- Consider adding authentication for production use
- Data is sent via SMS (not encrypted in transit)
- SMS is visible to carrier and may be logged

## API Reference

### POST /api/twilio/send-export

Sends export data to a phone number via SMS.

**Headers:**
```
Content-Type: application/json
```

**Body Parameters:**
- `to` (string, required): Phone number in E.164 format (+1XXXXXXXXXX)
- `exportType` (string, required): Type of export (EVENTS, CURRENT USER, etc.)
- `data` (any, required): Data to export (object or array)
- `fileName` (string, optional): Name for the export file

**Success Response (200):**
```json
{
  "success": true,
  "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "timestamp": "2025-10-27T22:30:00.000Z"
}
```

**Error Response (400/500):**
```json
{
  "error": "Failed to send export",
  "details": "Phone number (to) is required"
}
```

## Testing

Test the export feature:

1. Verify your phone number in Twilio Console (trial accounts)
2. Complete Voice Tutorial to save your number
3. Click phone number button in navbar
4. Select "Event List" export (smallest dataset)
5. Check your phone for SMS

Monitor in Twilio Console:
- **Monitor** → **Logs** → **Messaging** to see delivery status
- **Usage** → **Messages** to track costs

## Support

For Twilio-specific issues:
- [Twilio SMS Docs](https://www.twilio.com/docs/sms)
- [Twilio Support](https://support.twilio.com/)
- [Twilio Status](https://status.twilio.com/)

For app issues:
- Check browser console for errors
- Check server logs for backend errors
- Verify Twilio credentials in `.env`
