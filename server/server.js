const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 8888;

// Create temp directory for PDFs if it doesn't exist
const TEMP_PDF_DIR = path.join(__dirname, '../temp_pdfs');
if (!fs.existsSync(TEMP_PDF_DIR)) {
  fs.mkdirSync(TEMP_PDF_DIR, { recursive: true });
}

// Clean up old PDFs on startup (older than 24 hours)
const cleanupOldPDFs = () => {
  const files = fs.readdirSync(TEMP_PDF_DIR);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  files.forEach(file => {
    const filePath = path.join(TEMP_PDF_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      console.log('🗑️  Cleaned up old PDF:', file);
    }
  });
};

cleanupOldPDFs();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for PDF base64

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/profiles')) {
    console.log(`🌐 [SERVER] Incoming ${req.method} request: ${req.path}`);
    console.log(`🕐 Request Time: ${new Date().toISOString()}`);
    console.log(`📋 Query Params:`, req.query);
    if (Object.keys(req.body).length > 0) {
      console.log(`📄 Request Body:`, req.body);
    }
  }
  next();
});

// Base URL for Segment Profile API
const getBaseUrl = (spaceId) => `https://profiles.segment.com/v1/spaces/${spaceId}`;

// Create authorization header
const createAuthHeader = (accessToken) => ({
  'Content-Type': 'application/json',
  'Authorization': `Basic ${Buffer.from(accessToken + ':').toString('base64')}`
});

// Error handler
const handleApiError = (error, res) => {
  console.error('API Error:', error.response?.data || error.message);
  
  if (error.response) {
    return res.status(error.response.status).json({
      error: error.response.data || { message: 'API request failed' }
    });
  }
  
  return res.status(500).json({
    error: { message: 'Internal server error' }
  });
};

// Routes

// Get current environment configuration
app.get('/api/config', (req, res) => {
  res.json({
    spaceId: process.env.SEGMENT_SPACE_ID || '',
    unifySpaceSlug: process.env.SEGMENT_UNIFY_SPACE_SLUG || '',
    unifySpaceFullUrl: process.env.SEGMENT_UNIFY_SPACE_FULL_URL || '',
    unifyWorkspaceSlug: process.env.SEGMENT_UNIFY_WORKSPACE_SLUG || '',
    accessToken: process.env.SEGMENT_ACCESS_TOKEN ? '***' : '', // Mask token for security
    hasToken: !!process.env.SEGMENT_ACCESS_TOKEN
  });
});

