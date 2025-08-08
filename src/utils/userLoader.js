import usersData from './users.json';

/**
 * Get a random user from the users.json file
 * @returns {Object} A random user object with firstName, lastName, email, etc.
 */
export const getRandomUser = () => {
  if (!usersData || usersData.length === 0) {
    console.warn('No users data available');
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * usersData.length);
  return usersData[randomIndex];
};

/**
 * Convert user data from users.json format to CurrentUser field format
 * @param {Object} userData - Raw user data from users.json
 * @returns {Object} Formatted user data for CurrentUser component
 */
export const formatUserForCurrentUser = (userData) => {
  if (!userData) return {};
  
  const newUserId = generateUserId();
  const randomInt = Math.floor(Math.random() * 9999) + 1; // 1-9999
  
  // Modify email address to simulate a new user variant since original user exists in Unify space
  const originalEmail = userData.email || '';
  const modifiedEmail = originalEmail.replace('@', `+${randomInt}@`);
  
  // Modify phone number's last 4 digits to simulate a new user variant
  const originalPhone = userData.phone || '';
  const modifiedPhone = originalPhone ? originalPhone.replace(/\d{4}$/, () => {
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  }) : '';
  
  // Modify username to add 3 random digits to simulate a new user variant
  const originalUsername = userData.username || '';
  const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const modifiedUsername = originalUsername ? `${originalUsername}${randomDigits}` : '';
  
  return {
    userId: newUserId,
    anonymousId: '', // Will be generated if needed
    email: modifiedEmail,
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    // Additional fields as custom fields
    username: modifiedUsername,
    phone: modifiedPhone,
    streetAddress: userData.streetAddress || '',
    city: userData.city || '',
    state: userData.state || '',
    zipcode: userData.zipcode || ''
  };
};

/**
 * Generate a random UUID for user ID
 * @returns {string} A UUID string
 */
const generateUserId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Load random user data and split into core fields and custom fields
 * @returns {Object} Object with userFields and customFields properties
 */
export const loadRandomUserData = () => {
  const userData = getRandomUser();
  if (!userData) return { userFields: {}, customFields: {} };
  
  const formatted = formatUserForCurrentUser(userData);
  
  // Split into core fields and custom fields
  const coreFields = ['userId', 'anonymousId', 'email', 'firstName', 'lastName'];
  const userFields = {};
  const customFields = {};
  
  Object.entries(formatted).forEach(([key, value]) => {
    if (coreFields.includes(key)) {
      userFields[key] = value;
    } else if (value) { // Only include non-empty custom fields
      customFields[key] = value;
    }
  });
  
  return { userFields, customFields };
};
