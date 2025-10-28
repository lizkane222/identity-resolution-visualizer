# Studio Flow Export Setup Guide

This guide shows you how to set up Twilio Studio Flow to send exports, which bypasses A2P 10DLC restrictions for trial accounts.

## Why Use Studio Flow?

**Problem**: Direct Messaging API requires A2P 10DLC registration for US long-code numbers
**Solution**: Studio Flow has less strict restrictions and works with trial accounts

## Step-by-Step Setup

### Step 1: Create the Studio Flow

1. Go to [Twilio Studio](https://console.twilio.com/us1/develop/studio/flows)
2. Click **"+ Create new Flow"**
3. **Name**: `Identity Resolution Exports`
4. Choose **"Start from scratch"**
5. Click **"Next"**

### Step 2: Configure the Trigger

1. Click on the **"Trigger"** widget (red circle at top)
2. In the configuration panel on the right:
   - Check ✅ **"REST API"**
   - This allows your app to trigger the flow programmatically
3. Leave other triggers unchecked (unless you want to test manually)

### Step 3: Add Send Message Widget

1. From the **widget library** on the right side, find **"Send Message"**
2. **Drag** it onto the canvas
3. **Connect** the trigger to this widget:
   - Click the small red circle next to "Incoming Message" on the Trigger
   - Drag the line to the "Send Message" widget

### Step 4: Configure Send Message Widget

Click on the "Send Message" widget and configure:

#### Widget Name
```
send_export
```

#### Message Body
Click "Insert variable" button and use:
```
{{trigger.message.Body}}
```

Or type this manually in the text box:
```
{{trigger.message.Body}}
```

#### From (Phone Number)
Select your Twilio phone number from the dropdown:
```
+14157070208
```

#### To (Recipient)
Click "Insert variable" and use:
```
{{trigger.message.To}}
```

Or type manually:
```
{{trigger.message.To}}
```

### Step 5: Add Success Path (Optional)

1. The "Send Message" widget has transitions: **Sent** and **Failed to Send**
2. You can leave **Sent** unconnected (flow will end automatically)
3. Or drag another widget to handle success (like logging)

### Step 6: Add Error Handler (Optional)

1. Drag another **"Send Message"** widget
2. Connect the **"Failed to Send"** transition to it
3. Configure it to send an error notification back to your server

### Step 7: Publish the Flow

1. Click **"Publish"** button at the top right
2. Confirm the publication
3. ✅ Your flow is now live!

### Step 8: Copy the Flow SID

1. After publishing, look at the URL in your browser
2. It will look like: `https://console.twilio.com/us1/service/studio/FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/...`
3. Copy the part that starts with **`FW`** (this is your Flow SID)
4. Example: `FW1234567890abcdef1234567890abcdef`

### Step 9: Add Flow SID to .env File

1. Open your `.env` file in the project root
2. Add this line:

```bash
TWILIO_EXPORT_FLOW_SID=FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Replace `FWxxx...` with your actual Flow SID from Step 8.

Your `.env` should now have:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+14157070208
TWILIO_EXPORT_FLOW_SID=FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 10: Restart Your Server

```bash
npm run dev
```

You should see in the console:
```
Server running on port 8888
✅ Segment configuration loaded
✅ Twilio configuration loaded - Voice Tutorial feature available
✅ Twilio Export Flow configured
```

## How It Works

### With Studio Flow (Recommended):
```
App → Server → Studio Flow → SMS to Phone
```

### Without Studio Flow (Requires A2P):
```
App → Server → Direct Messaging API → SMS to Phone (❌ Blocked on trial)
```

## Testing

1. In your app, click the phone number button
2. Select an export type (e.g., "Event List")
3. Check the server logs - you should see:
   ```
   📱 Using Studio Flow for export: FWxxx...
   ✅ Export sent via Studio Flow
   Execution SID: FNxxx...
   Status: active
   ```
4. Check your phone for the SMS (should arrive within seconds)

## Troubleshooting

### "TWILIO_EXPORT_FLOW_SID not configured"
- Add the Flow SID to your `.env` file
- Restart the server

### "Flow not found"
- Verify the Flow SID is correct
- Make sure the flow is **Published** (not draft)
- Check that the Flow exists in the same Twilio account

### "Failed to Send" in Studio Flow logs
- Go to **Studio** → **Your Flow** → **Logs**
- Check the execution logs for error details
- Common issues:
  - Phone number format (must be +1XXXXXXXXXX)
  - Unverified phone number (trial accounts)
  - Invalid message content

### Still getting A2P errors
- Verify you added the Flow SID to `.env`
- Restart the server completely
- Check server logs to confirm it's using Studio Flow

### Messages not arriving
1. **Verify phone number** (trial accounts only):
   - Go to [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
   - Add +16692418922
   - Complete verification

2. **Check Studio Flow execution logs**:
   - Go to **Studio** → **Your Flow** → **Logs**
   - Find recent executions
   - Check status and error messages

3. **Check Messaging logs**:
   - Go to **Monitor** → **Logs** → **Messaging**
   - Look for messages from your flow
   - Check delivery status

## Advanced Configuration

### Custom Message Format

Edit the "Send Message" widget's Body to customize:

```
🎯 Identity Resolution Export

Type: {{trigger.exportType}}
File: {{trigger.fileName}}

{{trigger.message.Body}}

---
Sent from Identity Resolution Visualizer
```

### Add Data Validation

Add a **"Split Based On..."** widget before sending:
- Check if message is too long
- Validate phone number format
- Route based on export type

### Add Confirmation

Add a **"Send & Wait for Reply"** widget:
- Send the export
- Wait for user confirmation
- Track engagement

## Cost Comparison

### Direct Messaging API
- ~$0.0079 per SMS
- Requires A2P registration (~$14/month)
- **Total**: ~$14.0079/month + message costs

### Studio Flow
- ~$0.0079 per SMS (same)
- No A2P registration required
- Studio Flow execution: FREE
- **Total**: Just message costs (~$0.0079 per export)

## Studio Flow Visual Reference

Your flow should look like this:

```
┌─────────────────┐
│    Trigger      │
│  [REST API ✓]   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  send_export    │
│ (Send Message)  │
│                 │
│ Body: {{...}}   │
│ From: +1415...  │
│ To: {{...}}     │
└────┬──────┬─────┘
     │      │
  Sent│     │Failed
     ↓      ↓
   [End] [Error?]
```

## Next Steps

1. ✅ Set up Studio Flow (Steps 1-9)
2. ✅ Test with trial account
3. 📱 Verify recipient phone numbers
4. 🚀 Start sending exports!

## Alternative: Upgrade Account

If you want to use Direct Messaging API instead:

1. Go to **Billing** → **Upgrade Account**
2. Add payment method
3. Register for A2P 10DLC (~$14/month)
4. No Studio Flow needed

Studio Flow is cheaper and faster for trial accounts!

## Support Resources

- [Studio Flow Documentation](https://www.twilio.com/docs/studio)
- [REST API Trigger](https://www.twilio.com/docs/studio/rest-api/v2/execution)
- [Send Message Widget](https://www.twilio.com/docs/studio/widget-library#send-message)
- [Trial Account Limits](https://support.twilio.com/hc/en-us/articles/223136107)