// Update environment configuration
app.post('/api/config', (req, res) => {
  const { spaceId, accessToken, unifySpaceSlug, unifySpaceFullUrl, unifyWorkspaceSlug, integrations } = req.body;
  
  console.log('Received config update request:', {
    spaceId: spaceId ? `${spaceId.substring(0, 10)}...` : 'undefined',
    accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'not provided (using existing)',
    unifySpaceSlug: unifySpaceSlug || 'undefined',
    unifySpaceFullUrl: unifySpaceFullUrl || 'undefined', 
    unifyWorkspaceSlug: unifyWorkspaceSlug || 'undefined',
    integrations: integrations || {},
    hasSpaceId: !!spaceId,
    hasAccessToken: !!accessToken,
    existingTokenExists: !!process.env.SEGMENT_ACCESS_TOKEN
  });
  
  if (!spaceId) {
    return res.status(400).json({
      error: { message: 'Space ID is required' }
    });
  }

  // Check if we have a valid token - either provided or existing in env
  const finalAccessToken = accessToken || process.env.SEGMENT_ACCESS_TOKEN;
  if (!finalAccessToken) {
    return res.status(400).json({
      error: { message: 'Profile API Token is required. Please provide a token or ensure one exists in your configuration.' }
    });
  }

  // Update .env file
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  
  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
  } catch (error) {
    console.warn('Could not read existing .env file:', error.message);
  }

  // Update or add environment variables
  const updateEnvVar = (content, key, value) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    } else {
      return content + (content && !content.endsWith('\n') ? '\n' : '') + `${key}=${value}\n`;
    }
  };

  envContent = updateEnvVar(envContent, 'SEGMENT_SPACE_ID', spaceId);
  
  // Only update the access token if a new one was provided
  if (accessToken) {
    envContent = updateEnvVar(envContent, 'SEGMENT_ACCESS_TOKEN', accessToken);
  }
  
  // Add unifySpaceSlug if provided
  if (unifySpaceSlug) {
    envContent = updateEnvVar(envContent, 'SEGMENT_UNIFY_SPACE_SLUG', unifySpaceSlug);
  }
  
  // Add unifySpaceFullUrl if provided (store the original input for persistence)
  if (unifySpaceFullUrl) {
    envContent = updateEnvVar(envContent, 'SEGMENT_UNIFY_SPACE_FULL_URL', unifySpaceFullUrl);
  }
  
  // Add unifyWorkspaceSlug if provided
  if (unifyWorkspaceSlug) {
    envContent = updateEnvVar(envContent, 'SEGMENT_UNIFY_WORKSPACE_SLUG', unifyWorkspaceSlug);
  }
  
  // Add integrations config if provided
  if (integrations) {
    envContent = updateEnvVar(envContent, 'SEGMENT_INTEGRATIONS_CONFIG', JSON.stringify(integrations));
  }

  try {
    fs.writeFileSync(envPath, envContent);
    
    // Update process.env
    process.env.SEGMENT_SPACE_ID = spaceId;
    if (accessToken) {
      process.env.SEGMENT_ACCESS_TOKEN = accessToken;
    }
    if (unifySpaceSlug) {
      process.env.SEGMENT_UNIFY_SPACE_SLUG = unifySpaceSlug;
    }
    if (unifySpaceFullUrl) {
      process.env.SEGMENT_UNIFY_SPACE_FULL_URL = unifySpaceFullUrl;
    }
    if (unifyWorkspaceSlug) {
      process.env.SEGMENT_UNIFY_WORKSPACE_SLUG = unifyWorkspaceSlug;
    }
    if (integrations) {
      process.env.SEGMENT_INTEGRATIONS_CONFIG = JSON.stringify(integrations);
    }
    
    console.log('Configuration saved successfully to .env file');
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error writing .env file:', error);
    res.status(500).json({
      error: { message: 'Failed to update configuration' }
    });
  }
});

// Save writeKey to .env file
app.post('/api/config/writekey', (req, res) => {
  const { writeKey } = req.body;
  
  if (!writeKey) {
    return res.status(400).json({
      error: { message: 'writeKey is required' }
    });
  }

  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';

  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
  } catch (error) {
    console.error('Error reading .env file:', error);
  }

  // Helper function to update or add environment variable
  const updateEnvVar = (content, key, value) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    } else {
      return content + `\n${key}=${value}`;
    }
  };

  envContent = updateEnvVar(envContent, 'SEGMENT_WRITE_KEY', writeKey);

  try {
    fs.writeFileSync(envPath, envContent);
    process.env.SEGMENT_WRITE_KEY = writeKey;
    
    res.json({ success: true, message: 'WriteKey saved successfully' });
  } catch (error) {
    console.error('Error writing .env file:', error);
    res.status(500).json({
      error: { message: 'Failed to save writeKey' }
    });
  }
});

// Save sources configuration to .env file
app.post('/api/config/sources', (req, res) => {
  const { sources } = req.body;
  
  if (!sources) {
    return res.status(400).json({
      error: { message: 'sources configuration is required' }
    });
  }

  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';

  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
  } catch (error) {
    console.error('Error reading .env file:', error);
  }

  // Helper function to update or add environment variable
  const updateEnvVar = (content, key, value) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    } else {
      return content + `\n${key}=${value}`;
    }
  };

  envContent = updateEnvVar(envContent, 'SEGMENT_SOURCES_CONFIG', JSON.stringify(sources));

  try {
    fs.writeFileSync(envPath, envContent);
    
    res.json({ success: true, message: 'Sources configuration saved successfully' });
  } catch (error) {
    console.error('Error writing .env file:', error);
    res.status(500).json({
      error: { message: 'Failed to save sources configuration' }
    });
  }
});

