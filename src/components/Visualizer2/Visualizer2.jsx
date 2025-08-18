import React, { useState } from 'react';
import DiagramTimeline2 from './DiagramTimeline2.jsx';
import './Visualizer2.css';

const Visualizer2 = ({ 
  events, 
  identifierOptions,
  unifySpaceSlug,
  profileApiResults = {},
  onClose 
}) => {
  // Load ID Resolution Config from localStorage
  const [idResConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('idres_config_identifiers');
      if (saved) {
        return JSON.parse(saved).filter(id => id.enabled);
      }
    } catch {}
    // fallback to defaults if not found
    return [
      { id: 'user_id', name: 'User ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
      { id: 'email', name: 'Email', enabled: true, isCustom: false, limit: 5, frequency: 'Ever' },
      { id: 'phone', name: 'Phone', enabled: true, isCustom: true, limit: 2, frequency: 'Ever' },
      { id: 'anonymous_id', name: 'Anonymous ID', enabled: true, isCustom: false, limit: 10, frequency: 'Ever' },
    ];
  });

  // Current simulation state
  const [currentSimulation, setCurrentSimulation] = useState(null);

  // Handle simulation updates from DiagramTimeline2
  const handleSimulationUpdate = (simulation) => {
    setCurrentSimulation(simulation);
  };

  // Render profiles from Profile API results
  const renderProfileApiResults = () => {
    if (!profileApiResults || Object.keys(profileApiResults).length === 0) {
      return (
        <div className="visualizer2__empty-profiles">
          <p>No profiles loaded yet. Use Profile Lookup to load profiles.</p>
        </div>
      );
    }

    // Convert Profile API results to profile objects using the same logic as DiagramTimeline2
    const profilesMap = new Map();

    Object.entries(profileApiResults).forEach(([identifier, result]) => {
      if (!result) return;

      let segmentId = null;
      let profileKey = identifier;

      // Handle both old format and new merged format
      const endpointsToProcess = [];
      
      if (result._combinedData) {
        Object.entries(result._combinedData).forEach(([endpoint, data]) => {
          endpointsToProcess.push({ endpoint, data, identifier });
        });
      } else if (result.data) {
        const endpoint = result._endpoint || 'unknown';
        endpointsToProcess.push({ endpoint, data: result.data, identifier });
      }

      // First pass: look for segment_id in metadata
      endpointsToProcess.forEach(({ endpoint: endpointType, data }) => {
        if (endpointType === 'metadata' && data && data.segment_id) {
          segmentId = data.segment_id;
          profileKey = segmentId;
        }
      });

      // Get or create profile
      if (!profilesMap.has(profileKey)) {
        profilesMap.set(profileKey, {
          id: profileKey,
          segmentId: segmentId,
          lookupIdentifier: identifier,
          identifiers: {},
        });
      }

      const profile = profilesMap.get(profileKey);

      // Process external IDs
      endpointsToProcess.forEach(({ endpoint: endpointType, data }) => {
        if (endpointType === 'external_ids') {
          const externalIdsArray = Array.isArray(data) ? data : (data.data || []);
          externalIdsArray.forEach(extId => {
            if (extId.type && extId.id) {
              if (!profile.identifiers[extId.type]) {
                profile.identifiers[extId.type] = [];
              }
              if (!profile.identifiers[extId.type].includes(extId.id)) {
                profile.identifiers[extId.type].push(extId.id);
              }
            }
          });
        }
      });
    });

    const profiles = Array.from(profilesMap.values());

    return profiles.map((profile, index) => (
      <div key={profile.id} className="visualizer2__profile-card">
        <div className="visualizer2__profile-header">
          <h4>{profile.id}</h4>
          <h4>{profile.segmentId}</h4>
          <span className="visualizer2__profile-actions">
            {Object.keys(profile.identifiers).length} identifier{Object.keys(profile.identifiers).length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="visualizer2__profile-identifiers">
          {Object.entries(profile.identifiers).map(([type, values]) => (
            <div key={type} className="visualizer2__identifier-row">
              <span className="visualizer2__identifier-type">{type}:</span>
              <span className="visualizer2__identifier-values">
                {Array.isArray(values) ? values.join(', ') : values}
              </span>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="visualizer2">
      {/* Header */}
      {/* <div className="visualizer2__header">
        <div className="visualizer2__header-top">
          <div className="visualizer2__header-left">
            <img src="/assets/pie-chart.svg" alt="Visualizer" className="visualizer2__header-icon" />
            <h2 className="visualizer2__title">
              Identity Resolution Visualizer
              <div className="visualizer2__separator">
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
            </h2>
          </div>
        </div>
        <p className="visualizer2__description">
          This visualizer shows how events flow through Segment's identity resolution algorithm, 
          highlighting how profiles are created, merged, and updated based on incoming identifiers.
        </p>
      </div> */}

      {/* Main Content */}
      <div className="visualizer2__content">
        {/* Left Sidebar - Config and Profiles */}
        <div className="visualizer2__sidebar">
          {/* Sidebar Header */}
          <div className="visualizer2__sidebar-header">
            <h3>Identity Resolution Config</h3>
          </div>
          
          <div className="visualizer2__sidebar-content">
            {/* Identifier Configuration Table */}
            <div className="visualizer2__config-section">
              <div className="visualizer2__identifier-table">
                <div className="visualizer2__table-header">
                  <span className="visualizer2__table-col visualizer2__table-col--priority">PRIORITY</span>
                  <span className="visualizer2__table-col visualizer2__table-col--identifier">IDENTIFIER</span>
                  <span className="visualizer2__table-col visualizer2__table-col--limit">LIMIT</span>
                </div>
                {idResConfig.map((identifier, index) => (
                  <div key={identifier.id} className="visualizer2__table-row">
                    <span className="visualizer2__table-col visualizer2__table-col--priority">{index + 1}</span>
                    <span className="visualizer2__table-col visualizer2__table-col--identifier">
                      <span>
                        {identifier.id}
                        {identifier.isCustom && <span className="visualizer2__custom-indicator">*</span>}
                      </span>
                    </span>
                    <span className="visualizer2__table-col visualizer2__table-col--limit">{identifier.limit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Settings Section */}
            <div className="visualizer2__config-section">
              <h4>Current Settings</h4>
              <div className="visualizer2__setting-item">
                <span className="visualizer2__setting-label">Unify Space:</span>
                <span className="visualizer2__setting-value">{unifySpaceSlug || 'Not configured'}</span>
              </div>
              <div className="visualizer2__setting-item">
                <span className="visualizer2__setting-label">Events to Process:</span>
                <span className="visualizer2__setting-value">{events.length}</span>
              </div>
              <div className="visualizer2__setting-item">
                <span className="visualizer2__setting-label">Enabled Identifiers:</span>
                <span className="visualizer2__setting-value">{idResConfig.length}</span>
              </div>
            </div>

            {/* Configuration Stats Section */}
            <div className="visualizer2__config-section">
              <h4>Resolution Statistics</h4>
              <div className="visualizer2__config-stats">
                <div className="visualizer2__stat">
                  <span className="visualizer2__stat-label">Events:</span>
                  <span className="visualizer2__stat-value">{events.length}</span>
                </div>
                <div className="visualizer2__stat">
                  <span className="visualizer2__stat-label">Profiles:</span>
                  <span className="visualizer2__stat-value">
                    {(() => {
                      if (!profileApiResults || Object.keys(profileApiResults).length === 0) return 0;
                      const seenProfiles = new Set();
                      
                      Object.entries(profileApiResults).forEach(([identifier, result]) => {
                        if (!result) return;
                        
                        let profileKey = identifier;
                        
                        // Check for segment_id in metadata
                        if (result._combinedData && result._combinedData.metadata) {
                          const metadata = result._combinedData.metadata;
                          if (metadata.segment_id) {
                            profileKey = metadata.segment_id;
                          }
                        }
                        
                        seenProfiles.add(profileKey);
                      });
                      
                      return seenProfiles.size;
                    })()}
                  </span>
                </div>
                <div className="visualizer2__stat">
                  <span className="visualizer2__stat-label">Identifiers:</span>
                  <span className="visualizer2__stat-value">{idResConfig.length}</span>
                </div>
              </div>
            </div>

            {/* Profiles Section */}
            {/* <div className="visualizer2__profiles-section">
              <h3>Profiles</h3>
              <div className="visualizer2__profiles-container">
                {renderProfileApiResults()}
              </div>
            </div> */}
          </div>
        </div>

        {/* Main Content - Event Timeline */}
        <div className="visualizer2__main-content">
          {/* Floating Back Button */}
          <button
            className="visualizer2__back-button-floating"
            onClick={onClose}
            title="Back to Builder"
          >
            ← Back to Builder
          </button>
          
          {events.length === 0 ? (
            <div className="visualizer2__empty-state">
              <div className="visualizer2__empty-icon">🔍</div>
              <h3>No Events to Process</h3>
              <p>Add some events using the Event Builder to see the identity resolution simulation.</p>
            </div>
          ) : (
            <DiagramTimeline2 
              events={events}
              identifierOptions={idResConfig.map(config => ({
                value: config.id,
                label: config.name || config.id,
                priority: idResConfig.indexOf(config) + 1,
                limit: config.limit,
                frequency: config.frequency,
                isCustom: config.isCustom
              }))}
              unifySpaceSlug={unifySpaceSlug}
              profileApiResults={profileApiResults}
              onSimulationUpdate={handleSimulationUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Visualizer2;
