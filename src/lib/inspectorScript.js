/**
 * Inspector Injection Script
 * This script is injected into the iframe to enable element inspection
 * Provides DOM highlighting, element selection, and style extraction
 */

// Inspector script that gets injected into the iframe
export const INSPECTOR_SCRIPT = `
(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.__CURIO_INSPECTOR_INJECTED__) {
    return;
  }
  window.__CURIO_INSPECTOR_INJECTED__ = true;

  // Message types (sync with parent)
  const MESSAGE_TYPES = {
    INSPECTOR_INIT: 'INSPECTOR_INIT',
    INSPECTOR_READY: 'INSPECTOR_READY',
    ELEMENT_SELECT: 'ELEMENT_SELECT',
    ELEMENT_HOVER: 'ELEMENT_HOVER',
    ELEMENT_UNHOVER: 'ELEMENT_UNHOVER',
    STYLE_GET: 'STYLE_GET',
    STYLE_UPDATE: 'STYLE_UPDATE',
    STYLE_RESPONSE: 'STYLE_RESPONSE',
    DOM_HIGHLIGHT: 'DOM_HIGHLIGHT',
    DOM_CLEAR_HIGHLIGHT: 'DOM_CLEAR_HIGHLIGHT',
    INSPECTOR_ENABLE: 'INSPECTOR_ENABLE',
    INSPECTOR_DISABLE: 'INSPECTOR_DISABLE',
    ERROR: 'ERROR'
  };

  class CurioInspector {
    constructor() {
      this.isEnabled = false;
      this.isInitialized = false;
      this.selectedElement = null;
      this.hoveredElement = null;
      this.overlay = null;
      this.debug = false;
      
      // Bind methods
      this.handleMessage = this.handleMessage.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      
      this.init();
    }

    init() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      this.createOverlay();
      this.setupEventListeners();
      this.isInitialized = true;
      this.sendMessage(MESSAGE_TYPES.INSPECTOR_READY, {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      });
      this.log('Inspector ready');
    }

    createOverlay() {
      // Create overlay elements for highlighting
      this.overlay = {
        top: this.createElement('div', 'curio-inspector-overlay curio-inspector-top'),
        bottom: this.createElement('div', 'curio-inspector-overlay curio-inspector-bottom'),
        left: this.createElement('div', 'curio-inspector-overlay curio-inspector-left'),
        right: this.createElement('div', 'curio-inspector-overlay curio-inspector-right'),
        info: this.createElement('div', 'curio-inspector-info')
      };

      // Add styles
      const style = document.createElement('style');
      style.textContent = \`
        .curio-inspector-overlay {
          position: fixed !important;
          background: rgba(0, 123, 255, 0.3) !important;
          border: 1px solid #007bff !important;
          pointer-events: none !important;
          z-index: 999999 !important;
          display: none !important;
          box-sizing: border-box !important;
        }
        
        .curio-inspector-info {
          position: fixed !important;
          background: #333 !important;
          color: white !important;
          padding: 4px 8px !important;
          font-size: 12px !important;
          font-family: monospace !important;
          border-radius: 3px !important;
          pointer-events: none !important;
          z-index: 1000000 !important;
          display: none !important;
          max-width: 300px !important;
          word-wrap: break-word !important;
        }
        
        .curio-inspector-selected {
          outline: 2px solid #ff6b6b !important;
          outline-offset: -2px !important;
        }
      \`;
      
      document.head.appendChild(style);
      
      // Append overlay elements to body
      Object.values(this.overlay).forEach(el => {
        document.body.appendChild(el);
      });
    }

    createElement(tag, className) {
      const el = document.createElement(tag);
      el.className = className;
      return el;
    }

    setupEventListeners() {
      // Listen for messages from parent
      window.addEventListener('message', this.handleMessage);
      
      // Prevent default context menu when inspector is active
      document.addEventListener('contextmenu', (e) => {
        if (this.isEnabled) {
          e.preventDefault();
        }
      });
    }

    handleMessage(event) {
      const { type, data, id } = event.data;
      
      if (!type || !Object.values(MESSAGE_TYPES).includes(type)) {
        return;
      }

      this.log('Received message:', { type, data, id });

      switch (type) {
        case MESSAGE_TYPES.INSPECTOR_INIT:
          this.debug = data.debug || false;
          this.log('Inspector initialized with debug:', this.debug);
          break;
          
        case MESSAGE_TYPES.INSPECTOR_ENABLE:
          this.enable();
          break;
          
        case MESSAGE_TYPES.INSPECTOR_DISABLE:
          this.disable();
          break;
          
        case MESSAGE_TYPES.ELEMENT_SELECT:
          this.selectElementBySelector(data.selector);
          break;
          
        case MESSAGE_TYPES.STYLE_GET:
          this.getElementStyles(data.selector, id);
          break;
          
        case MESSAGE_TYPES.STYLE_UPDATE:
          this.updateElementStyles(data.selector, data.styles);
          break;
          
        case MESSAGE_TYPES.DOM_HIGHLIGHT:
          this.highlightElement(data.selector);
          break;
          
        case MESSAGE_TYPES.DOM_CLEAR_HIGHLIGHT:
          this.clearHighlight();
          break;
      }
    }

    enable() {
      if (this.isEnabled) return;
      
      this.isEnabled = true;
      document.addEventListener('mousemove', this.handleMouseMove, true);
      document.addEventListener('click', this.handleClick, true);
      document.addEventListener('keydown', this.handleKeyDown, true);
      document.body.style.cursor = 'crosshair';
      this.log('Inspector enabled');
    }

    disable() {
      if (!this.isEnabled) return;
      
      this.isEnabled = false;
      document.removeEventListener('mousemove', this.handleMouseMove, true);
      document.removeEventListener('click', this.handleClick, true);
      document.removeEventListener('keydown', this.handleKeyDown, true);
      document.body.style.cursor = '';
      this.clearHighlight();
      this.clearSelection();
      this.log('Inspector disabled');
    }

    handleMouseMove(event) {
      if (!this.isEnabled) return;
      
      // Don't interfere with overlay elements
      if (event.target.classList.contains('curio-inspector-overlay') || 
          event.target.classList.contains('curio-inspector-info')) {
        return;
      }
      
      event.stopPropagation();
      event.preventDefault();
      
      const element = event.target;
      if (element === this.hoveredElement) return;
      
      this.hoveredElement = element;
      this.highlightElement(element);
      
      this.sendMessage(MESSAGE_TYPES.ELEMENT_HOVER, {
        selector: this.getSelector(element),
        tagName: element.tagName.toLowerCase(),
        className: element.className,
        id: element.id,
        rect: element.getBoundingClientRect()
      });
    }

    handleClick(event) {
      if (!this.isEnabled) return;
      
      // Don't interfere with overlay elements
      if (event.target.classList.contains('curio-inspector-overlay') || 
          event.target.classList.contains('curio-inspector-info')) {
        return;
      }
      
      event.stopPropagation();
      event.preventDefault();
      
      const element = event.target;
      this.selectElement(element);
    }

    handleKeyDown(event) {
      if (!this.isEnabled) return;
      
      if (event.key === 'Escape') {
        this.disable();
        this.sendMessage(MESSAGE_TYPES.INSPECTOR_DISABLE);
      }
    }

    selectElement(element) {
      if (this.selectedElement) {
        this.selectedElement.classList.remove('curio-inspector-selected');
      }
      
      this.selectedElement = element;
      element.classList.add('curio-inspector-selected');
      
      const elementData = this.getElementData(element);
      
      this.sendMessage(MESSAGE_TYPES.ELEMENT_SELECT, elementData);
      this.log('Element selected:', elementData);
    }

    selectElementBySelector(selector) {
      const element = document.querySelector(selector);
      if (element) {
        this.selectElement(element);
      }
    }

    clearSelection() {
      if (this.selectedElement) {
        this.selectedElement.classList.remove('curio-inspector-selected');
        this.selectedElement = null;
      }
    }

    highlightElement(element) {
      if (typeof element === 'string') {
        element = document.querySelector(element);
      }
      
      if (!element) {
        this.clearHighlight();
        return;
      }
      
      const rect = element.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Position overlay elements
      this.overlay.top.style.cssText = \`
        display: block !important;
        left: \${rect.left + scrollLeft}px !important;
        top: \${scrollTop}px !important;
        width: \${rect.width}px !important;
        height: \${rect.top + scrollTop}px !important;
      \`;
      
      this.overlay.bottom.style.cssText = \`
        display: block !important;
        left: \${rect.left + scrollLeft}px !important;
        top: \${rect.bottom + scrollTop}px !important;
        width: \${rect.width}px !important;
        height: \${document.documentElement.scrollHeight - rect.bottom - scrollTop}px !important;
      \`;
      
      this.overlay.left.style.cssText = \`
        display: block !important;
        left: \${scrollLeft}px !important;
        top: \${rect.top + scrollTop}px !important;
        width: \${rect.left + scrollLeft}px !important;
        height: \${rect.height}px !important;
      \`;
      
      this.overlay.right.style.cssText = \`
        display: block !important;
        left: \${rect.right + scrollLeft}px !important;
        top: \${rect.top + scrollTop}px !important;
        width: \${document.documentElement.scrollWidth - rect.right - scrollLeft}px !important;
        height: \${rect.height}px !important;
      \`;
      
      // Position info element
      const infoText = \`\${element.tagName.toLowerCase()}\${element.id ? '#' + element.id : ''}\${element.className ? '.' + element.className.split(' ').join('.') : ''}\`;
      this.overlay.info.textContent = infoText;
      this.overlay.info.style.cssText = \`
        display: block !important;
        left: \${rect.left + scrollLeft}px !important;
        top: \${Math.max(rect.top + scrollTop - 25, scrollTop + 5)}px !important;
      \`;
    }

    clearHighlight() {
      Object.values(this.overlay).forEach(el => {
        el.style.display = 'none';
      });
      
      if (this.hoveredElement) {
        this.sendMessage(MESSAGE_TYPES.ELEMENT_UNHOVER);
        this.hoveredElement = null;
      }
    }

    getElementData(element) {
      const rect = element.getBoundingClientRect();
      const computedStyles = window.getComputedStyle(element);
      
      return {
        selector: this.getSelector(element),
        tagName: element.tagName.toLowerCase(),
        id: element.id,
        className: element.className,
        attributes: this.getAttributes(element),
        rect: {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        },
        styles: {
          computed: this.getComputedStyles(element),
          inline: element.style.cssText,
          classes: Array.from(element.classList)
        },
        content: element.textContent ? element.textContent.substring(0, 100) : '',
        parent: element.parentElement ? this.getSelector(element.parentElement) : null,
        children: Array.from(element.children).map(child => this.getSelector(child))
      };
    }

    getSelector(element) {
      if (!element || element === document.documentElement) return 'html';
      if (element === document.body) return 'body';
      
      // Priority 1: ID selector (most specific)
      if (element.id) {
        return '#' + element.id;
      }
      
      // Priority 2: Class selector (if classes exist)
      if (element.className && element.className.trim()) {
        const classes = element.className.trim().split(/\\s+/).join('.');
        return element.tagName.toLowerCase() + '.' + classes;
      }
      
      // Priority 3: Build path with nth-child for specificity
      const path = [];
      let current = element;
      
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        let selector = current.nodeName.toLowerCase();
        
        // Add nth-child for specificity when no ID/class
        if (!current.id && (!current.className || !current.className.trim())) {
          const siblings = Array.from(current.parentNode.children);
          const index = siblings.indexOf(current) + 1;
          selector += \`:nth-child(\${index})\`;
        } else if (current.className && current.className.trim()) {
          // Use first class for path building
          const firstClass = current.className.trim().split(/\\s+/)[0];
          selector += '.' + firstClass;
        }
        
        path.unshift(selector);
        current = current.parentElement;
        
        // Limit path depth to prevent overly long selectors
        if (path.length > 4) break;
      }
      
      return path.join(' > ');
    }

    getAttributes(element) {
      const attrs = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        attrs[attr.name] = attr.value;
      }
      return attrs;
    }

    getComputedStyles(element) {
      const computed = window.getComputedStyle(element);
      const styles = {};
      
      // Key CSS properties to extract (inspired by demo)
      const properties = [
        // Layout
        'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
        'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
        
        // Spacing  
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        
        // Typography
        'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
        'text-align', 'text-decoration', 'text-transform', 'letter-spacing',
        'color',
        
        // Background & Borders
        'background', 'background-color', 'background-image', 'background-size',
        'border', 'border-width', 'border-style', 'border-color', 'border-radius',
        
        // Flexbox
        'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
        'align-content', 'gap',
        
        // Grid
        'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap',
        
        // Effects
        'opacity', 'transform', 'box-shadow', 'filter',
        'overflow', 'overflow-x', 'overflow-y'
      ];
      
      properties.forEach(prop => {
        const value = computed.getPropertyValue(prop);
        if (value && value !== 'auto' && value !== 'none' && value !== 'normal') {
          styles[prop] = value;
        }
      });
      
      return styles;
    }

    getElementStyles(selector, requestId) {
      const element = document.querySelector(selector);
      if (!element) {
        this.sendMessage(MESSAGE_TYPES.ERROR, {
          error: 'Element not found',
          selector
        }, requestId);
        return;
      }
      
      const elementData = this.getElementData(element);
      this.sendMessage(MESSAGE_TYPES.STYLE_RESPONSE, elementData, requestId);
    }

    updateElementStyles(selector, styles) {
      const element = document.querySelector(selector);
      if (!element) {
        this.sendMessage(MESSAGE_TYPES.ERROR, {
          error: 'Element not found',
          selector
        });
        return;
      }
      
      try {
        Object.keys(styles).forEach(property => {
          if (property === 'className') {
            // Handle className separately
            element.className = styles[property];
            this.log('Updated className to:', styles[property]);
          } else {
            // Handle regular CSS properties with immediate visual feedback
            this.applyStyleWithImportant(element, property, styles[property]);
          }
        });
        
        this.log('Updated styles for:', selector, styles);
        
        // Send back updated element data
        const updatedData = this.getElementData(element);
        this.sendMessage(MESSAGE_TYPES.STYLE_RESPONSE, updatedData);
      } catch (error) {
        this.sendMessage(MESSAGE_TYPES.ERROR, {
          error: error.message,
          selector,
          styles
        });
      }
    }

    applyStyleWithImportant(element, property, value) {
      // Create or get dynamic style element for immediate feedback
      let dynamicStyle = document.getElementById('curio-dynamic-styles');
      if (!dynamicStyle) {
        dynamicStyle = document.createElement('style');
        dynamicStyle.id = 'curio-dynamic-styles';
        document.head.appendChild(dynamicStyle);
      }

      // Generate a unique selector for this element
      const uniqueSelector = this.getSelector(element);
      
      // Convert camelCase to kebab-case
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      
      // Add or update the rule with !important
      let existingRules = dynamicStyle.sheet ? Array.from(dynamicStyle.sheet.cssRules) : [];
      let ruleExists = false;
      
      // Check if rule already exists
      for (let i = 0; i < existingRules.length; i++) {
        if (existingRules[i].selectorText === uniqueSelector) {
          existingRules[i].style.setProperty(cssProperty, value, 'important');
          ruleExists = true;
          break;
        }
      }
      
      if (!ruleExists) {
        // Add new rule
        const rule = \`\${uniqueSelector} { \${cssProperty}: \${value} !important; }\`;
        try {
          if (dynamicStyle.sheet) {
            dynamicStyle.sheet.insertRule(rule, dynamicStyle.sheet.cssRules.length);
          } else {
            dynamicStyle.textContent += rule;
          }
        } catch (e) {
          // Fallback to direct style application
          element.style.setProperty(cssProperty, value, 'important');
        }
      }
      
      this.log('Applied style with !important:', cssProperty, value);
    }

    sendMessage(type, data = {}, id = null) {
      const message = {
        type,
        data,
        id: id || \`iframe_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`
      };
      
      try {
        window.parent.postMessage(message, '*');
        this.log('Sent message:', message);
      } catch (error) {
        console.error('[CurioInspector] Error sending message:', error);
      }
    }

    log(...args) {
      if (this.debug) {
        console.log('[CurioInspector]', ...args);
      }
    }
  }

  // Initialize inspector
  const inspector = new CurioInspector();
  window.__CURIO_INSPECTOR__ = inspector;
})();
`;

/**
 * Inject inspector script into iframe using postMessage
 */
export function injectInspectorScript(iframe) {
  if (!iframe || !iframe.contentWindow) {
    throw new Error('Invalid iframe provided');
  }

  return new Promise((resolve) => {
    console.log('[Inspector] Using postMessage injection approach for cross-origin iframe');

    // Listen for injection success/failure responses
    const handleResponse = (event) => {
      if (event.source !== iframe.contentWindow) return;

      const { type } = event.data;
      
      if (type === 'CURIO_INJECTION_SUCCESS') {
        console.log('[Inspector] PostMessage injection successful');
        window.removeEventListener('message', handleResponse);
        resolve(true);
      } else if (type === 'CURIO_INJECTION_ERROR') {
        console.error('[Inspector] PostMessage injection failed:', event.data.error);
        window.removeEventListener('message', handleResponse);
        resolve(false);
      }
    };

    window.addEventListener('message', handleResponse);

    // Send injection message to iframe
    const injectionMessage = {
      type: 'CURIO_INJECT_INSPECTOR',
      script: INSPECTOR_SCRIPT,
      timestamp: Date.now()
    };

    try {
      iframe.contentWindow.postMessage(injectionMessage, '*');
      console.log('[Inspector] Injection message sent via postMessage');

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        console.warn('[Inspector] Injection timeout - iframe may not support postMessage injection');
        resolve(false);
      }, 5000);

    } catch (error) {
      console.error('[Inspector] Failed to send injection message:', error);
      window.removeEventListener('message', handleResponse);
      resolve(false);
    }
  });
}

/**
 * Check if inspector is already injected
 */
export function isInspectorInjected(iframe) {
  if (!iframe || !iframe.contentWindow) {
    return false;
  }

  try {
    // For proxy iframes, we can't directly check the content window due to cross-origin
    // Instead, we'll rely on the injection response messages
    return false; // Always attempt injection, let the proxy handle duplication checks
  } catch (error) {
    return false;
  }
}

/**
 * Remove inspector from iframe
 */
export function removeInspectorScript(iframe) {
  if (!iframe || !iframe.contentDocument) {
    return false;
  }

  try {
    const script = iframe.contentDocument.querySelector('script[data-curio-inspector]');
    if (script) {
      script.remove();
    }
    
    // Disable inspector if active
    if (iframe.contentWindow.__CURIO_INSPECTOR__) {
      iframe.contentWindow.__CURIO_INSPECTOR__.disable();
    }
    
    delete iframe.contentWindow.__CURIO_INSPECTOR_INJECTED__;
    delete iframe.contentWindow.__CURIO_INSPECTOR__;
    
    console.log('[Inspector] Script removed successfully');
    return true;
  } catch (error) {
    console.error('[Inspector] Failed to remove script:', error);
    return false;
  }
}