// Get a Profile's Traits
app.get('/api/profiles/:identifier/traits', async (req, res) => {
  const { identifier } = req.params;
  const { class: className, include, limit = 10, verbose } = req.query;
  
  console.group(`🔍 [SERVER TRAITS] Request for: ${identifier}`);
  console.log(`🕐 Request Time: ${new Date().toISOString()}`);
  console.log(`📋 Query Params:`, { className, include, limit, verbose });
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    console.error(`❌ [SERVER TRAITS] Missing Segment configuration`);
    console.groupEnd();
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    // Properly encode the identifier for the Segment API URL
    const encodedIdentifier = encodeURIComponent(identifier);
    const url = `${baseUrl}/collections/users/profiles/${encodedIdentifier}/traits`;
    
    console.log(`📡 [SERVER TRAITS] Calling Segment API: ${url}`);
    
    const params = {};
    if (className) params.class = className;
    if (include) params.include = include;
    if (limit) params.limit = limit;
    if (verbose) params.verbose = verbose;
    
    const response = await axios.get(url, {
      headers: createAuthHeader(process.env.SEGMENT_ACCESS_TOKEN),
      params
    });
    
    console.log(`📥 [SERVER TRAITS] Response received for: ${identifier}`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`🕐 Response Time: ${new Date().toISOString()}`);
    console.log(`📋 Data Summary: ${response.data.data ? (typeof response.data.data === 'object' ? `${Object.keys(response.data.data).length} traits` : 'Non-object data') : 'No traits data'}`);
    console.log(`� Full Response:`, JSON.stringify(response.data, null, 2));
    console.groupEnd();
    
    // Add the actual Segment API endpoint to the response for frontend logging
    const responseData = {
      ...response.data,
      _segmentApiEndpoint: url + (Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '')
    };
    
    res.json(responseData);
  } catch (error) {
    console.error(`❌ [SERVER TRAITS] Request failed for: ${identifier}`);
    console.error(`📋 Error Details:`, error.message);
    console.groupEnd();
    handleApiError(error, res);
  }
});

// Get a Profile's External IDs
app.get('/api/profiles/:identifier/external_ids', async (req, res) => {
  const { identifier } = req.params;
  const { include, limit = 25, verbose } = req.query;
  
  console.group(`🔍 [SERVER EXTERNAL_IDS] Request for: ${identifier}`);
  console.log(`🕐 Request Time: ${new Date().toISOString()}`);
  console.log(`📋 Query Params:`, { include, limit, verbose });
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    console.error(`❌ [SERVER EXTERNAL_IDS] Missing Segment configuration`);
    console.groupEnd();
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    // Properly encode the identifier for the Segment API URL
    const encodedIdentifier = encodeURIComponent(identifier);
    const url = `${baseUrl}/collections/users/profiles/${encodedIdentifier}/external_ids`;
    
    console.log(`📡 [SERVER EXTERNAL_IDS] Calling Segment API: ${url}`);
    
    const params = {};
    if (include) params.include = include;
    if (limit) params.limit = limit;
    if (verbose) params.verbose = verbose;
    
    const response = await axios.get(url, {
      headers: createAuthHeader(process.env.SEGMENT_ACCESS_TOKEN),
      params
    });
    
    console.log(`📥 [SERVER EXTERNAL_IDS] Response received for: ${identifier}`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`🕐 Response Time: ${new Date().toISOString()}`);
    console.log(`📋 Data Summary: ${Array.isArray(response.data.data) ? `${response.data.data.length} external IDs` : 'Non-array data'}`);
    console.log(`� Full Response:`, JSON.stringify(response.data, null, 2));
    console.groupEnd();
    
    // Add the actual Segment API endpoint to the response for frontend logging
    const responseData = {
      ...response.data,
      _segmentApiEndpoint: url + (Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '')
    };
    
    res.json(responseData);
  } catch (error) {
    console.error(`❌ [SERVER EXTERNAL_IDS] Request failed for: ${identifier}`);
    console.error(`📋 Error Details:`, error.message);
    console.groupEnd();
    handleApiError(error, res);
  }
});

