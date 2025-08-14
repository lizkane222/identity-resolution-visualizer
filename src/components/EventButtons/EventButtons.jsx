import React, { useState } from 'react';
import { CORE_EVENTS, PRODUCT_EVENTS } from '../../utils/EventBuilderSpecPayloads';
import AliasModal from '../AliasModal';

import './EventButtons.css';

const EventButtons = ({ onLoadEvent, eventType = 'both', currentUser }) => {
  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);

  const handleAliasSubmit = ({ userId, previousId }) => {
    // Create alias event with user-provided values
    const aliasEvent = {
      name: "Alias",
      description: "The Alias call lets you merge two user identities, effectively connecting two sets of user data as one.",
      payload: () => ({
        "type": "alias",
        "userId": userId,
        "previousId": previousId,
        "context": {
          "ip": "192.168.1.1",
          "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        },
        "timestamp": new Date().toISOString()
      })
    };
    
    onLoadEvent(aliasEvent);
  };

  const handleCoreEventClick = (eventKey) => {
    const eventSpec = CORE_EVENTS[eventKey];
    
    // Special handling for events that require user input
    if (eventKey === 'alias') {
      setIsAliasModalOpen(true);
      return;
    }
    
    onLoadEvent(eventSpec);
  };

  const handleProductEventClick = (eventKey) => {
    const eventSpec = PRODUCT_EVENTS[eventKey];
    onLoadEvent(eventSpec);
  };

  // Render based on eventType prop
  if (eventType === 'core') {
    return (
      <>
        <div className="event-buttons event-buttons--single">
          <section className="event-buttons__section">
            <h3 className="event-buttons__section-title">Core Events</h3>
            <div className="event-buttons__grid">
              {Object.keys(CORE_EVENTS).map((eventKey) => (
                <button
                  key={eventKey}
                  onClick={() => handleCoreEventClick(eventKey)}
                  className="event-buttons__button event-buttons__button--core"
                >
                  {CORE_EVENTS[eventKey].name}
                </button>
              ))}
            </div>
          </section>
        </div>
        
        <AliasModal
          isOpen={isAliasModalOpen}
          onClose={() => setIsAliasModalOpen(false)}
          onSubmit={handleAliasSubmit}
          currentUser={currentUser}
        />
      </>
    );
  }

  if (eventType === 'product') {
    return (
      <>
        <div className="event-buttons event-buttons--single">
          <section className="event-buttons__section">
            <h3 className="event-buttons__section-title">Product Events</h3>
            <div className="event-buttons__grid event-buttons__grid--products">
              {Object.keys(PRODUCT_EVENTS).map((eventKey) => (
                <button
                  key={eventKey}
                  onClick={() => handleProductEventClick(eventKey)}
                  className="event-buttons__button event-buttons__button--product"
                  title={PRODUCT_EVENTS[eventKey].description}
                >
                  {PRODUCT_EVENTS[eventKey].name}
                </button>
              ))}
            </div>
          </section>
        </div>
        
        <AliasModal
          isOpen={isAliasModalOpen}
          onClose={() => setIsAliasModalOpen(false)}
          onSubmit={handleAliasSubmit}
          currentUser={currentUser}
        />
      </>
    );
  }

  // Default: render both sections (for backward compatibility)
  return (
    <>
      <div className="event-buttons">
        {/* Core Events Section */}
        <section className="event-buttons__section">
          <h3 className="event-buttons__section-title">Core Events</h3>
          <div className="event-buttons__grid">
            {Object.keys(CORE_EVENTS).map((eventKey) => (
              <button
                key={eventKey}
                onClick={() => handleCoreEventClick(eventKey)}
                className="event-buttons__button event-buttons__button--core"
              >
                {CORE_EVENTS[eventKey].name}
              </button>
            ))}
          </div>
        </section>

        {/* Product Events Section */}
        <section className="event-buttons__section">
          <h3 className="event-buttons__section-title">Product Events</h3>
          <div className="event-buttons__grid event-buttons__grid--products">
            {Object.keys(PRODUCT_EVENTS).map((eventKey) => (
              <button
                key={eventKey}
                onClick={() => handleProductEventClick(eventKey)}
                className="event-buttons__button event-buttons__button--product"
                title={PRODUCT_EVENTS[eventKey].description}
              >
                {PRODUCT_EVENTS[eventKey].name}
              </button>
            ))}
          </div>
        </section>
      </div>
      
      <AliasModal
        isOpen={isAliasModalOpen}
        onClose={() => setIsAliasModalOpen(false)}
        onSubmit={handleAliasSubmit}
        currentUser={currentUser}
      />
    </>
  );
};

export default EventButtons;