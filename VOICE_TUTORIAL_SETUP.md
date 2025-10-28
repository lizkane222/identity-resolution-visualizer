# Voice Tutorial Setup Guide

## Overview
The Voice Tutorial feature allows users to receive an automated phone call that walks them through the Identity Resolution Visualizer features using Twilio Studio Flow.

## What's Been Implemented

### Frontend Components ✅
- **VoiceTutorial.jsx** - Modal component with phone number input
  - Auto-formats phone numbers to (XXX) XXX-XXXX format
  - Validates 10-digit US phone numbers
  - Shows loading spinner during API call
  - Displays success/error messages
  - Auto-closes after successful call initiation

- **VoiceTutorial.css** - Professional modal styling
  - Purple gradient theme matching app design
  - Responsive design (mobile & desktop)
  - Smooth animations

- **App.jsx Integration** - Voice Tutorial button in navbar
  - Purple gradient button between "Lookup" and "Visualize"
  - Opens modal on click
  - State management with `showVoiceTutorial`

- **App.css** - Button styling for Voice Tutorial button

- **phone.svg** - Phone icon for the button

### Backend API ✅
- **POST /api/twilio/start-tutorial** endpoint in `server/server.js`
  - Accepts: `{ to: "+1XXXXXXXXXX", flowSid: "FW8b38713dcf3b2cb224d6b3a7a511f4d3" }`
  - Initializes Twilio client with credentials from environment
  - Creates Studio Flow execution to initiate call
  - Returns success/error response with execution details
  - Includes comprehensive error handling and logging

## Setup Instructions

### 1. Install Twilio SDK
```bash
npm install twilio
```

### 2. Configure Twilio Credentials
Add the following variables to your `.env` file in the project root:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

### 3. Get Your Twilio Credentials