// Get a Profile's Events
app.get('/api/profiles/:identifier/events', async (req, res) => {
  const { identifier } = req.params;
  const { limit = 10, next } = req.query;
  
  console.group(`🔍 [SERVER EVENTS] Request for: ${identifier}`);
  console.log(`🕐 Request Time: ${new Date().toISOString()}`);
  console.log(`📋 Query Params:`, { limit, next });
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    console.error(`❌ [SERVER EVENTS] Missing Segment configuration`);
    console.groupEnd();
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    // Properly encode the identifier for the Segment API URL
    const encodedIdentifier = encodeURIComponent(identifier);
    const url = `${baseUrl}/collections/users/profiles/${encodedIdentifier}/events`;
    
    console.log(`📡 [SERVER EVENTS] Calling Segment API: ${url}`);
    
    const params = {};
    if (limit) params.limit = limit;
    if (next) params.next = next;
    
    const response = await axios.get(url, {
      headers: createAuthHeader(process.env.SEGMENT_ACCESS_TOKEN),
      params
    });
    
    console.log(`📥 [SERVER EVENTS] Response received for: ${identifier}`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`🕐 Response Time: ${new Date().toISOString()}`);
    console.log(`📋 Data Summary: ${Array.isArray(response.data.data) ? `${response.data.data.length} events` : 'Non-array data'}`);
    console.log(`📄 Full Response:`, JSON.stringify(response.data, null, 2));
    console.groupEnd();
    
    // Add the actual Segment API endpoint to the response for frontend logging
    const responseData = {
      ...response.data,
      _segmentApiEndpoint: url + (Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '')
    };
    
    res.json(responseData);
  } catch (error) {
    console.error(`❌ [SERVER EVENTS] Request failed for: ${identifier}`);
    console.error(`📋 Error Details:`, error.message);
    console.groupEnd();
    handleApiError(error, res);
  }
});

// Get a Profile's Metadata
app.get('/api/profiles/:identifier/metadata', async (req, res) => {
  const { identifier } = req.params;
  
  console.group(`🔍 [SERVER METADATA] Request for: ${identifier}`);
  console.log(`🕐 Request Time: ${new Date().toISOString()}`);
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    console.error(`❌ [SERVER METADATA] Missing Segment configuration`);
    console.groupEnd();
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    // Properly encode the identifier for the Segment API URL
    const encodedIdentifier = encodeURIComponent(identifier);
    const url = `${baseUrl}/collections/users/profiles/${encodedIdentifier}/metadata`;
    
    console.log(`📡 [SERVER METADATA] Calling Segment API: ${url}`);
    
    const response = await axios.get(url, {
      headers: createAuthHeader(process.env.SEGMENT_ACCESS_TOKEN)
    });
    
    console.log(`📥 [SERVER METADATA] Response received for: ${identifier}`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`🕐 Response Time: ${new Date().toISOString()}`);
    console.log(`📄 Full Response:`, JSON.stringify(response.data, null, 2));
    console.groupEnd();
    
    // Add the actual Segment API endpoint to the response for frontend logging
    const responseData = {
      ...response.data,
      _segmentApiEndpoint: url
    };
    
    res.json(responseData);
  } catch (error) {
    console.error(`❌ [SERVER METADATA] Request failed for: ${identifier}`);
    console.error(`📋 Error Details:`, error.message);
    console.groupEnd();
    handleApiError(error, res);
  }
});

// Get a Profile's Links
app.get('/api/profiles/:identifier/links', async (req, res) => {
  const { identifier } = req.params;
  const { limit = 20 } = req.query;
  
  console.group(`🔍 [SERVER LINKS] Request for: ${identifier}`);
  console.log(`🕐 Request Time: ${new Date().toISOString()}`);
  console.log(`📋 Query Params:`, { limit });
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    console.error(`❌ [SERVER LINKS] Missing Segment configuration`);
    console.groupEnd();
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    // Properly encode the identifier for the Segment API URL
    const encodedIdentifier = encodeURIComponent(identifier);
    const url = `${baseUrl}/collections/users/profiles/${encodedIdentifier}/links`;
    
    console.log(`📡 [SERVER LINKS] Calling Segment API: ${url}`);
    
    const params = {};
    if (limit) params.limit = limit;
    
    const response = await axios.get(url, {
      headers: createAuthHeader(process.env.SEGMENT_ACCESS_TOKEN),
      params
    });
    
    console.log(`📥 [SERVER LINKS] Response received for: ${identifier}`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`🕐 Response Time: ${new Date().toISOString()}`);
    console.log(`📋 Data Summary: ${Array.isArray(response.data.data) ? `${response.data.data.length} links` : 'Non-array data'}`);
    console.log(`📄 Full Response:`, JSON.stringify(response.data, null, 2));
    console.groupEnd();
    
    // Add the actual Segment API endpoint to the response for frontend logging
    const responseData = {
      ...response.data,
      _segmentApiEndpoint: url + (Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '')
    };
    
    res.json(responseData);
  } catch (error) {
    console.error(`❌ [SERVER LINKS] Request failed for: ${identifier}`);
    console.error(`📋 Error Details:`, error.message);
    console.groupEnd();
    handleApiError(error, res);
  }
});

