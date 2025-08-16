
import Papa from 'papaparse';

// Map of known Segment fields to their correct camelCase
const SEGMENT_FIELD_MAP = {
  'userid': 'userId',
  'user_id': 'userId',
  'USER_ID': 'userId',
  'anonymousid': 'anonymousId',
  'anonymous_id': 'anonymousId',
  'ANONYMOUS_ID': 'anonymousId',
  'messageid': 'messageId',
  'message_id': 'messageId',
  'MESSAGE_ID': 'messageId',
  'groupid': 'groupId',
  'group_id': 'groupId',
  'GROUP_ID': 'groupId',
  'previousid': 'previousId',
  'previous_id': 'previousId',
  'PREVIOUS_ID': 'previousId',
  'receivedat': 'receivedAt',
  'received_at': 'receivedAt',
  'RECEIVED_AT': 'receivedAt',
  'sentat': 'sentAt',
  'sent_at': 'sentAt',
  'SENT_AT': 'sentAt',
  'originaltimestamp': 'originalTimestamp',
  'original_timestamp': 'originalTimestamp',
  'ORIGINAL_TIMESTAMP': 'originalTimestamp',
  'writekey': 'writeKey',
  'write_key': 'writeKey',
  'WRITE_KEY': 'writeKey',
  'sourceid': 'sourceId',
  'source_id': 'sourceId',
  'SOURCE_ID': 'sourceId',
  'useragent': 'userAgent',
  'user_agent': 'userAgent',
  'USER_AGENT': 'userAgent',
  'useragentdata': 'userAgentData',
  'user_agent_data': 'userAgentData',
  'USER_AGENT_DATA': 'userAgentData',
  'adtrackingenabled': 'adTrackingEnabled',
  'ad_tracking_enabled': 'adTrackingEnabled',
  'AD_TRACKING_ENABLED': 'adTrackingEnabled',
  'advertisingid': 'advertisingId',
  'advertising_id': 'advertisingId',
  'ADVERTISING_ID': 'advertisingId',
  // Standard fields that should remain as-is
  'event': 'event',
  'type': 'type',
  'traits': 'traits',
  'properties': 'properties',
  'context': 'context',
  'integrations': 'integrations',
  'timestamp': 'timestamp',
  'name': 'name',
  'version': 'version',
  '_metadata': '_metadata'
};

// Convert field names to proper Segment camelCase
function toSegmentCamelCase(str) {
  // First check exact matches in our field map
  const normalized = str.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  if (SEGMENT_FIELD_MAP[normalized]) {
    return SEGMENT_FIELD_MAP[normalized];
  }
  
  // Check with underscores preserved
  const withUnderscores = str.toLowerCase();
  if (SEGMENT_FIELD_MAP[withUnderscores]) {
    return SEGMENT_FIELD_MAP[withUnderscores];
  }
  
  // Check uppercase version
  if (SEGMENT_FIELD_MAP[str.toUpperCase()]) {
    return SEGMENT_FIELD_MAP[str.toUpperCase()];
  }
  
  // Fallback: convert to camelCase
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
}

function parseBracedEquals(input) {
  if (typeof input !== 'string') return input;
  let s = input.trim();

  if (!s.startsWith('{') || !s.includes('=')) return null;

  
  if (s.endsWith('},')) s = s.slice(0, -1);
  if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1);

  const out = {};
  let buf = '';
  let depth = 0;
  const parts = [];

  // split on commas only when depth===0 (so nested {...} stays intact)
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') depth = Math.max(0, depth - 1);

    if (ch === ',' && depth === 0) {
      if (buf.trim()) parts.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());

  const coerce = (val) => {
    const t = val.trim();
    if (!t) return '';
    // Nested proper JSON on RHS
    if (t.startsWith('{') || t.startsWith('[')) {
      try { return JSON.parse(t); } catch { /* fall through */ }
    }
    // Strip surrounding quotes
    const unq = t.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (/^-?\d+(\.\d+)?$/.test(unq)) return Number(unq);
    if (/^(true|false)$/i.test(unq)) return /^true$/i.test(unq);
    if (/^null$/i.test(unq)) return null;
    return unq;
  };

  for (const kv of parts) {
    const eqIdx = kv.indexOf('=');
    if (eqIdx === -1) continue;
    const key = kv.slice(0, eqIdx).trim();
    const raw = kv.slice(eqIdx + 1).trim().replace(/,?$/, ''); // drop trailing comma on value
    if (!key) continue;
    out[key] = coerce(raw);
  }

  return out;
}

export function parseCSV(text) {
  const { data, errors } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: h => h.trim(), // Keep original header for mapping
  });

  if (errors.length) {
    console.error('❌ CSV Parsing Errors:', errors);
  }

  const cleanedData = data.map((row, idx) => {
    const cleaned = {};
    let hasRawEventData = false;
    
    Object.entries(row).forEach(([k, v]) => {
      let trimmed = (v ?? '').toString().trim();

      // Remove hidden whitespace aggressively
      trimmed = trimmed.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

      // Skip completely empty values - don't add fields that weren't in CSV
      if (trimmed === '') {
        return;
      }

      // Check for special columns (case insensitive)
      const normalizedKey = k.toLowerCase().replace(/[^a-z]/g, '');
      
      // Handle "Raw Event Data" column
      if (normalizedKey === 'raweventdata') {
        cleaned['rawEventData'] = trimmed;
        hasRawEventData = true;
        return;
      }
      
      // Handle "Write Key" column
      if (normalizedKey === 'writekey') {
        cleaned['writeKey'] = trimmed;
        return;
      }

      // Convert field name to proper Segment camelCase
      const camelKey = toSegmentCamelCase(k);

      // 1) Try native JSON
      if (/^[\[\{]/.test(trimmed)) {
        try {
          cleaned[camelKey] = JSON.parse(trimmed);
          return;
        } catch {
          // 2) Try {key=value,...} parser (Athena-ish)
          const kvObj = parseBracedEquals(trimmed);
          if (kvObj) {
            cleaned[camelKey] = kvObj;
            return;
          }
          // 3) Fallback: split into array of tokens
          cleaned[camelKey] = trimmed
            .replace(/^[\[\{]+|[\]\}]+$/g, '')
            .split(',')
            .map(s => s.replace(/["']/g, '').trim())
            .filter(Boolean);
          return;
        }
      }

      // Plain scalar - only add if value was actually present in CSV
      cleaned[camelKey] = trimmed;
    });

    // Remove messageId if present (Segment generates this automatically)
    delete cleaned.messageId;

    if (idx < 3) {
      console.log(`Parsed row ${idx + 1}:`, cleaned);
      if (hasRawEventData) {
        console.log(`Row ${idx + 1} has raw event data - will use directly`);
      }
      if (cleaned.writeKey) {
        console.log(`Row ${idx + 1} has writeKey: ${cleaned.writeKey}`);
      }
    }
    return cleaned;
  });

  return cleanedData;
}
