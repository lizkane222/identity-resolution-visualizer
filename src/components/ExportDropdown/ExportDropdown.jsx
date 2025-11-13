import React, { useState, useRef, useEffect } from 'react';
import './ExportDropdown.css';

const ExportDropdown = ({ 
  phoneNumber, 
  events, 
  currentUser, 
  profileApiResults,
  isOpen, 
  onClose 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState({ type: '', message: '' });
  const dropdownRef = useRef(null);

  // Derive unique users from events
  const uniqueUsers = React.useMemo(() => {
    const usersMap = new Map();
    events.forEach(event => {
      const userId = event.userId || event.anonymousId;
      if (userId && !usersMap.has(userId)) {
        usersMap.set(userId, {
          userId: event.userId,
          anonymousId: event.anonymousId,
          email: event.traits?.email,
          name: event.traits?.name || event.traits?.firstName
        });
      }
    });
    return Array.from(usersMap.values());
  }, [events]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleExport = async (exportType) => {
    setIsExporting(true);
    setExportStatus({ type: '', message: '' });

    try {
      let exportData = null;
      let fileName = '';

      switch (exportType) {
        case 'events':
          exportData = events;
          fileName = `events-${new Date().toISOString().split('T')[0]}.json`;
          break;
        
        case 'current-user':
          exportData = currentUser;
          fileName = `current-user-${new Date().toISOString().split('T')[0]}.json`;
          break;
        
        case 'unique-users':
          exportData = uniqueUsers;
          fileName = `unique-users-${new Date().toISOString().split('T')[0]}.json`;
          break;
        
        case 'profile-results':
          exportData = profileApiResults;
          fileName = `profile-results-${new Date().toISOString().split('T')[0]}.json`;
          break;
        
        case 'full-export':
          exportData = {
            events,
            currentUser,
            uniqueUsers,
            profileApiResults,
            exportDate: new Date().toISOString()
          };
          fileName = `full-export-${new Date().toISOString().split('T')[0]}.json`;
          break;
        
        default:
          throw new Error('Unknown export type');
      }

      // Format phone number to E.164
      const formattedPhone = phoneNumber.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '+1$1$2$3');
      
      const exportPayload = {
        to: formattedPhone,
        exportType: exportType.replace(/-/g, ' ').toUpperCase(),
        data: exportData,
        fileName
      };
      
      const payloadSize = JSON.stringify(exportPayload).length;
      
      console.log('📤 Sending export:', {
        to: formattedPhone,
        exportType: exportPayload.exportType,
        payloadSize: `${(payloadSize / 1024).toFixed(2)} KB`,
        fileName
      });
      
      if (payloadSize > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Export data too large. Try exporting individual sections.');
      }

      // Send to backend
      const response = await fetch('/api/twilio/send-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportPayload),
      }).catch(err => {
        console.error('❌ Fetch error:', err);
        throw new Error(`Failed to connect to server: ${err.message}`);
      });

      console.log('📥 Response status:', response.status);

      const result = await response.json().catch(err => {
        console.error('❌ JSON parse error:', err);
        throw new Error('Invalid response from server');
      });
      console.log('📥 Response data:', result);

      if (response.ok) {
        setExportStatus({
          type: 'success',
          message: `Export sent to ${phoneNumber}!`
        });
        
        // Close dropdown after 2 seconds
        setTimeout(() => {
          onClose();
          setExportStatus({ type: '', message: '' });
        }, 2000);
      } else {
        console.error('❌ Export failed:', result);
        setExportStatus({
          type: 'error',
          message: result.details || result.error || 'Failed to send export'
        });
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      setExportStatus({
        type: 'error',
        message: `Network error: ${error.message || 'Please try again.'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const exportOptions = [
    { id: 'events', label: 'Event List', icon: '📋', count: events?.length || 0 },
    { id: 'current-user', label: 'Current User', icon: '👤', hasData: !!currentUser?.anonymousId },
    { id: 'unique-users', label: 'Unique Users', icon: '👥', count: uniqueUsers?.length || 0 },
    { id: 'profile-results', label: 'Profile Results', icon: '🔍', hasData: !!profileApiResults },
    { id: 'full-export', label: 'Full Export', icon: '📦', description: 'All data combined' }
  ];

  return (
    <div className="export-dropdown" ref={dropdownRef}>
      <div className="export-dropdown__header">
        <h3>Export to {phoneNumber}</h3>
        <button 
          type="button"
          className="export-dropdown__close"
          onClick={onClose}
          disabled={isExporting}
        >
          ✕
        </button>
      </div>

      {exportStatus.message && (
        <div className={`export-dropdown__status export-dropdown__status--${exportStatus.type}`}>
          {exportStatus.message}
        </div>
      )}

      <div className="export-dropdown__options">
        {exportOptions.map(option => (
          <button
            key={option.id}
            type="button"
            className="export-dropdown__option"
            onClick={() => handleExport(option.id)}
            disabled={isExporting}
          >
            <span className="export-dropdown__option-icon">{option.icon}</span>
            <div className="export-dropdown__option-content">
              <div className="export-dropdown__option-label">{option.label}</div>
              {option.count !== undefined && (
                <div className="export-dropdown__option-meta">{option.count} items</div>
              )}
              {option.hasData !== undefined && !option.hasData && (
                <div className="export-dropdown__option-meta">No data</div>
              )}
              {option.description && (
                <div className="export-dropdown__option-meta">{option.description}</div>
              )}
            </div>
            {isExporting && <span className="export-dropdown__loading">⏳</span>}
          </button>
        ))}
      </div>

      <div className="export-dropdown__footer">
        <small>Data will be sent via SMS to your phone</small>
      </div>
    </div>
  );
};

export default ExportDropdown;
