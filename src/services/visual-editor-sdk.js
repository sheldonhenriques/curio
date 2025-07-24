/**
 * Visual Editor SDK for Curio Webserver Nodes
 * This script gets injected into Next.js sandbox projects to enable visual element selection
 * and property editing capabilities.
 * 
 * @version 1.0.0
 */

// Visual Editor SDK Version
const CURIO_VISUAL_EDITOR_VERSION = '1.0.0';

class CurioVisualEditor {
  constructor() {
    this.isSelectModeActive = false;
    this.selectedElement = null;
    this.hoveredElement = null;
    this.highlightOverlay = null;
    this.selectionOverlay = null;
    this.parentOrigin = '*'; // Will be set when receiving messages
    
    this.init();
  }

  init() {
    // Listen for messages from parent window
    window.addEventListener('message', this.handleParentMessage.bind(this));
    
    // Create overlay elements for highlighting
    this.createOverlays();
    
    // Send ready message to parent
    this.sendToParent({
      type: 'VISUAL_EDITOR_READY',
      url: window.location.href,
      version: CURIO_VISUAL_EDITOR_VERSION
    });
  }

  createOverlays() {
    // Remove existing overlays first to prevent duplicates
    this.removeOverlays();
    
    // Create hover highlight overlay
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.id = 'curio-highlight-overlay';
    this.highlightOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background-color: rgba(59, 130, 246, 0.1);
      z-index: 999999;
      display: none;
      transition: all 0.1s ease;
    `;
    document.body.appendChild(this.highlightOverlay);

    // Create selection overlay
    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.id = 'curio-selection-overlay';
    this.selectionOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #ef4444;
      background-color: rgba(239, 68, 68, 0.1);
      z-index: 999999;
      display: none;
    `;
    document.body.appendChild(this.selectionOverlay);
  }

  removeOverlays() {
    // Safely remove existing overlays
    const existingHighlight = document.getElementById('curio-highlight-overlay');
    if (existingHighlight && existingHighlight.parentNode) {
      existingHighlight.parentNode.removeChild(existingHighlight);
    }
    
    const existingSelection = document.getElementById('curio-selection-overlay');
    if (existingSelection && existingSelection.parentNode) {
      existingSelection.parentNode.removeChild(existingSelection);
    }
  }

  handleParentMessage(event) {
    // Use wildcard origin for cross-origin communication
    // Note: In a production environment, you might want to validate the origin
    this.parentOrigin = '*';

    const { type, data } = event.data;

    switch (type) {
      case 'ACTIVATE_SELECT_MODE':
        this.activateSelectMode();
        break;
      case 'DEACTIVATE_SELECT_MODE':
        this.deactivateSelectMode();
        break;
      case 'UPDATE_ELEMENT_PROPERTY':
        this.updateElementProperty(data);
        break;
      default:
        break;
    }
  }

  activateSelectMode() {
    this.isSelectModeActive = true;
    document.body.style.cursor = 'crosshair';
    
    // Store bound functions for proper removal later
    this.handleMouseOverBound = this.handleMouseOver.bind(this);
    this.handleMouseOutBound = this.handleMouseOut.bind(this);
    this.handleClickBound = this.handleClick.bind(this);
    
    // Add event listeners
    document.addEventListener('mouseover', this.handleMouseOverBound);
    document.addEventListener('mouseout', this.handleMouseOutBound);
    document.addEventListener('click', this.handleClickBound);
    
    this.sendToParent({
      type: 'SELECT_MODE_ACTIVATED'
    });
  }

  deactivateSelectMode() {
    this.isSelectModeActive = false;
    document.body.style.cursor = 'default';
    
    // Remove event listeners with proper function references
    if (this.handleMouseOverBound) {
      document.removeEventListener('mouseover', this.handleMouseOverBound);
    }
    if (this.handleMouseOutBound) {
      document.removeEventListener('mouseout', this.handleMouseOutBound);
    }
    if (this.handleClickBound) {
      document.removeEventListener('click', this.handleClickBound);
    }
    
    // Hide overlays safely
    if (this.highlightOverlay) {
      this.highlightOverlay.style.display = 'none';
    }
    if (this.selectionOverlay) {
      this.selectionOverlay.style.display = 'none';
    }
    
    // Note: We don't remove data-visual-id as it's permanently injected by AST parser
    
    // Clear selections
    this.hoveredElement = null;
    this.selectedElement = null;
    
    this.sendToParent({
      type: 'SELECT_MODE_DEACTIVATED'
    });
  }

  generateFallbackId(element) {
    // Generate a fallback ID based on element characteristics
    const tagName = element.tagName.toLowerCase();
    const classList = element.className.replace(/\s+/g, '_');
    const textContent = element.textContent?.trim().substring(0, 20).replace(/\s+/g, '_') || '';
    const timestamp = Date.now();
    
    return `fallback_${tagName}_${classList}_${textContent}_${timestamp}`.substring(0, 100);
  }

