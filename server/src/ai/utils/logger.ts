import { AITelemetryEvent, AITelemetryListener } from '../types/index.js';

/**
 * A lightweight structured logger and telemetry observer for the AI module.
 * Logs are output as JSON for easy parsing by external tools, and events are
 * emitted to registered observers for automated verification and telemetry sinks.
 */

const listeners: Set<AITelemetryListener> = new Set();

export const aiLogger = {
  /**
   * Logs a completed AI request execution event and notifies registered observers.
   */
  logExecution(event: AITelemetryEvent): void {
    const timestamp = event.timestamp || new Date().toISOString();
    const logEntry = {
      level: event.success ? 'info' : 'error',
      module: 'AI',
      ...event,
      timestamp,
    };

    if (event.success) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.error(JSON.stringify(logEntry));
    }

    for (const listener of listeners) {
      try {
        listener(event);
      } catch (listenerError) {
        // Prevent listener failures from bubbling up, masking original AI errors, or altering execution outcomes.
        console.error('aiLogger: Telemetry listener threw an error:', listenerError);
      }
    }
  },

  /**
   * Registers a new telemetry listener callback.
   */
  onTelemetry(listener: AITelemetryListener): void {
    listeners.add(listener);
  },

  /**
   * Unregisters an existing telemetry listener callback.
   */
  offTelemetry(listener: AITelemetryListener): void {
    listeners.delete(listener);
  },

  /**
   * Removes all registered telemetry listeners (used for test isolation).
   */
  clearListeners(): void {
    listeners.clear();
  },
};
