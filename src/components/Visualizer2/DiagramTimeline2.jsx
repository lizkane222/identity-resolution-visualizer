import React, { useState, useEffect } from 'react';
import DiagramNode2 from './DiagramNode2';
import { IdentitySimulation } from '../../utils/identitySimulation.js';
import './DiagramTimeline2.css';

const DiagramTimeline2 = ({ events, identifierOptions, unifySpaceSlug, onSimulationUpdate, currentSimulation, renderProfileCard }) => {
  const [processedEvents, setProcessedEvents] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Process events through the identity simulation
    const processEventsForSimulation = async () => {
      setLoading(true);
      
      // Sort events by timestamp
      const sortedEvents = [...events].sort((a, b) => {
        const timestampA = a.timestamp || new Date(a.createdAt).getTime();
        const timestampB = b.timestamp || new Date(b.createdAt).getTime();
        return timestampA - timestampB;
      });

      // Create simulation with config based on identifierOptions
      const simulationConfig = {
        limits: {},
        priorities: {}
      };

      identifierOptions.forEach((option, index) => {
        simulationConfig.limits[option.value] = option.limit || 5;
        simulationConfig.priorities[option.value] = index + 1;
      });

      const sim = new IdentitySimulation(simulationConfig);
      
      const processed = [];

      for (let i = 0; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        
        // Extract identifiers from event
        const eventIdentifiers = extractIdentifiersFromEvent(event, identifierOptions);
        
        // Process through simulation
        const result = sim.processEvent({ identifiers: eventIdentifiers });
        
        // Create processed event with simulation results
        const processedEvent = {
          ...event,
          eventData: JSON.parse(event.rawData),
          identifiers: eventIdentifiers,
          simulationResult: result,
          sequenceNumber: i + 1,
          timestamp: event.timestamp || new Date(event.createdAt).getTime()
        };

        processed.push(processedEvent);
      }

      setProcessedEvents(processed);
      setSimulation(sim);
      setLoading(false);
      
      // Notify parent component about simulation update
      if (onSimulationUpdate) {
        onSimulationUpdate(sim);
      }
    };

    if (events.length > 0) {
      processEventsForSimulation();
    } else {
      setProcessedEvents([]);
      setSimulation(null);
      setLoading(false);
      
      // Notify parent component about simulation clear
      if (onSimulationUpdate) {
        onSimulationUpdate(null);
      }
    }
  }, [events, identifierOptions]);

  if (loading) {
    return (
      <div className="diagram-timeline2__loading">
        <div className="diagram-timeline2__loading-spinner"></div>
        <p>Processing events through identity resolution simulation...</p>
      </div>
    );
  }

  return (
    <div className="diagram-timeline2">
      <div className="diagram-timeline2__timeline-container">
        {/* Horizontal Timeline */}
        <div className="diagram-timeline2__timeline-line"></div>
        
        {/* Event Nodes */}
        <div className="diagram-timeline2__events">
          {processedEvents.map((event, index) => (
            <DiagramNode2
              key={event.id}
              event={event}
              sequenceNumber={index + 1}
              isLast={index === processedEvents.length - 1}
              identifierOptions={identifierOptions}
              position={index}
              totalEvents={processedEvents.length}
              simulation={simulation}
              renderProfileCard={renderProfileCard}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to extract identifiers from event data
const extractIdentifiersFromEvent = (event, identifierOptions) => {
  try {
    const eventData = JSON.parse(event.rawData);
    const identifiers = {};

    // Extract from top level (userId, anonymousId)
    if (eventData.userId) identifiers.user_id = eventData.userId;
    if (eventData.anonymousId) identifiers.anonymous_id = eventData.anonymousId;

    // Extract from traits
    if (eventData.traits) {
      if (eventData.traits.email) identifiers.email = eventData.traits.email;
      if (eventData.traits.phone) identifiers.phone = eventData.traits.phone;
    }

    // Extract from properties (for track events)
    if (eventData.properties) {
      if (eventData.properties.email) identifiers.email = eventData.properties.email;
      if (eventData.properties.phone) identifiers.phone = eventData.properties.phone;
    }

    // Extract from context
    if (eventData.context) {
      if (eventData.context.traits) {
        if (eventData.context.traits.email) identifiers.email = eventData.context.traits.email;
        if (eventData.context.traits.phone) identifiers.phone = eventData.context.traits.phone;
      }
      
      // Device identifiers
      if (eventData.context.device) {
        if (eventData.context.device.id) identifiers['device_id'] = eventData.context.device.id;
        if (eventData.context.device.advertisingId) identifiers['advertising_id'] = eventData.context.device.advertisingId;
      }

      // External IDs
      if (eventData.context.externalIds && Array.isArray(eventData.context.externalIds)) {
        eventData.context.externalIds.forEach(ext => {
          if (ext.type && ext.id) {
            identifiers[ext.type] = ext.id;
          }
        });
      }
    }

    return identifiers;
  } catch (error) {
    console.error('Error extracting identifiers from event:', error);
    return {};
  }
};

export default DiagramTimeline2;