  generateUniqueId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `curio-${timestamp}-${random}`;
  }

  handleMouseOver(event) {
    if (!this.isSelectModeActive) return;
    
    event.stopPropagation();
    this.hoveredElement = event.target;
    this.highlightElement(event.target, this.highlightOverlay);
  }

  handleMouseOut(event) {
    if (!this.isSelectModeActive) return;
    
    this.hoveredElement = null;
    this.highlightOverlay.style.display = 'none';
  }

  handleClick(event) {
    if (!this.isSelectModeActive) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    this.selectedElement = event.target;
    this.highlightElement(event.target, this.selectionOverlay);
    
    // Use the AST-injected data-visual-id if available, otherwise fallback to generating one
    let visualId = this.selectedElement.getAttribute('data-visual-id');
    if (!visualId) {
      // Fallback for elements without AST-injected IDs
      visualId = this.generateFallbackId(this.selectedElement);
    }
    
    // Extract element data and send to parent
    const elementData = this.extractElementData(event.target);
    elementData.visualId = visualId; // Use visualId instead of curioId
    
    this.sendToParent({
      type: 'ELEMENT_SELECTED',
      element: elementData
    });
  }

  highlightElement(element, overlay) {
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;
    
    overlay.style.display = 'block';
    overlay.style.left = (rect.left + scrollX) + 'px';
    overlay.style.top = (rect.top + scrollY) + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }

  extractElementData(element) {
    const computedStyles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // Extract Tailwind classes from className
    const tailwindClasses = this.extractTailwindClasses(element.className);
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      tailwindClasses: tailwindClasses,
      textContent: element.textContent?.trim().substring(0, 100) || '',
      innerHTML: element.innerHTML,
      attributes: this.getElementAttributes(element),
      computedStyles: {
        display: computedStyles.display,
        position: computedStyles.position,
        margin: computedStyles.margin,
        padding: computedStyles.padding,
        width: computedStyles.width,
        height: computedStyles.height,
        fontSize: computedStyles.fontSize,
        fontFamily: computedStyles.fontFamily,
        fontWeight: computedStyles.fontWeight,
        color: computedStyles.color,
        backgroundColor: computedStyles.backgroundColor,
        border: computedStyles.border,
        borderRadius: computedStyles.borderRadius,
        textAlign: computedStyles.textAlign,
        opacity: computedStyles.opacity,
        zIndex: computedStyles.zIndex,
        transform: computedStyles.transform,
        overflow: computedStyles.overflow
      },
      boundingRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      elementPath: this.getElementPath(element),
      xpath: this.getElementXPath(element)
    };
  }

  extractTailwindClasses(className) {
    if (!className) return {};
    
    const classes = className.split(' ').filter(cls => cls.trim());
    const tailwindClasses = {};
    
    // Common Tailwind patterns
    const patterns = {
      margin: /^m[xylrtb]?-\d+$/,
      padding: /^p[xylrtb]?-\d+$/,
      width: /^w-/,
      height: /^h-/,
      textSize: /^text-(xs|sm|base|lg|xl|\d+xl)$/,
      textColor: /^text-/,
      backgroundColor: /^bg-/,
      border: /^border/,
      rounded: /^rounded/,
      display: /^(block|inline|flex|grid|hidden)$/,
      position: /^(static|fixed|absolute|relative|sticky)$/
    };
    
    classes.forEach(cls => {
      for (const [category, pattern] of Object.entries(patterns)) {
        if (pattern.test(cls)) {
          if (!tailwindClasses[category]) tailwindClasses[category] = [];
          tailwindClasses[category].push(cls);
        }
      }
    });
    
    return tailwindClasses;
  }

  getElementAttributes(element) {
    const attributes = {};
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  getElementPath(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        selector += `.${current.className.split(' ').join('.')}`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  getElementXPath(element) {
    if (!element || element === document.body) {
      return '/html/body';
    }
    
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let index = 1;
      let sibling = current.previousElementSibling;
      
      // Count preceding siblings of the same tag name
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      let pathSegment = tagName;
      
      // Add index if there are multiple elements of the same type
      const parent = current.parentElement;
      if (parent) {
        const similarSiblings = parent.querySelectorAll(tagName);
        if (similarSiblings.length > 1) {
          pathSegment += `[${index}]`;
        }
      }
      
      path.unshift(pathSegment);
      current = current.parentElement;
    }
    
    return '/html/body/' + path.join('/');
  }

  updateElementProperty(data) {
    const { property, value, action, visualId } = data;
    
    // Find element by visualId (either data-visual-id or fallback)
    let targetElement = this.selectedElement;
    if (visualId) {
      // First try to find by data-visual-id (AST-injected)
      targetElement = document.querySelector(`[data-visual-id="${visualId}"]`);
      
      // If not found and it's a fallback ID, use the currently selected element
      if (!targetElement && visualId.startsWith('fallback_')) {
        targetElement = this.selectedElement;
      }
      
      if (!targetElement) {
        return;
      }
    }
    
    if (!targetElement) return;
    
    switch (action) {
      case 'UPDATE_TAILWIND_CLASS':
        this.updateTailwindClass(property, value, targetElement);
        break;
      case 'UPDATE_TEXT_CONTENT':
        this.updateTextContent(value, targetElement);
        break;
      case 'UPDATE_ATTRIBUTE':
        this.updateAttribute(property, value, targetElement);
        break;
      default:
        break;
    }
    
    // Send updated element data back to parent
    const updatedData = this.extractElementData(targetElement);
    updatedData.visualId = visualId; // Preserve the visualId
    this.sendToParent({
      type: 'ELEMENT_UPDATED',
      element: updatedData
    });
  }

  updateTailwindClass(property, newClass, targetElement = this.selectedElement) {
    if (!targetElement) return;
    
    const currentClasses = targetElement.className.split(' ').filter(cls => cls.trim());
    
    // Remove conflicting classes based on property type
    const conflictPatterns = this.getConflictPatterns(property);
    const filteredClasses = currentClasses.filter(cls => {
      return !conflictPatterns.some(pattern => pattern.test(cls));
    });
    
    // Add new class
    if (newClass && !filteredClasses.includes(newClass)) {
      filteredClasses.push(newClass);
    }
    
    targetElement.className = filteredClasses.join(' ');
  }

  getConflictPatterns(property) {
    const conflicts = {
      margin: [
        /^m[xylrtb]?-\d+$/,
        /^m[xylrtb]?-auto$/,
        /^m[xylrtb]?-\[[^\]]+\]$/ // Arbitrary values like m-[23px]
      ],
      padding: [
        /^p[xylrtb]?-\d+$/,
        /^p[xylrtb]?-\[[^\]]+\]$/ // Arbitrary values like p-[15px]
      ],
      width: [
        /^w-/,
        /^w-\[[^\]]+\]$/ // Arbitrary values like w-[200px]
      ],
      height: [
        /^h-/,
        /^h-\[[^\]]+\]$/ // Arbitrary values like h-[150px]
      ],
      fontSize: [
        /^text-(xs|sm|base|lg|xl|\d+xl)$/,
        /^text-\[[^\]]+\]$/ // Arbitrary values like text-[17px]
      ],
      fontWeight: [
        /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
        /^font-\[[^\]]+\]$/ // Arbitrary values like font-[550]
      ],
      textColor: [
        /^text-\w+(-\d+)?$/,
        /^text-\[[^\]]+\]$/ // Arbitrary values like text-[#1da1f2]
      ],
      backgroundColor: [
        /^bg-\w+(-\d+)?$/,
        /^bg-\[[^\]]+\]$/ // Arbitrary values like bg-[#ff0000]
      ],
      borderRadius: [
        /^rounded(-\w+)?$/,
        /^rounded-\[[^\]]+\]$/ // Arbitrary values like rounded-[12px]
      ],
      display: [/^(block|inline|flex|grid|hidden)$/],
      position: [/^(static|fixed|absolute|relative|sticky)$/],
      textAlign: [/^text-(left|center|right|justify)$/]
    };
    
    return conflicts[property] || [];
  }

  updateTextContent(newText, targetElement = this.selectedElement) {
    if (!targetElement) return;
    
    try {
      // Only update text content for elements that primarily contain text
      const textElements = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button'];
      
      if (textElements.includes(targetElement.tagName.toLowerCase())) {
        // For elements with mixed content (text + HTML), preserve child elements while updating text
        const hasChildElements = targetElement.children.length > 0;
        
        if (hasChildElements) {
          // Store child elements
          const childElements = Array.from(targetElement.children);
          
          // Create a temporary container to restructure content
          const textNode = document.createTextNode(newText);
          
          // Clear and rebuild content
          targetElement.innerHTML = '';
          targetElement.appendChild(textNode);
          
          // Re-append child elements
          childElements.forEach(child => {
            targetElement.appendChild(child);
          });
        } else {
          // Simple text content update
          targetElement.textContent = newText;
        }
        
        // Send success notification
        this.sendToParent({
          type: 'TEXT_CONTENT_UPDATED',
          element: this.extractElementData(targetElement),
          newText: newText
        });
      }
    } catch (error) {
      console.error('Error updating text content:', error);
      this.sendToParent({
        type: 'TEXT_UPDATE_ERROR',
        error: error.message
      });
    }
  }

  updateAttribute(attributeName, value, targetElement = this.selectedElement) {
    if (!targetElement) return;
    
    if (value === null || value === '') {
      targetElement.removeAttribute(attributeName);
    } else {
      targetElement.setAttribute(attributeName, value);
    }
  }

  sendToParent(message) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, this.parentOrigin);
    }
  }
}

// Initialize the Visual Editor when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.curioVisualEditor = new CurioVisualEditor();
  });
} else {
  window.curioVisualEditor = new CurioVisualEditor();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CurioVisualEditor;
}