// Get Account Profile Traits
app.get('/api/accounts/:groupId/traits', async (req, res) => {
  const { groupId } = req.params;
  const { class: className, include, limit = 10, verbose } = req.query;
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    const url = `${baseUrl}/collections/accounts/profiles/group_id:${groupId}/traits`;
    
    const params = {};
    if (className) params.class = className;
    if (include) params.include = include;
    if (limit) params.limit = limit;
    if (verbose) params.verbose = verbose;
    
    const response = await axios.get(url, {
      headers: createAuthHeader(process.env.SEGMENT_ACCESS_TOKEN),
      params
    });
    
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res);
  }
});

// Get Account Profile Links
app.get('/api/accounts/:groupId/links', async (req, res) => {
  const { groupId } = req.params;
  const { limit = 20 } = req.query;
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    const url = `${baseUrl}/collections/accounts/profiles/group_id:${groupId}/links`;
    
    const params = {};
    if (limit) params.limit = limit;
    
    const response = await axios.get(url, {
      headers: createAuthHeader(process.env.SEGMENT_ACCESS_TOKEN),
      params
    });
    
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res);
  }
});

// ============================================================
// TWILIO INTEGRATION
// ============================================================

// Helper function to initialize Twilio client
function initializeTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  try {
    const twilio = require('twilio');
    return twilio(accountSid, authToken);
  } catch (error) {
    console.error('⚠️  Twilio SDK not installed');
    return null;
  }
}

// ============================================================
// Twilio Studio Flow Voice Tutorial Trigger
// ============================================================

// POST /api/twilio/start-tutorial
// Starts a voice tutorial call via Twilio Studio Flow
app.post('/api/twilio/start-tutorial', async (req, res) => {
  try {
    const { to, flowSid } = req.body;

    // Validate required fields
    if (!to || !flowSid) {
      return res.status(400).json({
        error: 'Missing required fields: to and flowSid are required'
      });
    }

    // Check for Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error('⚠️  Twilio credentials not configured');
      return res.status(500).json({
        error: 'Twilio is not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your .env file.'
      });
    }

    // Initialize Twilio client (lazy loading to avoid errors if not installed)
    const twilioClient = initializeTwilioClient();
    
    if (!twilioClient) {
      return res.status(500).json({
        error: 'Twilio SDK is not installed or credentials are missing. Run: npm install twilio and configure credentials.'
      });
    }

    console.log(`📞 [TWILIO] Starting voice tutorial for ${to}`);
    console.log(`📞 [TWILIO] Flow SID: ${flowSid}`);

    // Use Studio Flow Executions API with parameters
    // This properly triggers the REST API trigger in your Studio Flow
    const execution = await twilioClient.studio.v2
      .flows(flowSid)
      .executions
      .create({
        to: to,
        from: fromNumber,
        parameters: {
          // Pass any custom parameters your flow might need
          tutorial_type: 'identity_resolution',
          initiated_from: 'web_app'
        }
      });

    console.log(`✅ [TWILIO] Studio Flow execution created successfully`);
    console.log(`📞 [TWILIO] Execution SID: ${execution.sid}`);
    console.log(`📞 [TWILIO] Context: ${JSON.stringify(execution.context)}`);

    res.json({
      success: true,
      message: 'Voice tutorial call initiated successfully',
      executionSid: execution.sid
    });

  } catch (error) {
    console.error('❌ [TWILIO] Error starting voice tutorial:', error);
    
    // Handle Twilio-specific errors
    if (error.code) {
      return res.status(400).json({
        error: `Twilio Error ${error.code}: ${error.message}`
      });
    }
    
    res.status(500).json({
      error: 'Failed to start voice tutorial call',
      details: error.message
    });
  }
});

