import React from 'react';
import { CORE_EVENTS, PRODUCT_EVENTS } from '../../utils/EventBuilderSpecPayloads';

import './EventButtons.css';

const EventButtons = ({ onLoadEvent, eventType = 'both' }) => {
  const handleCoreEventClick = (eventKey) => {
    const eventSpec = CORE_EVENTS[eventKey];
    onLoadEvent(eventSpec);
  };

  const handleProductEventClick = (eventKey) => {
    const eventSpec = PRODUCT_EVENTS[eventKey];
    onLoadEvent(eventSpec);
  };

  // Render based on eventType prop
  if (eventType === 'core') {
    return (
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
    );
  }

  if (eventType === 'product') {
    return (
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
    );
  }

  // Default: render both sections (for backward compatibility)
  return (
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
  );
};

export default EventButtons;