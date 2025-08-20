// csvUtils.js
// Utility to parse CSV text to array of objects and export data to CSV

export function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

// Export array of objects to CSV format
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get all unique keys from all objects
  const allKeys = new Set();
  data.forEach(obj => {
    Object.keys(obj).forEach(key => allKeys.add(key));
  });
  
  const headers = Array.from(allKeys);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.map(header => `"${header}"`).join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        let value = row[header];
        
        // Handle different data types
        if (value === null || value === undefined) {
          value = '';
        } else if (Array.isArray(value)) {
          value = value.join('; '); // Join arrays with semicolon
        } else if (typeof value === 'object') {
          value = JSON.stringify(value); // Stringify objects
        } else {
          value = String(value);
        }
        
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Export unique users data with flattened structure for CSV
export function exportUniqueUsersToCSV(uniqueUsers, filename = 'unique_users.csv') {
  if (!uniqueUsers || uniqueUsers.length === 0) {
    console.warn('No unique users data to export');
    return;
  }

  // Transform unique users data into a flat structure suitable for CSV
  const flattenedData = uniqueUsers.map((user, index) => {
    const flatUser = {
      user_index: index + 1,
      user_id: user.userId || '',
      email: user.email || '',
      anonymous_ids: user.anonymousIds ? user.anonymousIds.join('; ') : '',
      event_count: user.eventCount || 0,
      first_seen: user.firstSeen || '',
      last_seen: user.lastSeen || '',
      event_indices: user.eventIndices ? user.eventIndices.join('; ') : '',
    };

    // Add all identifier values
    if (user.identifierValues) {
      Object.entries(user.identifierValues).forEach(([key, values]) => {
        flatUser[`identifier_${key}`] = Array.isArray(values) ? values.join('; ') : values;
      });
    }

    // Add traits with prefix
    if (user.traits) {
      Object.entries(user.traits).forEach(([key, value]) => {
        flatUser[`trait_${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
      });
    }

    // Add properties with prefix
    if (user.properties) {
      Object.entries(user.properties).forEach(([key, value]) => {
        flatUser[`property_${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
      });
    }

    return flatUser;
  });

  exportToCSV(flattenedData, filename);
}
