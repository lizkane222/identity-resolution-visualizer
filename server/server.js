const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 8888;

// Middleware
app.use(cors());
app.use(express.json());

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
    accessToken: process.env.SEGMENT_ACCESS_TOKEN ? '***' : '', // Mask token for security
    hasToken: !!process.env.SEGMENT_ACCESS_TOKEN
  });
});

// Update environment configuration
app.post('/api/config', (req, res) => {
  const { spaceId, accessToken } = req.body;
  
  if (!spaceId || !accessToken) {
    return res.status(400).json({
      error: { message: 'Both spaceId and accessToken are required' }
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
  envContent = updateEnvVar(envContent, 'SEGMENT_ACCESS_TOKEN', accessToken);

  try {
    fs.writeFileSync(envPath, envContent);
    
    // Update process.env
    process.env.SEGMENT_SPACE_ID = spaceId;
    process.env.SEGMENT_ACCESS_TOKEN = accessToken;
    
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
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    const url = `${baseUrl}/collections/users/profiles/${identifier}/traits`;
    
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

// Get a Profile's External IDs
app.get('/api/profiles/:identifier/external_ids', async (req, res) => {
  const { identifier } = req.params;
  const { include, limit = 25, verbose } = req.query;
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    const url = `${baseUrl}/collections/users/profiles/${identifier}/external_ids`;
    
    const params = {};
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

// Get a Profile's Events
app.get('/api/profiles/:identifier/events', async (req, res) => {
  const { identifier } = req.params;
  const { limit = 10, next } = req.query;
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    const url = `${baseUrl}/collections/users/profiles/${identifier}/events`;
    
    const params = {};
    if (limit) params.limit = limit;
    if (next) params.next = next;
    
    const response = await axios.get(url, {
      headers: createAuthHeader(process.env.SEGMENT_ACCESS_TOKEN),
      params
    });
    
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res);
  }
});

// Get a Profile's Metadata
app.get('/api/profiles/:identifier/metadata', async (req, res) => {
  const { identifier } = req.params;
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    const url = `${baseUrl}/collections/users/profiles/${identifier}/metadata`;
    
    const response = await axios.get(url, {
      headers: createAuthHeader(process.env.SEGMENT_ACCESS_TOKEN)
    });
    
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res);
  }
});

// Get a Profile's Links
app.get('/api/profiles/:identifier/links', async (req, res) => {
  const { identifier } = req.params;
  const { limit = 20 } = req.query;
  
  if (!process.env.SEGMENT_SPACE_ID || !process.env.SEGMENT_ACCESS_TOKEN) {
    return res.status(400).json({
      error: { message: 'Segment configuration not set. Please configure Space ID and Access Token.' }
    });
  }

  try {
    const baseUrl = getBaseUrl(process.env.SEGMENT_SPACE_ID);
    const url = `${baseUrl}/collections/users/profiles/${identifier}/links`;
    
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
});
