/**
 * Inspector Communication Library
 * Handles secure postMessage communication between parent window and iframe
 * for the web inspector feature
 */

import { useState, useEffect } from 'react';

// Message types for inspector communication
export const MESSAGE_TYPES = {
  // Initialization
  INSPECTOR_INIT: 'INSPECTOR_INIT',
  INSPECTOR_READY: 'INSPECTOR_READY',
  
  // Element selection
  ELEMENT_SELECT: 'ELEMENT_SELECT',
  ELEMENT_HOVER: 'ELEMENT_HOVER',
  ELEMENT_UNHOVER: 'ELEMENT_UNHOVER',
  
  // Style operations
  STYLE_GET: 'STYLE_GET',
  STYLE_UPDATE: 'STYLE_UPDATE',
  STYLE_RESPONSE: 'STYLE_RESPONSE',
  
  // DOM operations
  DOM_HIGHLIGHT: 'DOM_HIGHLIGHT',
  DOM_CLEAR_HIGHLIGHT: 'DOM_CLEAR_HIGHLIGHT',
  
  // Inspector state
  INSPECTOR_ENABLE: 'INSPECTOR_ENABLE',
  INSPECTOR_DISABLE: 'INSPECTOR_DISABLE',
  
  // Errors
  ERROR: 'ERROR'
};

/**
 * Inspector Communication Manager
 * Handles all communication between parent and iframe
 */
export class InspectorCommunication {
  constructor(options = {}) {
    this.iframe = null;
    this.isInitialized = false;
    this.isInspectorActive = false;
    this.allowedOrigins = options.allowedOrigins || ['http://localhost:3000', 'https://localhost:3000'];
    this.messageQueue = [];
    this.listeners = new Map();
    this.debug = options.debug || false;
    
    // Bind methods
    this.handleMessage = this.handleMessage.bind(this);
    
    // Start listening for messages
    this.startListening();
  }

  /**
   * Initialize communication with iframe
   */
  initialize(iframe) {
    if (!iframe) {
      throw new Error('Iframe element is required');
    }
    
    this.iframe = iframe;
    this.log('Initializing inspector communication with iframe');
    
    // Wait for iframe to load before sending init message
    if (iframe.contentWindow) {
      this.sendMessage(MESSAGE_TYPES.INSPECTOR_INIT, {
        timestamp: Date.now(),
        debug: this.debug
      });
    } else {
      iframe.addEventListener('load', () => {
        this.sendMessage(MESSAGE_TYPES.INSPECTOR_INIT, {
          timestamp: Date.now(),
          debug: this.debug
        });
      });
    }
  }

  /**
   * Start listening for postMessage events
   */
  startListening() {
    window.addEventListener('message', this.handleMessage);
    this.log('Started listening for inspector messages');
  }

  /**
   * Stop listening for postMessage events
   */
  stopListening() {
    window.removeEventListener('message', this.handleMessage);
    this.log('Stopped listening for inspector messages');
  }

  /**
   * Handle incoming postMessage events
   */
  handleMessage(event) {
    // Validate origin for security
    if (!this.isValidOrigin(event.origin)) {
      this.log('Rejected message from invalid origin:', event.origin);
      return;
    }

    const { type, data, id } = event.data;
    
    if (!type || !Object.values(MESSAGE_TYPES).includes(type)) {
      this.log('Received invalid message type:', type);
      return;
    }

    this.log('Received message:', { type, data, id });

    // Handle specific message types
    switch (type) {
      case MESSAGE_TYPES.INSPECTOR_READY:
        this.handleInspectorReady(data);
        break;
      
      case MESSAGE_TYPES.ELEMENT_SELECT:
        this.handleElementSelect(data);
        break;
      
      case MESSAGE_TYPES.ELEMENT_HOVER:
        this.handleElementHover(data);
        break;
      
      case MESSAGE_TYPES.ELEMENT_UNHOVER:
        this.handleElementUnhover(data);
        break;
      
      case MESSAGE_TYPES.STYLE_RESPONSE:
        this.handleStyleResponse(data, id);
        break;
      
      case MESSAGE_TYPES.ERROR:
        this.handleError(data);
        break;
    }

    // Emit event to registered listeners
    this.emit(type, data, id);
  }

