/**
 * Utility functions for JSON formatting and validation
 */

/**
 * Attempts to parse and format raw text as valid JSON
 * @param {string} rawText - The raw input text
 * @returns {string} - Formatted JSON string
 */
export const formatAsJSON = (rawText) => {
  if (!rawText || !rawText.trim()) {
    return '';
  }

  try {
    // First, try to parse as-is in case it's already valid JSON
    const parsed = JSON.parse(rawText);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    // If parsing fails, try to create a valid JSON structure from the text
    return createJSONFromText(rawText);
  }
};

/**
 * Validates if text is valid JSON
 * @param {string} text - Text to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateJSON = (text) => {
  if (!text || !text.trim()) {
    return { isValid: true, error: '' };
  }

  try {
    // Try to format the text as JSON first
    const formattedJSON = formatAsJSON(text);
    JSON.parse(formattedJSON);
    return { isValid: true, error: '' };
  } catch (error) {
    return { 
      isValid: false, 
      error: error.message.replace('JSON.parse: ', '').replace('SyntaxError: ', '')
    };
  }
};

/**
 * Creates valid JSON from potentially malformed text
 * @param {string} rawText - Raw input text
 * @returns {string} - Valid JSON string
 */
const createJSONFromText = (rawText) => {
  const trimmed = rawText.trim();
  
  // If it starts and ends with braces or brackets, try to fix common JSON issues
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return attemptJSONFix(trimmed);
  }
  
  // If it looks like key-value pairs, try to parse them
  if (trimmed.includes(':') || trimmed.includes('=')) {
    return parseKeyValuePairs(trimmed);
  }
  
  // If it's just a simple value, wrap it in a JSON object
  return JSON.stringify({ value: trimmed }, null, 2);
};

/**
 * Attempts to fix common JSON syntax issues
 * @param {string} text - Potentially malformed JSON
 * @returns {string} - Fixed JSON string
 */
const attemptJSONFix = (text) => {
  try {
    let fixed = text
      // Fix single quotes to double quotes
      .replace(/'/g, '"')
      // Fix unquoted keys (simple case)
      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      // Fix trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix missing commas between properties
      .replace(/("\s*)\s*\n\s*"/g, '$1,\n"')
      // Fix boolean values
      .replace(/:\s*true\b/g, ': true')
      .replace(/:\s*false\b/g, ': false')
      .replace(/:\s*null\b/g, ': null');

    // Try to parse the fixed version
    const parsed = JSON.parse(fixed);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    // If all else fails, wrap the original text as a string value
    return JSON.stringify({ rawData: text }, null, 2);
  }
};

/**
 * Parses key-value pairs into JSON format
 * @param {string} text - Text containing key-value pairs
 * @returns {string} - JSON string
 */
const parseKeyValuePairs = (text) => {
  const result = {};
  
  // Split by lines and common separators
  const lines = text.split(/[,\n\r]+/).filter(line => line.trim());
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Try different separators
    let separator = ':';
    if (!trimmedLine.includes(':') && trimmedLine.includes('=')) {
      separator = '=';
    }
    
    if (trimmedLine.includes(separator)) {
      const [key, ...valueParts] = trimmedLine.split(separator);
      const value = valueParts.join(separator).trim();
      
      const cleanKey = key.trim().replace(/['"]/g, '') || `key_${index}`;
      const cleanValue = parseValue(value);
      
      result[cleanKey] = cleanValue;
    } else if (trimmedLine) {
      // If no separator, treat as a value with generated key
      result[`item_${index}`] = parseValue(trimmedLine);
    }
  });
  
  return JSON.stringify(result, null, 2);
};

/**
 * Attempts to parse a string value into the appropriate type
 * @param {string} value - String value to parse
 * @returns {any} - Parsed value (string, number, boolean, etc.)
 */
const parseValue = (value) => {
  const trimmed = value.trim().replace(/^["']|["']$/g, ''); // Remove surrounding quotes
  
  // Check for boolean values
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  if (trimmed.toLowerCase() === 'null') return null;
  
  // Check for numbers
  if (/^-?\d+\.?\d*$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    return isNaN(num) ? trimmed : num;
  }
  
  // Check for arrays (simple comma-separated values in brackets)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // If parsing fails, split by comma and trim
      const arrayContent = trimmed.slice(1, -1);
      return arrayContent.split(',').map(item => parseValue(item.trim()));
    }
  }
  
  // Check for objects
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // If parsing fails, return as string
      return trimmed;
    }
  }
  
  // Return as string
  return trimmed;
};

/**
 * Safely copies text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    } catch (fallbackError) {
      console.error('Failed to copy to clipboard:', fallbackError);
      return false;
    }
  }
};