// Export data via SMS/MMS
app.post('/api/twilio/send-export', async (req, res) => {
  let { to, exportType, data, fileName } = req.body;

  // Validate required fields
  if (!to) {
    return res.status(400).json({
      error: 'Missing required field',
      details: 'Phone number (to) is required'
    });
  }

  if (!data) {
    return res.status(400).json({
      error: 'Missing required field',
      details: 'Export data is required'
    });
  }

  // Normalize phone number to E.164 format
  let normalizedPhone = to.replace(/\D/g, ''); // Remove all non-digits
  
  // Ensure it has country code +1
  if (normalizedPhone.length === 10) {
    normalizedPhone = '+1' + normalizedPhone;
  } else if (normalizedPhone.length === 11 && normalizedPhone.startsWith('1')) {
    normalizedPhone = '+' + normalizedPhone;
  } else if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+' + normalizedPhone;
  } else {
    normalizedPhone = to; // Keep original if already formatted
  }
  
  console.log('📞 Phone number normalized:', to, '→', normalizedPhone);
  to = normalizedPhone; // Use normalized version

  // Check if Twilio SDK is available
  const twilioClient = initializeTwilioClient();
  
  if (!twilioClient) {
    return res.status(500).json({
      error: 'Twilio SDK not initialized',
      details: 'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment variables.'
    });
  }

  try {
    const from = process.env.TWILIO_PHONE_NUMBER;
    
    if (!from) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    console.log('\n📤 [TWILIO EXPORT] Sending export via SMS/MMS');
    console.log('To:', to);
    console.log('Export Type:', exportType);
    console.log('File Name:', fileName || 'export.json');

    // Create message body based on export type
    let messageBody = `Identity Resolution Export\n`;
    messageBody += `Type: ${exportType || 'Data'}\n`;
    messageBody += `File: ${fileName || 'export.json'}\n\n`;
    
    // For small data, include preview in message
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const dataPreview = dataStr.length > 500 
      ? dataStr.substring(0, 500) + '...\n\n(Data truncated. Full export attached)'
      : dataStr;
    
    messageBody += dataPreview;

    // Option 1: Use Studio Flow (bypasses A2P restrictions for trial accounts)
    // Can use the same flow as voice tutorial with conditional routing
    const exportFlowSid = process.env.TWILIO_EXPORT_FLOW_SID || process.env.TWILIO_VOICE_FLOW_SID || 'FW8b38713dcf3b2cb224d6b3a7a511f4d3';
    
    if (exportFlowSid) {
      console.log('📱 Using Studio Flow for export:', exportFlowSid);
      console.log('📋 Parameters being sent:', {
        exportType: 'SMS_EXPORT',
        Body: messageBody.substring(0, 100) + '...',
        To: to
      });
      
      const execution = await twilioClient.studio.v2
        .flows(exportFlowSid)
        .executions
        .create({
          to: to,
          from: from,
          parameters: {
            exportType: 'SMS_EXPORT', // This is what split_1 checks
            Body: messageBody,
            To: to,
            messageType: 'export',
            fileName: fileName,
            dataType: exportType
          }
        });
      
      console.log('✅ Export sent via Studio Flow');
      console.log('Execution SID:', execution.sid);
      console.log('Status:', execution.status);
      
      return res.json({
        success: true,
        executionSid: execution.sid,
        status: execution.status,
        timestamp: new Date().toISOString(),
        method: 'studio-flow'
      });
    }

    // Option 2: Direct messaging (requires A2P registration for US numbers)
    console.log('📱 Using direct Messaging API');
    const messageResponse = await twilioClient.messages.create({
      body: messageBody,
      from: from,
      to: to
    });

    console.log('✅ Export sent successfully');
    console.log('Message SID:', messageResponse.sid);
    console.log('Status:', messageResponse.status);

    res.json({
      success: true,
      messageSid: messageResponse.sid,
      status: messageResponse.status,
      timestamp: new Date().toISOString(),
      method: 'direct-messaging'
    });

  } catch (error) {
    console.error('\n❌ [TWILIO EXPORT] Error sending export:', error);
    
    res.status(500).json({
      error: 'Failed to send export',
      details: error.message
    });
  }
});

