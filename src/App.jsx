import React, { useState, useCallback } from 'react';
import EventBuilder from './components/EventBuilder/EventBuilder.jsx';
import EventList from './components/EventList/EventList.jsx';
import EventButtons from './components/EventButtons/EventButtons.jsx';
import CurrentUser from './components/CurrentUser/CurrentUser.jsx';
import UniqueUsersList from './components/UniqueUsersList/UniqueUsersList.jsx';
import UnifySpaceConfig from './components/UnifySpaceConfig/UnifySpaceConfig.jsx';
import SourceConfig from './components/SourceConfig/SourceConfig.jsx';
import ProfileLookup from './components/ProfileLookup/ProfileLookup.jsx';
import { useEffect, useMemo } from 'react';
import './App.css';


function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState({});
  const [currentEventPayload, setCurrentEventPayload] = useState(null);
  const [currentEventInfo, setCurrentEventInfo] = useState(null);
  const [userUpdateTrigger, setUserUpdateTrigger] = useState(0);
  const [showUnifySpaceConfig, setShowUnifySpaceConfig] = useState(false);
  const [showSourceConfig, setShowSourceConfig] = useState(false);
  const [showProfileLookup, setShowProfileLookup] = useState(false);
  const [highlightedEventIndices, setHighlightedEventIndices] = useState([]);

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
    setEvents(prevEvents => [...prevEvents, eventData]);
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
      {/* Left Sidebar - Event List */}
      <aside className="app__sidebar">
        <EventList 
          events={events}
          onRemoveEvent={handleRemoveEvent}
          onClearEvents={handleClearEvents}
          highlightedEventIndices={highlightedEventIndices}
          onEditEvent={handleEditEvent}
        />
      </aside>

      {/* Main Content Area */}
      <main className="app__main">
        {/* Header */}
        <header className="app__header">
          <div className="app__header-content">
            <div className="app__title-section">
              <h1 className="app__title">Identity Resolution Visualizer</h1>
              <p className="app__subtitle">
                Build and simulate event processing workflows using Segment's API specifications
              </p>
            </div>
            <div className="app__header-actions">
              <button 
                onClick={() => setShowSourceConfig(true)}
                className="app__config-button"
                title="Configure Segment Source & Tracking Settings"
              >
                🔧 Source Config
              </button>
              <button 
                onClick={() => setShowUnifySpaceConfig(true)}
                className="app__config-button"
                title="Configure Unify Space & Identity Resolution"
              >
                ⚙️ Unify Config
              </button>
              <button 
                onClick={() => setShowProfileLookup(!showProfileLookup)}
                className={`app__lookup-button ${showProfileLookup ? 'app__lookup-button--active' : ''}`}
                title="Profile Lookup Tool"
              >
                🔍 Lookup
              </button>
            </div>
          </div>
        </header>

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
              onSave={handleSaveEvent} 
              selectedEvent={selectedEvent}
              currentUser={currentUser}
              onEventInfoChange={handleEventInfoChange}
              userUpdateTrigger={userUpdateTrigger}
            />
          </div>

          {/* Core Events */}
          <div className="app__core-events-container">
            <EventButtons onLoadEvent={handleLoadEvent} eventType="core" />
          </div>

          {/* Product Events */}
          <div className="app__product-events-container">
            <EventButtons onLoadEvent={handleLoadEvent} eventType="product" />
          </div>
        </section>

        {/* Footer */}
        <footer className="app__footer">
          <p className="app__footer-text">
            This tool simulates event processing for identity resolution systems using Segment's API specifications.
            Events are processed in sequence with configurable timeouts to simulate real-world scenarios and to allow time for profiles to be resolved within Unify.
          </p>
        </footer>
      </main>

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
          onClose={() => setShowSourceConfig(false)}
        />
      )}
    </div>
  );
}

export default App;