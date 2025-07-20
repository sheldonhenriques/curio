"use client"

import { useState, useRef, useEffect, useCallback } from "react"

/**
 * PostMessage-based Inspector
 * Works across origins using postMessage communication
 * No DOM access needed - elements report themselves
 */
const PostMessageInspector = ({ 
  iframeRef, 
  isActive, 
  onElementSelect, 
  projectId 
}) => {
  const [hoveredElement, setHoveredElement] = useState(null)
  const [selectedElement, setSelectedElement] = useState(null)
  const [isReady, setIsReady] = useState(false)

  // Send message to iframe
  const sendMessage = useCallback((type, data = {}) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: `INSPECTOR_${type}`,
          data,
          timestamp: Date.now()
        }, '*')
        console.log('[PostMessage Inspector] Sent:', type, data)
      } catch (error) {
        console.error('[PostMessage Inspector] Send failed:', error)
      }
    }
  }, [iframeRef])

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      const { type, data } = event.data
      
      if (!type?.startsWith('INSPECTOR_')) return
      
      console.log('[PostMessage Inspector] Received:', type, data)
      
      switch (type) {
        case 'INSPECTOR_READY':
          setIsReady(true)
          if (isActive) {
            sendMessage('ENABLE')
          }
          break
          
        case 'INSPECTOR_ELEMENT_HOVER':
          setHoveredElement(data)
          break
          
        case 'INSPECTOR_ELEMENT_SELECT':
          setSelectedElement(data)
          onElementSelect?.(data)
          break
          
        case 'INSPECTOR_ELEMENT_UNHOVER':
          setHoveredElement(null)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isActive, sendMessage, onElementSelect])

  // Handle inspector activation
  useEffect(() => {
    if (isReady) {
      if (isActive) {
        console.log('[PostMessage Inspector] Enabling')
        sendMessage('ENABLE')
      } else {
        console.log('[PostMessage Inspector] Disabling')
        sendMessage('DISABLE')
        setSelectedElement(null)
        setHoveredElement(null)
      }
    }
  }, [isActive, isReady, sendMessage])

  // Initialize inspector when iframe loads
  useEffect(() => {
    if (iframeRef.current && isActive) {
      // Wait for iframe to load, then inject
      const timer = setTimeout(() => {
        console.log('[PostMessage Inspector] Injecting script')
        sendMessage('INJECT', { 
          script: getInspectorScript()
        })
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [isActive, sendMessage])

  // Update element styles
  const updateElementStyle = useCallback((property, value) => {
    if (selectedElement) {
      sendMessage('UPDATE_STYLE', {
        selector: selectedElement.selector,
        property,
        value
      })
      
      // Update local state
      setSelectedElement(prev => ({
        ...prev,
        styles: {
          ...prev.styles,
          [property]: value
        }
      }))
    }
  }, [selectedElement, sendMessage])

  // Expose update function
  useEffect(() => {
    if (onElementSelect) {
      // Add update method to selected element
      if (selectedElement) {
        selectedElement.updateStyle = updateElementStyle
      }
    }
  }, [selectedElement, updateElementStyle, onElementSelect])

  return (
    <>
      {/* Status indicator */}
      {isActive && (
        <div className="absolute top-2 left-2 z-30 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow">
          {isReady ? '✅ Inspector Ready (PostMessage)' : '⏳ Initializing Inspector...'}
          {hoveredElement && (
            <div className="mt-1 font-mono text-xs">
              {hoveredElement.tagName}
              {hoveredElement.id && `#${hoveredElement.id}`}
              {hoveredElement.className && `.${hoveredElement.className.split(' ').slice(0, 2).join('.')}`}
            </div>
          )}
        </div>
      )}
    </>
  )
}

/**
 * Get the inspector script to inject
 */
function getInspectorScript() {
  return `
(function() {
  'use strict';
  
  if (window.__POSTMESSAGE_INSPECTOR__) return;
  window.__POSTMESSAGE_INSPECTOR__ = true;
  
  console.log('[PostMessage Inspector] Script loaded');
  
  let isEnabled = false;
  let selectedElement = null;
  
  // Create overlay for highlighting
  const overlay = document.createElement('div');
  overlay.style.cssText = \`
    position: fixed !important;
    pointer-events: none !important;
    z-index: 999999 !important;
    border: 2px solid #ff0000 !important;
    background: rgba(255, 0, 0, 0.1) !important;
    display: none !important;
    box-sizing: border-box !important;
  \`;
  document.body.appendChild(overlay);
  
  // Selection styles
  const style = document.createElement('style');
  style.textContent = \`
    .postmessage-inspector-selected {
      outline: 3px solid #0066ff !important;
      outline-offset: 1px !important;
    }
  \`;
  document.head.appendChild(style);
  
  // Get element data
  function getElementData(element) {
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      textContent: element.textContent?.substring(0, 100),
      selector: getSelector(element),
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      styles: {
        display: getComputedStyle(element).display,
        position: getComputedStyle(element).position,
        backgroundColor: getComputedStyle(element).backgroundColor,
        color: getComputedStyle(element).color,
        fontSize: getComputedStyle(element).fontSize
      }
    };
  }
  
  // Generate CSS selector
  function getSelector(element) {
    if (element.id) return '#' + element.id;
    if (element.className) {
      const classes = element.className.trim().split(/\\s+/).join('.');
      return element.tagName.toLowerCase() + '.' + classes;
    }
    
    const path = [];
    let current = element;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.className) {
        selector += '.' + current.className.trim().split(/\\s+/)[0];
      } else {
        const siblings = Array.from(current.parentNode.children);
        const index = siblings.indexOf(current) + 1;
        selector += ':nth-child(' + index + ')';
      }
      path.unshift(selector);
      current = current.parentElement;
      if (path.length > 3) break;
    }
    return path.join(' > ');
  }
  
  // Highlight element
  function highlightElement(element) {
    if (!element) {
      overlay.style.display = 'none';
      return;
    }
    
    const rect = element.getBoundingClientRect();
    overlay.style.cssText += \`
      display: block !important;
      left: \${rect.left + window.scrollX}px !important;
      top: \${rect.top + window.scrollY}px !important;
      width: \${rect.width}px !important;
      height: \${rect.height}px !important;
    \`;
  }
  
  // Event handlers
  function handleMouseMove(e) {
    if (!isEnabled) return;
    highlightElement(e.target);
    
    window.parent.postMessage({
      type: 'INSPECTOR_ELEMENT_HOVER',
      data: getElementData(e.target)
    }, '*');
  }
  
  function handleClick(e) {
    if (!isEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedElement) {
      selectedElement.classList.remove('postmessage-inspector-selected');
    }
    
    selectedElement = e.target;
    selectedElement.classList.add('postmessage-inspector-selected');
    
    window.parent.postMessage({
      type: 'INSPECTOR_ELEMENT_SELECT',
      data: getElementData(selectedElement)
    }, '*');
  }
  
  function handleMouseLeave() {
    if (!isEnabled) return;
    overlay.style.display = 'none';
    window.parent.postMessage({
      type: 'INSPECTOR_ELEMENT_UNHOVER'
    }, '*');
  }
  
  // Enable/disable inspector
  function enable() {
    if (isEnabled) return;
    isEnabled = true;
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);
    console.log('[PostMessage Inspector] Enabled');
  }
  
  function disable() {
    if (!isEnabled) return;
    isEnabled = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('mouseleave', handleMouseLeave, true);
    overlay.style.display = 'none';
    
    if (selectedElement) {
      selectedElement.classList.remove('postmessage-inspector-selected');
      selectedElement = null;
    }
    console.log('[PostMessage Inspector] Disabled');
  }
  
  // Listen for messages from parent
  window.addEventListener('message', function(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'INSPECTOR_INJECT':
        // Already injected, just respond
        window.parent.postMessage({
          type: 'INSPECTOR_READY'
        }, '*');
        break;
        
      case 'INSPECTOR_ENABLE':
        enable();
        break;
        
      case 'INSPECTOR_DISABLE':
        disable();
        break;
        
      case 'INSPECTOR_UPDATE_STYLE':
        if (selectedElement && data.selector) {
          const element = document.querySelector(data.selector);
          if (element) {
            if (data.property === 'className') {
              element.className = data.value;
            } else {
              element.style[data.property] = data.value;
            }
          }
        }
        break;
    }
  });
  
  // Notify parent that inspector is ready
  window.parent.postMessage({
    type: 'INSPECTOR_READY'
  }, '*');
})();
`
}

export default PostMessageInspector