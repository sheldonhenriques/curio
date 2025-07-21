/**
 * Visual Editor SDK for Curio Webserver Nodes
 * This script gets injected into Next.js sandbox projects to enable visual element selection
 * and property editing capabilities.
 */

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
      url: window.location.href
    });
  }

  createOverlays() {
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
    
    // Add event listeners
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('click', this.handleClick.bind(this));
    
    this.sendToParent({
      type: 'SELECT_MODE_ACTIVATED'
    });
  }

  deactivateSelectMode() {
    this.isSelectModeActive = false;
    document.body.style.cursor = 'default';
    
    // Remove event listeners
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('mouseout', this.handleMouseOut.bind(this));
    document.removeEventListener('click', this.handleClick.bind(this));
    
    // Hide overlays
    this.highlightOverlay.style.display = 'none';
    this.selectionOverlay.style.display = 'none';
    
    // Clear selections
    this.hoveredElement = null;
    this.selectedElement = null;
    
    this.sendToParent({
      type: 'SELECT_MODE_DEACTIVATED'
    });
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
    
    // Extract element data and send to parent
    const elementData = this.extractElementData(event.target);
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
      elementPath: this.getElementPath(element)
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

  updateElementProperty(data) {
    if (!this.selectedElement) return;
    
    const { property, value, action } = data;
    
    switch (action) {
      case 'UPDATE_TAILWIND_CLASS':
        this.updateTailwindClass(property, value);
        break;
      case 'UPDATE_TEXT_CONTENT':
        this.updateTextContent(value);
        break;
      case 'UPDATE_ATTRIBUTE':
        this.updateAttribute(property, value);
        break;
      default:
        break;
    }
    
    // Send updated element data back to parent
    const updatedData = this.extractElementData(this.selectedElement);
    this.sendToParent({
      type: 'ELEMENT_UPDATED',
      element: updatedData
    });
  }

  updateTailwindClass(property, newClass) {
    if (!this.selectedElement) return;
    
    const currentClasses = this.selectedElement.className.split(' ').filter(cls => cls.trim());
    
    // Remove conflicting classes based on property type
    const conflictPatterns = this.getConflictPatterns(property);
    const filteredClasses = currentClasses.filter(cls => {
      return !conflictPatterns.some(pattern => pattern.test(cls));
    });
    
    // Add new class
    if (newClass && !filteredClasses.includes(newClass)) {
      filteredClasses.push(newClass);
    }
    
    this.selectedElement.className = filteredClasses.join(' ');
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

  updateTextContent(newText) {
    if (!this.selectedElement) return;
    
    // Only update text content for elements that primarily contain text
    const textElements = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button'];
    
    if (textElements.includes(this.selectedElement.tagName.toLowerCase())) {
      this.selectedElement.textContent = newText;
    }
  }

  updateAttribute(attributeName, value) {
    if (!this.selectedElement) return;
    
    if (value === null || value === '') {
      this.selectedElement.removeAttribute(attributeName);
    } else {
      this.selectedElement.setAttribute(attributeName, value);
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