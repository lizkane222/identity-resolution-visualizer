// Source type to icon mapping - matches SourceConfig.jsx
export const SOURCE_TYPE_ICONS = {
  'javascript': '🌐',
  'ios': '📱',
  'android': '🤖',
  'server': '🖥️',
  'http': '🔗',
  'react-native': '⚛️',
  'flutter': '🐦',
  'unity': '🎮'
};

/**
 * Get the appropriate icon for a source type
 * @param {string} sourceType - The source type (e.g., 'javascript', 'ios', etc.)
 * @returns {string} The emoji icon for the source type, or a default icon if not found
 */
export const getSourceIcon = (sourceType) => {
  return SOURCE_TYPE_ICONS[sourceType] || '📡'; // Default to broadcast icon
};