**Account SID and Auth Token:**
1. Go to [Twilio Console](https://console.twilio.com/)
2. Your Account SID and Auth Token are displayed on the dashboard
3. Copy them to your `.env` file

**Phone Number:**
1. Go to [Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming) in Twilio Console
2. If you don't have a phone number, purchase one with Voice capabilities
3. Copy the phone number in E.164 format (e.g., `+15551234567`) to your `.env` file

**Studio Flow SID:**
- Already configured: `FW8b38713dcf3b2cb224d6b3a7a511f4d3`
- Your Studio Flow URL: https://console.twilio.com/us1/service/studio/FW8b38713dcf3b2cb224d6b3a7a511f4d3/studio-flow-instance-canvas
- REST API URL: https://studio.twilio.com/v2/Flows/FW8b38713dcf3b2cb224d6b3a7a511f4d3/Executions
- Webhook URL: https://webhooks.twilio.com/v1/Accounts/YOUR_ACCOUNT_SID/Flows/FW8b38713dcf3b2cb224d6b3a7a511f4d3

### 4. Verify Studio Flow
1. Go to your [Studio Flow](https://console.twilio.com/us1/service/studio/FW8b38713dcf3b2cb224d6b3a7a511f4d3/studio-flow-instance-canvas)
2. Ensure the flow is published (not in draft mode)
3. Test the flow using Twilio's test feature if desired

### 5. Start the Server
```bash
npm run dev
```

You should see:
```
✅ Twilio configuration loaded - Voice Tutorial feature available
```

If you see a warning instead, check that your `.env` file has all three required variables.

## How It Works

### User Flow
1. User clicks "Voice Tutorial" button in the navbar
2. Modal opens with phone number input field
3. User enters their 10-digit US phone number
4. Number is auto-formatted as they type: (XXX) XXX-XXXX
5. User clicks "Start Tutorial" button
6. App sends POST request to `/api/twilio/start-tutorial`
7. Server initiates Twilio Studio Flow execution
8. User receives phone call within seconds
9. Studio Flow guides user through tutorial
10. Modal shows success message and auto-closes

### Technical Flow
```
Frontend (VoiceTutorial.jsx)
    ↓
POST /api/twilio/start-tutorial
    ↓ { to: "+1XXXXXXXXXX", flowSid: "FW8b..." }
Backend (server.js)
    ↓
Twilio SDK
    ↓ client.studio.v2.flows(flowSid).executions.create()
Twilio Studio Flow
    ↓
Phone Call to User
```

## API Endpoint Details

### Request
```http
POST /api/twilio/start-tutorial
Content-Type: application/json

{
  "to": "+15551234567",
  "flowSid": "FW8b38713dcf3b2cb224d6b3a7a511f4d3"
}
```

### Success Response
```json
{
  "success": true,
  "message": "Voice tutorial call initiated successfully",
  "executionSid": "FN..."
}
```

### Error Responses

**Missing Credentials (500)**
```json
{
  "error": "Twilio is not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your .env file."
}
```

**Twilio SDK Not Installed (500)**
```json
{
  "error": "Twilio SDK is not installed. Run: npm install twilio"
}
```

**Invalid Request (400)**
```json
{
  "error": "Missing required fields: to and flowSid are required"
}
```

**Twilio API Error (400)**
```json
{
  "error": "Twilio Error 21xxx: [Twilio error message]"
}
```

## Testing

### Test the Frontend
1. Start the dev server: `npm run dev`
2. Click the "Voice Tutorial" button in the navbar
3. Enter a test phone number
4. Verify the modal UI and formatting

### Test the Backend
Use curl or Postman:
```bash
curl -X POST http://localhost:8888/api/twilio/start-tutorial \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "flowSid": "FW8b38713dcf3b2cb224d6b3a7a511f4d3"
  }'
```

### Test End-to-End
1. Enter your real phone number in the modal
2. Click "Start Tutorial"
3. You should receive a phone call within 10-30 seconds
4. Follow the Studio Flow prompts

## Troubleshooting

### "Twilio is not configured" Error
- Check that `.env` file exists in project root
- Verify all three variables are set: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Restart the server after adding environment variables

### "Twilio SDK is not installed" Error
- Run `npm install twilio`
- Restart the server

### No Phone Call Received
- Verify phone number format: Must be E.164 (+1XXXXXXXXXX for US)
- Check Twilio Console for execution logs
- Ensure Studio Flow is published (not draft)
- Verify `TWILIO_PHONE_NUMBER` has Voice capabilities
- Check Twilio account balance if using trial account

### Invalid Phone Number Error
- Twilio trial accounts can only call verified numbers
- Upgrade to paid account or verify number in Twilio Console

### Studio Flow Not Found Error
- Verify Flow SID: `FW8b38713dcf3b2cb224d6b3a7a511f4d3`
- Check that the flow exists in your Twilio account
- Ensure the flow is in the same Twilio account as your credentials

## Customization

### Change Studio Flow
To use a different Studio Flow, update the `flowSid` in:
- `src/components/VoiceTutorial/VoiceTutorial.jsx` (line ~80)

### Customize Button Styling
Edit styles in:
- `src/App.css` (search for `.app__tutorial-button`)

### Add International Support
Modify phone validation in `VoiceTutorial.jsx`:
- Update `formatPhoneNumber` function for different formats
- Update validation logic in `handleStartTutorial`
- Add country code selector if needed

## File Locations

### Frontend
- `src/components/VoiceTutorial/VoiceTutorial.jsx` - Modal component
- `src/components/VoiceTutorial/VoiceTutorial.css` - Modal styles
- `src/App.jsx` - Integration (state, button, modal render)
- `src/App.css` - Button styling
- `public/assets/phone.svg` - Phone icon

### Backend
- `server/server.js` - API endpoint (lines 605-680)
- `.env` - Configuration file (you need to create/update this)

## Resources
- [Twilio Console](https://console.twilio.com/)
- [Studio Flow Dashboard](https://console.twilio.com/us1/service/studio/FW8b38713dcf3b2cb224d6b3a7a511f4d3/studio-flow-instance-canvas)
- [Twilio Studio Documentation](https://www.twilio.com/docs/studio)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)

## Next Steps
1. Install Twilio SDK: `npm install twilio`
2. Add credentials to `.env` file
3. Verify Studio Flow is published
4. Test with your phone number
5. Customize Studio Flow content as needed
