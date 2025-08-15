import React, { useState, useCallback, useRef } from 'react';
import EventBuilder from './components/EventBuilder/EventBuilder.jsx';
import EventList from './components/EventList/EventList.jsx';
import EventButtons from './components/EventButtons/EventButtons.jsx';
import CurrentUser from './components/CurrentUser/CurrentUser.jsx';
import UniqueUsersList from './components/UniqueUsersList/UniqueUsersList.jsx';
import UnifySpaceConfig from './components/UnifySpaceConfig/UnifySpaceConfig.jsx';
import SourceConfig from './components/SourceConfig/SourceConfig.jsx';
import ProfileLookup from './components/ProfileLookup/ProfileLookup.jsx';
import GlowModesList from './components/GlowModesList/GlowModesList.jsx';
import Visualizer from './components/Visualizer/Visualizer.jsx';
import Visualizer2 from './components/Visualizer2/Visualizer2.jsx';
import { useEffect, useMemo } from 'react';
import './App.css';

// Log when the page is loaded/refreshed
console.log(`Loading Client on localhost:3000 - ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST`);

function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState({});
  const [currentEventPayload, setCurrentEventPayload] = useState(null);
  const [currentEventInfo, setCurrentEventInfo] = useState(null);
  const [userUpdateTrigger, setUserUpdateTrigger] = useState(0);
  const [sourceConfigUpdateTrigger, setSourceConfigUpdateTrigger] = useState(0);
  
  // Ref to access EventBuilder's save function
  const eventBuilderRef = useRef();
  const [showUnifySpaceConfig, setShowUnifySpaceConfig] = useState(false);
  const [showSourceConfig, setShowSourceConfig] = useState(false);
  const [showProfileLookup, setShowProfileLookup] = useState(false);
  const [currentPage, setCurrentPage] = useState('main'); // 'main', 'visualizer', or 'visualizer2'
  const [highlightedEventIndices, setHighlightedEventIndices] = useState([]);
  const [unifySpaceSlug, setUnifySpaceSlug] = useState('');
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Brand mode state (segment vs twilio)
  const [brandMode, setBrandMode] = useState(() => {
    const saved = localStorage.getItem('brandMode');
    return saved || 'segment'; // default to segment
  });

  // Glow mode state
  const [currentGlowMode, setCurrentGlowMode] = useState(() => {
    try {
      const saved = localStorage.getItem('glowMode');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure it's a valid glow mode object with required properties
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.mainBg) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Invalid glow mode data in localStorage, clearing:', error);
      localStorage.removeItem('glowMode');
    }
    return null;
  });

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Apply glow mode styles to document
  useEffect(() => {
    if (currentGlowMode) {
      document.documentElement.classList.add('glow-mode');
      
      // Set CSS custom properties for the glow mode
      const root = document.documentElement;
      root.style.setProperty('--glow-main-bg', currentGlowMode.mainBg);
      root.style.setProperty('--glow-component-bg', currentGlowMode.componentBg);
      root.style.setProperty('--glow-text-color', currentGlowMode.textColor);
      root.style.setProperty('--glow-color', currentGlowMode.glowColor);
      root.style.setProperty('--glow-button-primary', currentGlowMode.buttonPrimary);
      root.style.setProperty('--glow-button-secondary', currentGlowMode.buttonSecondary);
      root.style.setProperty('--glow-border', currentGlowMode.border);
      root.style.setProperty('--glow-shadow', currentGlowMode.shadow);
      
      // Remove dark mode when glow mode is active
      document.documentElement.classList.remove('dark-mode');
    } else {
      document.documentElement.classList.remove('glow-mode');
      
      // Clear CSS custom properties
      const root = document.documentElement;
      root.style.removeProperty('--glow-main-bg');
      root.style.removeProperty('--glow-component-bg');
      root.style.removeProperty('--glow-text-color');
      root.style.removeProperty('--glow-color');
      root.style.removeProperty('--glow-button-primary');
      root.style.removeProperty('--glow-button-secondary');
      root.style.removeProperty('--glow-border');
      root.style.removeProperty('--glow-shadow');
    }
    try {
      localStorage.setItem('glowMode', JSON.stringify(currentGlowMode));
    } catch (error) {
      console.warn('Failed to save glow mode to localStorage:', error);
    }
  }, [currentGlowMode]);

  // Apply brand mode classes to document
  useEffect(() => {
    // Remove existing brand mode classes
    document.documentElement.classList.remove('segment-mode', 'twilio-mode');
    
    // Add the current brand mode class
    document.documentElement.classList.add(`${brandMode}-mode`);
    
    localStorage.setItem('brandMode', brandMode);
  }, [brandMode]);

  // Load unifySpaceSlug from server configuration
  useEffect(() => {
    const loadUnifySpaceSlug = async () => {
      try {
        const response = await fetch('http://localhost:8888/api/config');
        const config = await response.json();
        if (config.unifySpaceSlug) {
          setUnifySpaceSlug(config.unifySpaceSlug);
        }
      } catch (error) {
        console.error('Failed to load unifySpaceSlug:', error);
      }
    };
    loadUnifySpaceSlug();
    
    // Set up an interval to periodically check for updates
    const interval = setInterval(loadUnifySpaceSlug, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Toggle dark mode
  const handleToggleDarkMode = () => {
    // Clear glow mode when switching to dark/light mode
    if (currentGlowMode) {
      setCurrentGlowMode(null);
    }
    setIsDarkMode(prev => !prev);
  };

  // Handle glow mode change
  const handleGlowModeChange = (glowMode) => {
    setCurrentGlowMode(glowMode);
    setIsDarkMode(false); // Disable dark mode when glow mode is active
  };

  // Load enabled identifiers from ID Resolution Config (localStorage)
  const enabledIdentifiers = useMemo(() => {
    try {
      const saved = localStorage.getItem('idres_config_identifiers');
      if (saved) {
        return JSON.parse(saved).filter(id => id.enabled);
      }
    } catch {}
    // fallback to defaults if not found
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
  }, []);

  // Helper to normalize identifier: lowercase, snake_case, preserve dots
  const normalizeIdentifier = (str) => {
    return str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_.]/g, '');
  };

  // Extract identifier values from events and unique users
  const identifierOptions = useMemo(() => {
    const found = new Set();
    // Helper to add if value exists
    const add = (field, value) => {
      if (value && typeof value === 'string' && value.trim()) {
        found.add(`${field}:${value.trim()}`);
      }
    };
    // Map of id to possible event field names
    const idFieldMap = {
      user_id: ['userId', 'user_id', 'userID'],
      anonymous_id: ['anonymousId', 'anonymous_id'],
      email: ['email'],
      phone: ['phone'],
      'android.id': ['context.device.id'],
      'android.idfa': ['context.device.advertisingId'],
      'android.push_token': ['context.device.token'],
      'ga_client_id': ['context.integrations.Google Analytics.clientId'],
      'ios.id': ['context.device.id'],
      'ios.idfa': ['context.device.advertisingId'],
      'ios.push_token': ['context.device.token'],
    };
    // For each event
    events.forEach(event => {
      try {
        const parsed = JSON.parse(event.rawData);
        enabledIdentifiers.forEach(identifier => {
          const id = normalizeIdentifier(identifier.id);
          // Try direct field
          if (idFieldMap[id]) {
            for (const path of idFieldMap[id]) {
              const parts = path.split('.');
              let val = parsed;
              for (const part of parts) {
                if (val && typeof val === 'object' && part in val) {
                  val = val[part];
                } else {
                  val = undefined;
                  break;
                }
              }
              if (val && typeof val === 'string') {
                add(id, val);
              }
            }
          }
          // Also check traits and properties for email/phone/custom
          if (id === 'email' || id === 'phone' || identifier.isCustom) {
            if (parsed.traits && parsed.traits[id]) add(id, parsed.traits[id]);
            if (parsed.properties && parsed.properties[id]) add(id, parsed.properties[id]);
            // context.traits
            if (parsed.context && parsed.context.traits && parsed.context.traits[id]) add(id, parsed.context.traits[id]);
            // context.externalIds
            if (parsed.context && Array.isArray(parsed.context.externalIds)) {
              parsed.context.externalIds.forEach(ext => {
                if (ext.type === id && ext.id) add(id, ext.id);
              });
            }
          }
        });
      } catch {}
    });
    // Also scan unique users
    // (UniqueUsersList builds users from events, so this is mostly redundant, but we can add for completeness)
    // ...
    return Array.from(found).sort();
  }, [events, enabledIdentifiers]);

  // Handle saving a new event from EventBuilder
  const handleSaveEvent = (eventData) => {
    setEvents(prevEvents => {
      // Prevent duplicates: check for same rawData and writeKey
      const isDuplicate = prevEvents.some(
        e => e.rawData === eventData.rawData && e.writeKey === eventData.writeKey
      );
      
      console.log('Attempting to save event:', {
        rawData: eventData.rawData.substring(0, 50) + '...',
        writeKey: eventData.writeKey,
        isDuplicate
      });
      
      if (isDuplicate) {
        console.log('Duplicate detected, not adding');
        return prevEvents;
      }
      
      console.log('Adding new event to list');
      return [...prevEvents, eventData];
    });
  };

  // Handle removing a specific event
  const handleRemoveEvent = (eventId) => {
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  };

  // Handle clearing all events
  const handleClearEvents = () => {
    if (window.confirm('Are you sure you want to clear all events?')) {
      setEvents([]);
    }
  };

  // Handle highlighting events
  const handleHighlightEvents = (eventIndices) => {
    setHighlightedEventIndices(eventIndices);
  };

  // Handle loading a preset event into EventBuilder
  const handleLoadEvent = (eventSpec) => {
    // Create a new object with timestamp to force re-render
    const eventWithTimestamp = {
      ...eventSpec,
      _loadTimestamp: Date.now()
    };
    
    setSelectedEvent(eventWithTimestamp);
    setCurrentEventPayload(eventSpec.payload);
  };

  // Handle current user changes
  const handleUserChange = (userData) => {
    setCurrentUser(userData);
  };

  // Handle event info changes
  const handleEventInfoChange = useCallback((eventInfo) => {
    // Handle clear action from EventBuilder
    if (eventInfo?.action === 'clear' && eventInfo?.clearSelectedEvent) {
      setSelectedEvent(null);
      setCurrentEventInfo(null);
      setCurrentEventPayload(null);
      return;
    }
    
    // Only update if eventInfo is not null/undefined
    if (eventInfo) {
      setCurrentEventInfo(eventInfo);
      // Also update the current event payload for CurrentUser component
      if (eventInfo.payload) {
        setCurrentEventPayload(eventInfo.payload);
      }
    }
  }, []);

  // Handle user update request
  const handleUserUpdate = useCallback((userData) => {
    setCurrentUser(userData);
    // Trigger a re-render of EventBuilder with updated user data
    setUserUpdateTrigger(prev => prev + 1);
  }, []);

  // Handle current user update from EventBuilder payload changes
  const handleCurrentUserUpdateFromPayload = useCallback((extractedUserData) => {
    console.log('📥 [App] Received user data from EventBuilder:', extractedUserData);
    
    // Merge the extracted user data with current user data
    setCurrentUser(prevUser => {
      const updatedUser = {
        ...prevUser,
        ...extractedUserData
      };
      console.log('📝 [App] Updated currentUser with payload data:', updatedUser);
      return updatedUser;
    });
  }, []);

  // Handle save request from EventButtons
  const handleSaveFromEventButtons = useCallback(() => {
    if (eventBuilderRef.current) {
      eventBuilderRef.current.saveEvent();
    }
  }, []);

  // Handle editing an event in the EventList
  const handleEditEvent = (eventId, newPayload) => {
    setEvents(prevEvents => prevEvents.map(event =>
      event.id === eventId
        ? { ...event, rawData: JSON.stringify(newPayload), formattedData: JSON.stringify(newPayload, null, 2) }
        : event
    ));
  };

  return (
    <div className="app">
      {/* Left Sidebar - Event List (Hidden in Visualizer) */}
      {currentPage === 'main' && (
        <aside className="app__sidebar">
          <EventList 
            events={events}
            onRemoveEvent={handleRemoveEvent}
            onClearEvents={handleClearEvents}
            highlightedEventIndices={highlightedEventIndices}
            onEditEvent={handleEditEvent}
          />
        </aside>
      )}

      {/* Content wrapper for main area and footer */}
      <div className="app__content-wrapper">
        {/* Main Content Area */}
        <main className={`app__main ${currentPage === 'visualizer' || currentPage === 'visualizer2' ? 'app__main--full-width' : ''}`}>
        {/* Header */}
        <header className="app__header">
          <div className="app__header-content">
            <div className="app__title-section">
              <h1 className="app__title">
                <img src="/assets/SegmentLogo.svg" alt="Segment" className="app__title-icon" />
                Identity Resolution Visualizer
              </h1>
              <p className="app__subtitle">
                Build and simulate event processing workflows using Segment's API specifications
              </p>
            </div>
            <div className="app__header-actions">
              <button 
                onClick={() => {
                  setCurrentPage('main');
                  setShowSourceConfig(true);
                }}
                className="app__config-button"
                title="Configure Segment Source & Tracking Settings"
              >
                <img src="/assets/Connections.svg" alt="Connections" className="app__button-icon" />
                Source Config
              </button>
              <button 
                onClick={() => {
                  setCurrentPage('main');
                  setShowUnifySpaceConfig(true);
                }}
                className="app__config-button"
                title="Configure Unify Space & Identity Resolution"
              >
                <img src="/assets/Unify.svg" alt="Unify" className="app__button-icon" />
                Unify Config
              </button>
              <button 
                onClick={() => {
                  setCurrentPage('main');
                  setShowProfileLookup(!showProfileLookup);
                }}
                className={`app__lookup-button ${showProfileLookup ? 'app__lookup-button--active' : ''}`}
                title="Profile Lookup Tool"
              >
                <img src="/assets/compass.svg" alt="Compass" className="app__button-icon" />
                Lookup
              </button>
              <button 
                onClick={() => setCurrentPage('visualizer')}
                className="app__visualize-button"
                title="Open Identity Resolution Visualizer"
                disabled={events.length === 0}
              >
                <img src="/assets/pie-chart.svg" alt="Visualize" className="app__button-icon app__button-icon--color" />
                Visualize
              </button>
              <button 
                onClick={() => setCurrentPage('visualizer2')}
                className="app__visualize2-button"
                title="Open Identity Resolution Simulator"
                disabled={events.length === 0}
              >
                <img src="/assets/pie-chart.svg" alt="Simulate" className="app__button-icon app__button-icon--color" />
                Simulate
              </button>
            </div>
          </div>
        </header>

        {/* Conditional Page Rendering */}
        {currentPage === 'main' && (
          <>
            {/* Profile Lookup Section (Collapsible) */}
            {showProfileLookup && (
              <section className="app__profile-lookup-section">
                <ProfileLookup 
                  identifierOptions={identifierOptions}
                  events={events}
                  onHighlightEvents={handleHighlightEvents}
                />
              </section>
            )}

        {/* Top Section - Current User */}
        <section className="app__user-section">
          <div className="app__user-container">
            <CurrentUser 
              onUserChange={handleUserChange}
              eventPayload={currentEventPayload}
              onUserUpdate={handleUserUpdate}
            />
          </div>
          <div className="app__unique-users-container">
            <UniqueUsersList 
              events={events}
              currentUser={currentUser}
              onHighlightEvents={handleHighlightEvents}
            />
          </div>
        </section>

        {/* Main Builder Section - Event Builder, Core Events, and Product Events in a single row */}
        <section className="app__builder-buttons-section">
          {/* Event Builder */}
          <div className="app__builder-container">
            <EventBuilder 
              ref={eventBuilderRef}
              onSave={handleSaveEvent} 
              selectedEvent={selectedEvent}
              currentUser={currentUser}
              onEventInfoChange={handleEventInfoChange}
              userUpdateTrigger={userUpdateTrigger}
              sourceConfigUpdateTrigger={sourceConfigUpdateTrigger}
              onCurrentUserUpdate={handleCurrentUserUpdateFromPayload}
            />
          </div>

          {/* Core Events */}
          <div className="app__core-events-container">
            <EventButtons 
              onLoadEvent={handleLoadEvent} 
              eventType="core" 
              currentUser={currentUser}
              currentLoadedEvent={selectedEvent}
              onSaveEvent={handleSaveFromEventButtons}
            />
          </div>

          {/* Product Events */}
          <div className="app__product-events-container">
            <EventButtons 
              onLoadEvent={handleLoadEvent} 
              eventType="product" 
              currentUser={currentUser}
              currentLoadedEvent={selectedEvent}
              onSaveEvent={handleSaveFromEventButtons}
            />
          </div>
        </section>
          </>
        )}

        {/* Identity Resolution Visualizer Page */}
        {currentPage === 'visualizer' && (
          <Visualizer 
            events={events}
            identifierOptions={identifierOptions}
            unifySpaceSlug={unifySpaceSlug}
            onClose={() => setCurrentPage('main')}
          />
        )}

        {/* Identity Resolution Simulator Page */}
        {currentPage === 'visualizer2' && (
          <Visualizer2 
            events={events}
            identifierOptions={identifierOptions}
            unifySpaceSlug={unifySpaceSlug}
            onClose={() => setCurrentPage('main')}
          />
        )}
      </main>

      {/* Theme Buttons - Above Footer */}
      <div className="app__floating-theme-buttons">
        {/* Brand Mode Toggle (Segment/Twilio) */}
        <button 
          onClick={() => setBrandMode(brandMode === 'segment' ? 'twilio' : 'segment')}
          className={`app__floating-theme-button app__floating-theme-button--brand ${brandMode === 'twilio' ? 'app__floating-theme-button--twilio' : 'app__floating-theme-button--segment'}`}
          title={`Switch to ${brandMode === 'segment' ? 'Twilio' : 'Segment'} Mode`}
        >
          {brandMode === 'segment' ? (
            <img src="/assets/SegmentLogo.svg" alt="Segment" className="app__brand-icon" />
          ) : (
            <img src="/assets/TwilioButtonLogo.png" alt="Twilio" className="app__brand-icon" />
          )}
        </button>
        
        {/* Light/Dark Mode Toggle */}
        <button 
          onClick={handleToggleDarkMode}
          className="app__floating-theme-button app__floating-theme-button--primary"
          title={isDarkMode ? "Light Mode" : "Dark Mode"}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        
        {/* Clear Glow Mode Button (only show when glow mode is active) */}
        {currentGlowMode && (
          <button 
            onClick={() => setCurrentGlowMode(null)}
            className="app__floating-theme-button app__floating-theme-button--clear"
            title="Exit Glow Mode"
          >
            ✨
          </button>
        )}
        
        {/* Twilio Glow Button - positioned on the right */}
        <div className="app__twilio-glow-button-wrapper">
          <GlowModesList
            currentGlowMode={currentGlowMode}
            onGlowModeChange={handleGlowModeChange}
          />
        </div>
      </div>

      {/* Footer - Full width excluding EventList sidebar */}
      <footer className="app__footer">
        <p className="app__footer-text">
          This tool simulates event processing for identity resolution systems using Segment's API specifications.
          Events are processed in sequence with configurable timeouts to simulate real-world scenarios and to allow time for profiles to be resolved within Unify.
        </p>
      </footer>
      </div>

      {/* Modals */}
      {showUnifySpaceConfig && (
        <UnifySpaceConfig 
          isOpen={showUnifySpaceConfig}
          onClose={() => setShowUnifySpaceConfig(false)}
        />
      )}

      {showSourceConfig && (
        <SourceConfig 
          isOpen={showSourceConfig}
          onClose={() => {
            setShowSourceConfig(false);
            setSourceConfigUpdateTrigger(prev => prev + 1);
          }}
          unifySpaceSlug={unifySpaceSlug}
        />
      )}
    </div>
  );
}

export default App;