import React, { useState, useCallback } from 'react';
import EventBuilder from './components/EventBuilder/EventBuilder.jsx';
import EventList from './components/EventList/EventList.jsx';
import EventButtons from './components/EventButtons/EventButtons.jsx';
import CurrentUser from './components/CurrentUser/CurrentUser.jsx';
import UniqueUsersList from './components/UniqueUsersList/UniqueUsersList.jsx';
import UnifySpaceConfig from './components/UnifySpaceConfig/UnifySpaceConfig.jsx';
import SourceConfig from './components/SourceConfig/SourceConfig.jsx';
import ProfileLookup from './components/ProfileLookup/ProfileLookup.jsx';
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

  return (
    <div className="app">
      {/* Left Sidebar - Event List */}
      <aside className="app__sidebar">
        <EventList 
          events={events}
          onRemoveEvent={handleRemoveEvent}
          onClearEvents={handleClearEvents}
          highlightedEventIndices={highlightedEventIndices}
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
            <ProfileLookup />
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