// Export PDF via MMS
app.post('/api/twilio/send-pdf-export', async (req, res) => {
  let { to, pdfBase64, fileName, reportType } = req.body;

  // Validate required fields
  if (!to) {
    return res.status(400).json({
      error: 'Missing required field',
      details: 'Phone number (to) is required'
    });
  }

  if (!pdfBase64) {
    return res.status(400).json({
      error: 'Missing required field',
      details: 'PDF data is required'
    });
  }

  // Normalize phone number to E.164 format
  let normalizedPhone = to.replace(/\D/g, '');
  if (normalizedPhone.length === 10) {
    normalizedPhone = '+1' + normalizedPhone;
  } else if (normalizedPhone.length === 11 && normalizedPhone.startsWith('1')) {
    normalizedPhone = '+' + normalizedPhone;
  } else if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+' + normalizedPhone;
  } else {
    normalizedPhone = to;
  }
  
  console.log('📞 Phone number normalized:', to, '→', normalizedPhone);
  to = normalizedPhone;

  const twilioClient = initializeTwilioClient();
  
  if (!twilioClient) {
    return res.status(500).json({
      error: 'Twilio SDK not initialized',
      details: 'Twilio credentials not configured'
    });
  }

  try {
    const from = process.env.TWILIO_PHONE_NUMBER;
    
    if (!from) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    console.log('\n📤 [TWILIO PDF EXPORT] Preparing PDF for download');
    console.log('To:', to);
    console.log('Report Type:', reportType || 'Analysis Report');
    console.log('File Name:', fileName || 'report.pdf');

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfSizeKB = (pdfBuffer.length / 1024).toFixed(2);
    
    console.log('PDF Size:', pdfSizeKB, 'KB');

    // Generate unique ID for this PDF
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pdfFileName = `${uniqueId}_${safeFileName}`;
    const pdfFilePath = path.join(TEMP_PDF_DIR, pdfFileName);

    // Save PDF to temp directory
    fs.writeFileSync(pdfFilePath, pdfBuffer);
    console.log('💾 PDF saved to:', pdfFilePath);

    // Create download URL (accessible from any device)
    const downloadUrl = `http://localhost:${PORT}/download-pdf/${pdfFileName}`;
    console.log('🔗 Download URL:', downloadUrl);

    // Create message body with download link
    const messageBody = `${reportType || 'Identity Resolution Analysis'}\n\n✅ Your report is ready!\n\n📄 ${fileName}\n📊 Size: ${pdfSizeKB} KB\n🕐 Generated: ${new Date().toLocaleString()}\n\n🔗 Download here:\n${downloadUrl}\n\n⏰ Link expires in 24 hours`;
    
    console.log('📱 Sending SMS with download link...');
    
    const messageResponse = await twilioClient.messages.create({
      body: messageBody,
      from: from,
      to: to
    });

    console.log('✅ SMS sent successfully with download link');
    console.log('Message SID:', messageResponse.sid);
    console.log('Status:', messageResponse.status);

    res.json({
      success: true,
      messageSid: messageResponse.sid,
      status: messageResponse.status,
      downloadUrl: downloadUrl,
      timestamp: new Date().toISOString(),
      method: 'direct-sms-with-link',
      note: 'SMS sent with download link. PDF hosted temporarily for 24 hours.',
      pdfSize: `${pdfSizeKB} KB`,
      expiresIn: '24 hours'
    });

  } catch (error) {
    console.error('\n❌ [TWILIO PDF EXPORT] Error sending PDF:', error);
    
    res.status(500).json({
      error: 'Failed to send PDF export',
      details: error.message
    });
  }
});

// Serve PDF download endpoint
app.get('/download-pdf/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(TEMP_PDF_DIR, filename);

  // Security: Only allow files in temp directory, prevent path traversal
  if (!filePath.startsWith(TEMP_PDF_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  console.log('📥 Serving PDF download:', filename);

  // Set headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.split('_').slice(1).join('_')}"`);
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on('error', (error) => {
    console.error('Error streaming PDF:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    console.log('\n⚠️  Segment configuration not found in environment variables.');
    console.log('Please configure your Space ID and Access Token through the UI or add them to .env file.');
  } else {
    console.log('✅ Segment configuration loaded');
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.log('\n⚠️  Twilio configuration not found in environment variables.');
    console.log('Voice Tutorial feature requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
  } else {
    console.log('✅ Twilio configuration loaded - Voice Tutorial feature available');
  }
});