  /**
   * Send message to iframe
   */
  sendMessage(type, data = {}, id = null) {
    if (!this.iframe || !this.iframe.contentWindow) {
      this.log('Cannot send message - iframe not ready');
      this.messageQueue.push({ type, data, id });
      return;
    }

    const message = {
      type,
      data,
      id: id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.log('Sending message:', message);
    
    try {
      this.iframe.contentWindow.postMessage(message, '*');
    } catch (error) {
      this.log('Error sending message:', error);
      this.emit(MESSAGE_TYPES.ERROR, { error: error.message, type: 'SEND_ERROR' });
    }
  }

  /**
   * Handle inspector ready event
   */
  handleInspectorReady(data) {
    this.isInitialized = true;
    this.log('Inspector initialized successfully');
    
    // Send any queued messages
    while (this.messageQueue.length > 0) {
      const { type, data, id } = this.messageQueue.shift();
      this.sendMessage(type, data, id);
    }
  }

  /**
   * Handle element selection
   */
  handleElementSelect(data) {
    this.log('Element selected:', data);
  }

  /**
   * Handle element hover
   */
  handleElementHover(data) {
    this.log('Element hover:', data);
  }

  /**
   * Handle element unhover
   */
  handleElementUnhover(data) {
    this.log('Element unhover');
  }

  /**
   * Handle style response
   */
  handleStyleResponse(data, id) {
    this.log('Style response:', { data, id });
  }

  /**
   * Handle error
   */
  handleError(data) {
    this.log('Inspector error:', data);
  }

  /**
   * Enable inspector mode
   */
  enableInspector() {
    if (!this.isInitialized) {
      this.log('Cannot enable inspector - not initialized');
      return false;
    }

    this.isInspectorActive = true;
    this.sendMessage(MESSAGE_TYPES.INSPECTOR_ENABLE);
    this.log('Inspector enabled');
    return true;
  }

  /**
   * Disable inspector mode
   */
  disableInspector() {
    if (!this.isInitialized) {
      this.log('Cannot disable inspector - not initialized');
      return false;
    }

    this.isInspectorActive = false;
    this.sendMessage(MESSAGE_TYPES.INSPECTOR_DISABLE);
    this.log('Inspector disabled');
    return true;
  }

  /**
   * Select element by selector
   */
  selectElement(selector) {
    if (!this.isInitialized) {
      this.log('Cannot select element - not initialized');
      return;
    }

    this.sendMessage(MESSAGE_TYPES.ELEMENT_SELECT, { selector });
  }

  /**
   * Get styles for selected element
   */
  getElementStyles(selector) {
    if (!this.isInitialized) {
      this.log('Cannot get styles - not initialized');
      return;
    }

    const id = `style_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sendMessage(MESSAGE_TYPES.STYLE_GET, { selector }, id);
    return id;
  }

  /**
   * Update element styles
   */
  updateElementStyles(selector, styles) {
    if (!this.isInitialized) {
      this.log('Cannot update styles - not initialized');
      return;
    }

    this.sendMessage(MESSAGE_TYPES.STYLE_UPDATE, { selector, styles });
  }

  /**
   * Register event listener
   */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  /**
   * Unregister event listener
   */
  off(type, callback) {
    if (!this.listeners.has(type)) {
      return;
    }
    
    const callbacks = this.listeners.get(type);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(type, data, id) {
    if (!this.listeners.has(type)) {
      return;
    }

    this.listeners.get(type).forEach(callback => {
      try {
        callback(data, id);
      } catch (error) {
        this.log('Error in event listener:', error);
      }
    });
  }

  /**
   * Validate message origin
   */
  isValidOrigin(origin) {
    // Allow same origin
    if (origin === window.location.origin) {
      return true;
    }
    
    // Allow configured origins
    return this.allowedOrigins.includes(origin);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopListening();
    this.iframe = null;
    this.isInitialized = false;
    this.isInspectorActive = false;
    this.messageQueue = [];
    this.listeners.clear();
    this.log('Inspector communication destroyed');
  }

  /**
   * Debug logging
   */
  log(...args) {
    if (this.debug) {
      console.log('[InspectorCommunication]', ...args);
    }
  }
}

/**
 * Create inspector communication instance
 */
export function createInspectorCommunication(options = {}) {
  return new InspectorCommunication(options);
}

/**
 * Hook for React components
 */
export function useInspectorCommunication(options = {}) {
  const [communication] = useState(() => createInspectorCommunication(options));
  
  useEffect(() => {
    return () => {
      communication.destroy();
    };
  }, [communication]);

  return communication;
}