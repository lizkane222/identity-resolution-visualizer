// Utility functions for ID Resolution Configuration

/**
 * Get the configured identifiers from ID Resolution Config
 * @returns {Array} Array of configured identifier objects with {id, name, enabled, isCustom}
 */
export const getConfiguredIdentifiers = () => {
  try {
    const saved = localStorage.getItem('idres_config_identifiers');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error reading ID Resolution Config:', error);
  }
  
  // Return default configuration if none found
  return [
    { id: 'user_id', name: 'User ID', enabled: true, isCustom: false },
    { id: 'email', name: 'Email', enabled: true, isCustom: false },
    { id: 'phone', name: 'Phone', enabled: true, isCustom: false },
    { id: 'android.id', name: 'Android ID', enabled: true, isCustom: false },
    { id: 'android.idfa', name: 'Android IDFA', enabled: true, isCustom: false },
    { id: 'android.push_token', name: 'Android Push Token', enabled: true, isCustom: false },
    { id: 'anonymous_id', name: 'Anonymous ID', enabled: true, isCustom: false },
    { id: 'ga_client_id', name: 'GA Client ID', enabled: true, isCustom: false },
    { id: 'ios.id', name: 'iOS ID', enabled: true, isCustom: false },
    { id: 'ios.idfa', name: 'iOS IDFA', enabled: true, isCustom: false },
    { id: 'ios.push_token', name: 'iOS Push Token', enabled: true, isCustom: false },
  ];
};

/**
 * Get only the enabled identifiers from ID Resolution Config
 * @returns {Array} Array of enabled identifier objects
 */
export const getEnabledIdentifiers = () => {
  return getConfiguredIdentifiers().filter(identifier => identifier.enabled);
};

/**
 * Get identifier IDs that should be treated as identifiers (not traits)
 * @returns {Set} Set of identifier field names
 */
export const getIdentifierFields = () => {
  const identifiers = getEnabledIdentifiers();
  const identifierSet = new Set();
  
  identifiers.forEach(identifier => {
    // Normalize the identifier names to match field names used in the app
    const normalizedId = normalizeIdentifierName(identifier.id);
    identifierSet.add(normalizedId);
  });
  
  return identifierSet;
};

/**
 * Normalize identifier names to match field names used in the app
 * @param {string} identifierId - The identifier ID from config
 * @returns {string} Normalized field name
 */
const normalizeIdentifierName = (identifierId) => {
  switch (identifierId) {
    case 'user_id':
      return 'userId';
    case 'anonymous_id':
      return 'anonymousId';
    case 'ga_client_id':
      return 'gaClientId';
    default:
      return identifierId;
  }
};

/**
 * Check if a field name is configured as an identifier
 * @param {string} fieldName - The field name to check
 * @returns {boolean} True if the field is a configured identifier
 */
export const isIdentifierField = (fieldName) => {
  const identifierFields = getIdentifierFields();
  return identifierFields.has(fieldName);
};

/**
 * Get the display name for an identifier field
 * @param {string} fieldName - The field name
 * @returns {string} Display name for the identifier
 */
export const getIdentifierDisplayName = (fieldName) => {
  const identifiers = getEnabledIdentifiers();
  const identifier = identifiers.find(id => normalizeIdentifierName(id.id) === fieldName);
  return identifier ? identifier.name : fieldName;
};

/**
 * Get identifier fields from user data based on ID Resolution Config
 * @param {Object} userData - User data object
 * @returns {Object} Object containing only identifier fields
 */
export const getIdentifierFieldsFromData = (userData) => {
  if (!userData || typeof userData !== 'object') return {};
  
  const identifierFields = {};
  const configuredIdentifiers = getIdentifierFields();
  
  // Always include userId and anonymousId as they're core identifiers
  if (userData.userId !== undefined) {
    identifierFields.userId = userData.userId;
  }
  if (userData.anonymousId !== undefined) {
    identifierFields.anonymousId = userData.anonymousId;
  }
  
  // Include other fields only if they're configured as identifiers
  Object.keys(userData).forEach(key => {
    if (key !== 'userId' && key !== 'anonymousId' && key !== '_toggles') {
      if (configuredIdentifiers.has(key)) {
        identifierFields[key] = userData[key];
      }
    }
  });
  
  return identifierFields;
};

/**
 * Get trait fields from user data (includes all standard traits, even if they're also identifiers)
 * @param {Object} userData - User data object
 * @returns {Object} Object containing trait fields
 */
export const getTraitFields = (userData) => {
  if (!userData || typeof userData !== 'object') return {};
  
  const traitFields = {};
  
  // Standard trait fields (includes fields that might also be identifiers)
  const standardTraits = ['email', 'firstName', 'lastName', 'username', 'phone'];
  standardTraits.forEach(field => {
    if (userData[field] !== undefined) {
      traitFields[field] = userData[field];
    }
  });
  
  // Add any custom fields that aren't standard fields or system fields
  Object.keys(userData).forEach(key => {
    if (!['userId', 'anonymousId', 'email', 'firstName', 'lastName', 'username', 'phone', '_toggles'].includes(key) &&
        userData[key] !== undefined) {
      traitFields[key] = userData[key];
    }
  });
  
  
  
  return traitFields;
};
