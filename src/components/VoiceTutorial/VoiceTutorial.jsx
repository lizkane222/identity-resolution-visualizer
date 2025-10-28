import React, { useState } from 'react';
import './VoiceTutorial.css';

const VoiceTutorial = ({ isOpen, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setMessage({ type: '', text: '' });
  };

  const handleStartTutorial = async (e) => {
    // Prevent any default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Extract digits only for validation
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (!digits || digits.length !== 10) {
      setMessage({ 
        type: 'error', 
        text: 'Please enter a valid 10-digit phone number' 
      });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Format phone number with +1 country code
      const formattedPhone = `+1${digits}`;
      
      // Call your backend endpoint to trigger Twilio Studio Flow
      const response = await fetch('/api/twilio/start-tutorial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          flowSid: 'FW8b38713dcf3b2cb224d6b3a7a511f4d3' // Your Studio Flow SID
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Tutorial call initiated! You should receive a call at ${phoneNumber} shortly.` 
        });
        setPhoneNumber('');
        
        // Close modal after 3 seconds
        setTimeout(() => {
          onClose();
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error?.message || 'Failed to start tutorial call. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Error starting tutorial call:', error);
      setMessage({ 
        type: 'error', 
        text: 'Network error. Please check your connection and try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleStartTutorial();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="voice-tutorial-overlay" onClick={handleOverlayClick}>
      <div className="voice-tutorial-modal">
        <div className="voice-tutorial-header">
          <h2 className="voice-tutorial-title">📞 Voice Tutorial</h2>
          <button 
            type="button"
            onClick={onClose} 
            className="voice-tutorial-close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="voice-tutorial-content">
          <p className="voice-tutorial-description">
            Get a guided voice tutorial about the Identity Resolution Visualizer. 
            Enter your phone number and we'll call you right away to walk you through 
            the key features and concepts.
          </p>

          <div className="voice-tutorial-form">
            <label htmlFor="phone" className="voice-tutorial-label">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              onKeyPress={handleKeyPress}
              placeholder="(555) 123-4567"
              className="voice-tutorial-input"
              maxLength={14}
              disabled={isLoading}
              autoFocus
            />
            <p className="voice-tutorial-hint">
              Enter a U.S. phone number (10 digits)
            </p>
          </div>

          {message.text && (
            <div className={`voice-tutorial-message voice-tutorial-message--${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="voice-tutorial-actions">
            <button
              type="button"
              onClick={onClose}
              className="voice-tutorial-button voice-tutorial-button--secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartTutorial}
              className="voice-tutorial-button voice-tutorial-button--primary"
              disabled={isLoading || !phoneNumber}
            >
              {isLoading ? (
                <>
                  <span className="voice-tutorial-spinner"></span>
                  Calling...
                </>
              ) : (
                <>
                  📞 Start Tutorial Call
                </>
              )}
            </button>
          </div>

          <div className="voice-tutorial-footer">
            <p className="voice-tutorial-note">
              <strong>Note:</strong> Standard call rates may apply. The tutorial takes 
              approximately 3-5 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTutorial;
