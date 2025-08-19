import React, { useState, useEffect } from 'react';
import DiagramTimeline from './DiagramTimeline';
import './Visualizer.css';
import './AnalysisSidebar.css';

const Visualizer = ({ 
  events, 
  identifierOptions,
  unifySpaceSlug,
  profileApiResults = {},
  onClose 
}) => {
  // State for analysis
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Load ID Resolution Config from localStorage
  const [idResConfig, setIdResConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('idres_config_identifiers');
      if (saved) {
        return JSON.parse(saved).filter(id => id.enabled);
      }
    } catch {}
    // fallback to defaults if not found
    return [
      { id: 'user_id', name: 'User ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
      { id: 'email', name: 'Email', enabled: true, isCustom: false, limit: 3, frequency: 'Ever' },
      { id: 'phone', name: 'Phone', enabled: true, isCustom: true, limit: 2, frequency: 'Ever' },
      { id: 'android.id', name: 'Android ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
      { id: 'android.idfa', name: 'Android IDFA', enabled: true, isCustom: false, limit: 1, frequency: 'Monthly' },
      { id: 'android.push_token', name: 'Android Push Token', enabled: true, isCustom: false, limit: 5, frequency: 'Monthly' },
      { id: 'anonymous_id', name: 'Anonymous ID', enabled: true, isCustom: false, limit: 10, frequency: 'Ever' },
      { id: 'ga_client_id', name: 'GA Client ID', enabled: true, isCustom: false, limit: 3, frequency: 'Monthly' },
      { id: 'ios.id', name: 'iOS ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
      { id: 'ios.idfa', name: 'iOS IDFA', enabled: true, isCustom: false, limit: 1, frequency: 'Monthly' },
      { id: 'ios.push_token', name: 'iOS Push Token', enabled: true, isCustom: false, limit: 5, frequency: 'Monthly' },
    ];
  });

  // Listen for changes in localStorage to update the config
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('idres_config_identifiers');
        if (saved) {
          setIdResConfig(JSON.parse(saved).filter(id => id.enabled));
        }
      } catch {}
    };

    // Set up an interval to check for changes
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle analysis updates from DiagramTimeline
  const handleAnalysisUpdate = (analysis) => {
    setAnalysisData(analysis);
    setIsAnalyzing(false);
  };

  // Trigger analysis computation
  const handleAnalyzeClick = async () => {
    if (events.length === 0) return;
    
    setIsAnalyzing(true);
    setAnalysisData(null);
    
    // Trigger analysis by calling the DiagramTimeline component's analysis function
    // We'll need to pass a ref or use a different approach
    const analysisEvent = new CustomEvent('triggerAnalysis');
    document.dispatchEvent(analysisEvent);
  };

  // Download analysis as JSON
  const downloadAnalysis = () => {
    if (!analysisData) return;
    
    const dataStr = JSON.stringify(analysisData.downloadData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `identity-resolution-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="visualizer">
      {/* Header */}
      <div className="visualizer__header">
        <div className="visualizer__header-left">
          <img src="/assets/pie-chart.svg" alt="Visualizer" className="visualizer__header-icon" />
          <h2 className="visualizer__title">
            Identity Resolution Visualizer 
            <div className="visualizer__separator">
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
        <div className="visualizer__header-right">
          <button
            className="visualizer__back-button"
            onClick={onClose}
            title="Back to Builder"
          >
            ← Back to Builder
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="visualizer__description">
        <p>This diagram shows how each event affects identity resolution based on existing profiles and configured rules.</p>
      </div>

      {/* Main Content */}
      <div className="visualizer__content">
            {/* Sidebar - Identity Resolution Config + Analysis */}
            <div className="visualizer__sidebar">
              <div className="visualizer__sidebar-header">
                <h3>Identity Resolution Config</h3>
              </div>
              <div className="visualizer__sidebar-content">
                <div className="visualizer__config-section">
                  <div className="visualizer__identifier-table">
                    <div className="visualizer__table-header">
                      <span className="visualizer__table-col visualizer__table-col--priority">PRIORITY</span>
                      <span className="visualizer__table-col visualizer__table-col--identifier">IDENTIFIER</span>
                      <span className="visualizer__table-col visualizer__table-col--limit">LIMIT</span>
                    </div>
                    {idResConfig.map((identifier, index) => (
                      <div key={identifier.id} className="visualizer__table-row">
                        <span className="visualizer__table-col visualizer__table-col--priority">{index + 1}</span>
                        <span className="visualizer__table-col visualizer__table-col--identifier">
                          <span>
                            {identifier.id}
                            {identifier.isCustom && <span className="visualizer__custom-indicator">*</span>}
                          </span>
                        </span>
                        <span className="visualizer__table-col visualizer__table-col--limit">{identifier.limit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="visualizer__config-section">
                  <h4>Current Settings</h4>
                  <div className="visualizer__setting-item">
                    <span className="visualizer__setting-label">Unify Space:</span>
                    <span className="visualizer__setting-value">{unifySpaceSlug || 'Not configured'}</span>
                  </div>
                  <div className="visualizer__setting-item">
                    <span className="visualizer__setting-label">Events to Process:</span>
                    <span className="visualizer__setting-value">{events.length}</span>
                  </div>
                  <div className="visualizer__setting-item">
                    <span className="visualizer__setting-label">Enabled Identifiers:</span>
                    <span className="visualizer__setting-value">{idResConfig.length}</span>
                  </div>
                </div>

                {/* Analysis Section */}
                <div className="visualizer__config-section">
                  <div className="visualizer__analysis-header">
                    <h4>Identity Resolution Analysis</h4>
                    <button
                      className="visualizer__download-button"
                      onClick={handleAnalyzeClick}
                      disabled={events.length === 0 || isAnalyzing}
                      title={events.length === 0 ? "Add events to analyze" : "Analyze identity resolution"}
                      style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px' }}
                    >
                      {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze'}
                    </button>
                  </div>

                  {analysisData && (
                    <>
                      <div style={{ marginBottom: '12px', textAlign: 'right' }}>
                        <button
                          className="visualizer__download-button"
                          onClick={downloadAnalysis}
                          title="Download Analysis"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          📥 Download
                        </button>
                      </div>
                      
                      {/* Key Insights */}
                      <div className="visualizer__analysis-subsection">
                        <h5>Key Insights</h5>
                        <div className="visualizer__insights-list">
                          {analysisData.keyInsights.map((insight, index) => (
                            <div key={index} className="visualizer__insight-item">
                              {insight}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Event Sequence Analysis */}
                      <div className="visualizer__analysis-subsection">
                        <h5>Event Sequence Analysis</h5>
                        <div className="visualizer__sequence-list">
                          {analysisData.eventSequence.map((event, index) => (
                            <div key={index} className="visualizer__sequence-item">
                              <div className="visualizer__event-header">
                                <strong>Event {event.eventNumber}: {event.eventType}</strong>
                              </div>
                              <div className="visualizer__event-details">
                                <div><strong>Identifiers:</strong> {event.identifiers || 'None'}</div>
                                <div><strong>Expected Action:</strong> {event.expectedAction}</div>
                                <div><strong>Reason:</strong> {event.reason}</div>
                                {event.mergeDirection && (
                                  <div><strong>Merge Direction:</strong> {event.mergeDirection}</div>
                                )}
                                {event.processingLog && (
                                  <div><strong>Processing Log:</strong> {event.processingLog}</div>
                                )}
                                {event.droppedIdentifiers.length > 0 && (
                                  <div><strong>Dropped:</strong> {event.droppedIdentifiers.join(', ')}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Final State */}
                      <div className="visualizer__analysis-subsection">
                        <h5>Final Profile State</h5>
                        <div className="visualizer__final-state">
                          <div><strong>Total Profiles:</strong> {analysisData.finalState.totalProfiles}</div>
                          <div><strong>Profile Mappings:</strong></div>
                          <pre className="visualizer__profile-mappings">
                            {JSON.stringify(analysisData.finalState.profileMappings, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </>
                  )}

                  {!analysisData && !isAnalyzing && events.length > 0 && (
                    <div className="visualizer__analysis-placeholder">
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '16px 0' }}>
                        Click "Analyze" to generate comprehensive identity resolution analysis
                      </p>
                    </div>
                  )}

                  {events.length === 0 && (
                    <div className="visualizer__analysis-placeholder">
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '16px 0' }}>
                        Add events to enable analysis
                      </p>
                    </div>
                  )}
                </div>

                {/* Analysis Section */}
                {analysisData && (
                  <div className="visualizer__config-section">
                    <div className="visualizer__analysis-header">
                      <h4>Identity Resolution Analysis</h4>
                      {analysisData && (
                        <button
                          className="visualizer__download-button"
                          onClick={downloadAnalysis}
                          title="Download Analysis"
                          style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '12px' }}
                        >
                          📥 Download
                        </button>
                      )}
                    </div>
                    
                    {/* Key Insights */}
                    <div className="visualizer__analysis-subsection">
                      <h5>Key Insights</h5>
                      <div className="visualizer__insights-list">
                        {analysisData.keyInsights.map((insight, index) => (
                          <div key={index} className="visualizer__insight-item">
                            {insight}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Event Sequence Analysis */}
                    <div className="visualizer__analysis-subsection">
                      <h5>Event Sequence Analysis</h5>
                      <div className="visualizer__sequence-list">
                        {analysisData.eventSequence.map((event, index) => (
                          <div key={index} className="visualizer__sequence-item">
                            <div className="visualizer__event-header">
                              <strong>Event {event.eventNumber}: {event.eventType}</strong>
                            </div>
                            <div className="visualizer__event-details">
                              <div><strong>Identifiers:</strong> {event.identifiers || 'None'}</div>
                              <div><strong>Expected Action:</strong> {event.expectedAction}</div>
                              <div><strong>Reason:</strong> {event.reason}</div>
                              {event.mergeDirection && (
                                <div><strong>Merge Direction:</strong> {event.mergeDirection}</div>
                              )}
                              {event.processingLog && (
                                <div><strong>Processing Log:</strong> {event.processingLog}</div>
                              )}
                              {event.droppedIdentifiers.length > 0 && (
                                <div><strong>Dropped:</strong> {event.droppedIdentifiers.join(', ')}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Final State */}
                    <div className="visualizer__analysis-subsection">
                      <h5>Final Profile State</h5>
                      <div className="visualizer__final-state">
                        <div><strong>Total Profiles:</strong> {analysisData.finalState.totalProfiles}</div>
                        <div><strong>Profile Mappings:</strong></div>
                        <pre className="visualizer__profile-mappings">
                          {JSON.stringify(analysisData.finalState.profileMappings, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Diagram Area */}
            <div className="visualizer__diagram-container visualizer__diagram-container--with-sidebar">
              {events.length === 0 ? (
                <div className="visualizer__empty-state">
                  <div className="visualizer__empty-icon">📊</div>
                  <h3>No Events to Visualize</h3>
                  <p>Add some events using the Event Builder to see the identity resolution flow.</p>
                </div>
              ) : (
                <DiagramTimeline 
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
                  onAnalysisUpdate={handleAnalysisUpdate}
                />
              )}
            </div>
          </div>
    </div>
  );
};

export default Visualizer;
