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
  // Initialize events from localStorage if available
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('app_events');
      if (saved) {
        const parsedEvents = JSON.parse(saved);
        console.log('Loaded events from localStorage:', parsedEvents.length);
        return parsedEvents;
      }
    } catch (error) {
      console.error('Error loading events from localStorage:', error);
    }
    return [];
  });
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Initialize currentUser from localStorage if available  
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('app_currentUser');
      if (saved) {
        const parsedUser = JSON.parse(saved);
        console.log('Loaded currentUser from localStorage:', parsedUser);
        return parsedUser;
      }
    } catch (error) {
      console.error('Error loading currentUser from localStorage:', error);
    }
    return {};
  });
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
  
  // Persistent checkpoint state for EventList
  const [eventListCheckpoint, setEventListCheckpoint] = useState(() => {
    try {
      const saved = localStorage.getItem('eventListCheckpoint');
      return saved ? JSON.parse(saved) : -1;
    } catch (error) {
      console.error('Error loading checkpoint from localStorage:', error);
      return -1;
    }
  });

  // Persistent stop checkpoint state for EventList
  const [eventListStopCheckpoint, setEventListStopCheckpoint] = useState(() => {
    try {
      const saved = localStorage.getItem('eventListStopCheckpoint');
      return saved ? JSON.parse(saved) : -1;
    } catch (error) {
      console.error('Error loading stop checkpoint from localStorage:', error);
      return -1;
    }
  });
  
  // Persistent profile API results
  const [profileApiResults, setProfileApiResults] = useState(() => {
    try {
      const saved = localStorage.getItem('profileApiResults');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading profile API results from localStorage:', error);
      return {};
    }
  });
  
  // Dark mode state - Temporarily disabled
  /*
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  */
  const isDarkMode = false; // Hardcoded to false for now

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

  // Persist events to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('app_events', JSON.stringify(events));
      console.log('Persisted events to localStorage:', events.length);
    } catch (error) {
      console.error('Error saving events to localStorage:', error);
    }
  }, [events]);

  // Persist currentUser to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('app_currentUser', JSON.stringify(currentUser));
      // Reduced logging - only log on errors
      // console.log('Persisted currentUser to localStorage:', currentUser);
    } catch (error) {
      console.error('Error saving currentUser to localStorage:', error);
    }
  }, [currentUser]);

  // Apply dark mode class to document - Temporarily disabled
  /*
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);
  */

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

  // Persist profile API results to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('profileApiResults', JSON.stringify(profileApiResults));
    } catch (error) {
      console.error('Error saving profile API results to localStorage:', error);
    }
  }, [profileApiResults]);

  // Toggle dark mode - Temporarily disabled
  /*
  const handleToggleDarkMode = () => {
    // Clear glow mode when switching to dark/light mode
    if (currentGlowMode) {
      setCurrentGlowMode(null);
    }
    setIsDarkMode(prev => !prev);
  };
  */

  // Handle glow mode change
  const handleGlowModeChange = (glowMode) => {
    setCurrentGlowMode(glowMode);
    // setIsDarkMode(false); // Disable dark mode when glow mode is active - Commented out
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

  // Handle reordering events
  const handleReorderEvents = (fromIndex, toIndex) => {
    setEvents(prevEvents => {
      const newEvents = [...prevEvents];
      const [movedEvent] = newEvents.splice(fromIndex, 1);
      newEvents.splice(toIndex, 0, movedEvent);
      return newEvents;
    });
  };

  // Handle clearing all events
  const handleClearEvents = () => {
    setEvents([]);
    // Also clear UniqueUsersList localStorage data
    try {
      localStorage.removeItem('uniqueUsers_data');
      console.log('Cleared unique users data from localStorage');
    } catch (error) {
      console.error('Error clearing unique users from localStorage:', error);
    }
  };

  // Handle highlighting events
  const handleHighlightEvents = (eventIndices) => {
    setHighlightedEventIndices(eventIndices);
  };

  // Handle profile API results updates
  const handleProfileApiResultsUpdate = (newResults) => {
    setProfileApiResults(prevResults => {
      const merged = { ...prevResults };
      
      Object.entries(newResults).forEach(([identifier, result]) => {
        if (merged[identifier]) {
          // If we already have data for this identifier, merge carefully
          const existingResult = merged[identifier];
          const mergedResult = {
            ...result,
            // Preserve and merge endpoint metadata
            _endpoints: [
              ...(existingResult._endpoints || [existingResult._endpoint || 'unknown']), 
              ...(result._endpoints || [result._endpoint || 'unknown'])
            ].filter((ep, index, arr) => arr.indexOf(ep) === index), // dedupe
            _combinedData: {
              ...(existingResult._combinedData || { [existingResult._endpoint || 'unknown']: existingResult.data }),
              ...(result._combinedData || { [result._endpoint || 'unknown']: result.data })
            }
          };
          merged[identifier] = mergedResult;
        } else {
          // First time seeing this identifier
          merged[identifier] = result;
        }
      });
      
      return merged;
    });
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

  // Handle removing a source from an event
  const handleRemoveSourceFromEvent = (eventId, sourceIndex) => {
    setEvents(prevEvents => prevEvents.map(event => {
      if (event.id !== eventId) return event;
      
      // Handle events with new multi-source format
      if (event.sources && event.sources.length > 0) {
        const newSources = [...event.sources];
        newSources.splice(sourceIndex, 1);
        
        // If no sources left, keep the event but clear source data
        if (newSources.length === 0) {
          return {
            ...event,
            sources: [],
            writeKeys: [],
            sourceNames: [],
            sourceTypes: [],
            writeKey: null,
            sourceName: null,
            sourceType: null
          };
        }
        
        // Update all source-related fields
        return {
          ...event,
          sources: newSources,
          writeKeys: newSources.map(source => source.settings?.writeKey).filter(Boolean),
          sourceNames: newSources.map(source => source.name).filter(Boolean),
          sourceTypes: newSources.map(source => source.type).filter(Boolean),
          // Update legacy fields to use first remaining source
          writeKey: newSources[0]?.settings?.writeKey || null,
          sourceName: newSources[0]?.name || null,
          sourceType: newSources[0]?.type || null
        };
      } 
      // Handle legacy single-source format
      else {
        return {
          ...event,
          writeKey: null,
          sourceName: null,
          sourceType: null
        };
      }
    }));
  };

  // Handle editing an event in EventBuilder (load it for editing)
  const handleEditEventInBuilder = (event) => {
    try {
      const eventPayload = JSON.parse(event.rawData);
      const eventSpec = {
        id: `edit-${event.id}`,
        name: `Edit Event #${events.findIndex(e => e.id === event.id) + 1}`,
        payload: eventPayload,
        _editingEventId: event.id, // Store reference to original event
        _editingEvent: event // Store full event object for source management
      };
      handleLoadEvent(eventSpec);
    } catch (error) {
      console.error('Failed to parse event for editing:', error);
    }
  };

  // Handle adding a source to an event being edited
  const handleAddSourceToEvent = (eventId, source) => {
    setEvents(prevEvents => prevEvents.map(event => {
      if (event.id !== eventId) return event;
      
      // Check if source already exists (avoid duplicates)
      if (event.sources && event.sources.some(s => s.id === source.id)) {
        return event; // Source already exists, don't add again
      }
      
      // Handle events with new multi-source format
      if (event.sources) {
        const newSources = [...event.sources, source];
        return {
          ...event,
          sources: newSources,
          writeKeys: newSources.map(source => source.settings?.writeKey).filter(Boolean),
          sourceNames: newSources.map(source => source.name).filter(Boolean),
          sourceTypes: newSources.map(source => source.type).filter(Boolean),
          // Update legacy fields to use first source
          writeKey: newSources[0]?.settings?.writeKey || null,
          sourceName: newSources[0]?.name || null,
          sourceType: newSources[0]?.type || null
        };
      } 
      // Handle legacy single-source format - convert to multi-source
      else {
        const newSources = [source];
        // If there was already a legacy source, preserve it
        if (event.writeKey || event.sourceName || event.sourceType) {
          const legacySource = {
            id: 'legacy',
            name: event.sourceName,
            type: event.sourceType,
            settings: { writeKey: event.writeKey }
          };
          newSources.unshift(legacySource);
        }
        
        return {
          ...event,
          sources: newSources,
          writeKeys: newSources.map(source => source.settings?.writeKey).filter(Boolean),
          sourceNames: newSources.map(source => source.name).filter(Boolean),
          sourceTypes: newSources.map(source => source.type).filter(Boolean),
          // Update legacy fields to use first source
          writeKey: newSources[0]?.settings?.writeKey || null,
          sourceName: newSources[0]?.name || null,
          sourceType: newSources[0]?.type || null
        };
      }
    }));
  };

  // Handle checkpoint change in EventList
  const handleCheckpointChange = (checkpointIndex) => {
    setEventListCheckpoint(checkpointIndex);
    try {
      localStorage.setItem('eventListCheckpoint', JSON.stringify(checkpointIndex));
    } catch (error) {
      console.error('Error saving checkpoint to localStorage:', error);
    }
  };

  // Handle stop checkpoint change in EventList
  const handleStopCheckpointChange = (stopCheckpointIndex) => {
    setEventListStopCheckpoint(stopCheckpointIndex);
    try {
      localStorage.setItem('eventListStopCheckpoint', JSON.stringify(stopCheckpointIndex));
    } catch (error) {
      console.error('Error saving stop checkpoint to localStorage:', error);
    }
  };

  // Handle CSV upload start - set checkpoint to above first event
  const handleCSVUploadStart = () => {
    setEventListCheckpoint(-1);
    setEventListStopCheckpoint(-1);
    try {
      localStorage.setItem('eventListCheckpoint', JSON.stringify(-1));
      localStorage.setItem('eventListStopCheckpoint', JSON.stringify(-1));
    } catch (error) {
      console.error('Error saving checkpoints to localStorage:', error);
    }
  };

  return (
    <div className="app">
      {/* Left Sidebar - Event List (Hidden in Visualizer) */}
      {currentPage === 'main' && (
        <aside 
          className="app__sidebar"
          style={{
            backgroundColor: brandMode === 'twilio' ? '#0f172a' : '#ffffff'
          }}
        >
          <EventList 
            events={events}
            onRemoveEvent={handleRemoveEvent}
            onReorderEvents={handleReorderEvents}
            onClearEvents={handleClearEvents}
            highlightedEventIndices={highlightedEventIndices}
            onEditEvent={handleEditEvent}
            checkpointIndex={eventListCheckpoint}
            onCheckpointChange={handleCheckpointChange}
            stopCheckpointIndex={eventListStopCheckpoint}
            onStopCheckpointChange={handleStopCheckpointChange}
            onRemoveSourceFromEvent={handleRemoveSourceFromEvent}
            onEditEventInBuilder={handleEditEventInBuilder}
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
              {currentPage === 'visualizer2' ? (
                <div className="app__visualizer2-header">
                  <div className="app__visualizer2-header-left">
                    <img src="/assets/pie-chart.svg" alt="Visualizer" className="app__header-icon" />
                    <h1 className="app__title">
                      Identity Resolution Visualizer
                      <div className="app__separator">
                        <div className="separator-line">
                          <div className="dash-pixel dash-pixel-1"></div>
                          <div className="dash-pixel dash-pixel-2"></div>
                          <div className="dash-pixel dash-pixel-3"></div>
                          <div className="dash-pixel dash-pixel-4"></div>
                          <div className="dash-pixel dash-pixel-5"></div>
                          <div className="dash-pixel dash-pixel-6"></div>
                          <div className="dash-pixel dash-pixel-7"></div>
                        </div>
                      </div>
                      Event Flow 
                    </h1>
                  </div>
                  <p className="app__subtitle">
                    This visualizer shows how events flow through Segment's identity resolution algorithm, 
                    highlighting how profiles are created, merged, and updated based on incoming identifiers.
                  </p>
                </div>
              ) : (
                <>
                  <h1 className="app__title">
                    <img src="/assets/SegmentLogo.svg" alt="Segment" className="app__title-icon" />
                    Identity Resolution Visualizer
                  </h1>
                  <p className="app__subtitle">
                    Build and simulate event processing workflows using Segment's API specifications
                  </p>
                </>
              )}
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
                  const newShowState = !showProfileLookup;
                  setShowProfileLookup(newShowState);
                  
                  // If opening the lookup, scroll to top of page to show header and lookup section
                  if (newShowState) {
                    setTimeout(() => {
                      window.scrollTo({ 
                        top: 0, 
                        behavior: 'smooth' 
                      });
                    }, 100);
                  }
                }}
                className={`app__lookup-button ${showProfileLookup ? 'app__lookup-button--active' : ''}`}
                title="Profile API Lookup Tool"
              >
                <img src="/assets/compass.svg" alt="Compass" className="app__button-icon" />
                Lookup
              </button>
              {/* <button 
                onClick={() => setCurrentPage('visualizer')}
                className="app__visualize-button"
                title="Open Identity Resolution Visualizer"
                disabled={events.length === 0}
              >
                <img src="/assets/pie-chart.svg" alt="Visualize" className="app__button-icon app__button-icon--color" />
                Visualize
              </button> */}
              <button 
                onClick={() => setCurrentPage('visualizer2')}
                className="app__visualize2-button"
                title="Open Identity Resolution Simulator"
                disabled={events.length === 0}
              >
                <img src="/assets/pie-chart.svg" alt="Simulate" className="app__button-icon app__button-icon--color" />
                Visualize
              </button>
            </div>
          </div>
        </header>

        {/* Conditional Page Rendering */}
        {currentPage === 'main' && (
          <>
            {/* Profile API Lookup Section (Collapsible) */}
            {showProfileLookup && (
              <section className="app__profile-lookup-section">
                <ProfileLookup 
                  identifierOptions={identifierOptions}
                  events={events}
                  onHighlightEvents={handleHighlightEvents}
                  profileApiResults={profileApiResults}
                  onProfileApiResultsUpdate={handleProfileApiResultsUpdate}
                  onAddEventToList={handleSaveEvent}
                  onClearProfiles={() => {
                    setProfileApiResults({});
                  }}
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
              onAddEventToList={handleSaveEvent}
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
              onCSVUploadStart={handleCSVUploadStart}
              onAddSourceToEvent={handleAddSourceToEvent}
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
            profileApiResults={profileApiResults}
            onClose={() => setCurrentPage('main')}
          />
        )}

        {/* Identity Resolution Simulator Page */}
        {currentPage === 'visualizer2' && (
          <Visualizer2 
            events={events}
            identifierOptions={identifierOptions}
            unifySpaceSlug={unifySpaceSlug}
            profileApiResults={profileApiResults}
            onClose={() => setCurrentPage('main')}
          />
        )}
      </main>

      {/* Footer - Full width excluding EventList sidebar */}
      <footer className="app__footer">
        <div className="app__footer-content">
          <div></div> {/* Left spacer */}
          <p className="app__footer-text">
            This tool simulates event processing for identity resolution systems using Segment's API specifications.
            Events are processed in sequence with configurable timeouts to simulate real-world scenarios and to allow time for profiles to be resolved within Unify.
          </p>
          
          {/* Theme Buttons in Footer */}
          <div className="app__footer-theme-buttons">
            {/* Brand Mode Toggle (Segment/Twilio) */}
            <button 
              onClick={() => setBrandMode(brandMode === 'segment' ? 'twilio' : 'segment')}
              className={`app__footer-theme-button ${brandMode === 'twilio' ? 'app__footer-theme-button--twilio' : 'app__footer-theme-button--segment'}`}
              title={`Switch to ${brandMode === 'segment' ? 'Twilio' : 'Segment'} Mode`}
            >
              {brandMode === 'segment' ? (
                <img src="/assets/SegmentLogo.svg" alt="Segment" className="app__brand-icon" />
              ) : (
                <img src="/assets/TwilioButtonLogo.png" alt="Twilio" className="app__brand-icon" />
              )}
            </button>
            
            {/* Clear Glow Mode Button (only show when glow mode is active) */}
            {currentGlowMode && (
              <button 
                onClick={() => setCurrentGlowMode(null)}
                className="app__footer-theme-button app__footer-theme-button--clear"
                title="Exit Glow Mode"
              >
                ✨
              </button>
            )}
            
            {/* Glow Modes List */}
            <div className="app__twilio-glow-button-wrapper">
              <GlowModesList
                currentGlowMode={currentGlowMode}
                onGlowModeChange={handleGlowModeChange}
              />
            </div>
          </div>
        </div>
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