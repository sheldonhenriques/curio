"use client"

import { useState, useRef, useEffect, useCallback } from "react"

const DirectInspector = ({ 
  iframeRef, 
  isActive, 
  onElementSelect, 
  projectId 
}) => {
  const overlayRef = useRef(null)
  const [hoveredElement, setHoveredElement] = useState(null)
  const [selectedElement, setSelectedElement] = useState(null)
  const [highlightBox, setHighlightBox] = useState(null)

  // Get element at coordinates
  const getElementAtPoint = useCallback((x, y) => {
    if (!iframeRef.current?.contentDocument) return null

    try {
      // Get iframe position
      const iframeRect = iframeRef.current.getBoundingClientRect()
      
      // Calculate coordinates relative to iframe content
      const relativeX = x - iframeRect.left
      const relativeY = y - iframeRect.top
      
      // Get element from iframe document
      const element = iframeRef.current.contentDocument.elementFromPoint(relativeX, relativeY)
      
      if (element && element !== iframeRef.current.contentDocument.body && element !== iframeRef.current.contentDocument.documentElement) {
        return element
      }
    } catch (error) {
      console.log('[Direct Inspector] Cannot access iframe content (CORS):', error.message)
    }
    
    return null
  }, [iframeRef])

  // Get element data
  const getElementData = useCallback((element) => {
    if (!element) return null

    try {
      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)
      
      // Get all classes
      const classes = Array.from(element.classList)
      
      // Get inline styles
      const inlineStyles = element.style.cssText
      
      // Get attributes
      const attributes = {}
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i]
        attributes[attr.name] = attr.value
      }

      return {
        tagName: element.tagName.toLowerCase(),
        id: element.id,
        className: element.className,
        classes: classes,
        attributes: attributes,
        textContent: element.textContent?.substring(0, 100),
        innerHTML: element.innerHTML?.substring(0, 200),
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        styles: {
          computed: {
            display: computedStyle.display,
            position: computedStyle.position,
            width: computedStyle.width,
            height: computedStyle.height,
            margin: computedStyle.margin,
            padding: computedStyle.padding,
            backgroundColor: computedStyle.backgroundColor,
            color: computedStyle.color,
            fontSize: computedStyle.fontSize,
            fontFamily: computedStyle.fontFamily,
            border: computedStyle.border,
            borderRadius: computedStyle.borderRadius
          },
          inline: inlineStyles
        },
        selector: generateSelector(element)
      }
    } catch (error) {
      console.error('[Direct Inspector] Error getting element data:', error)
      return null
    }
  }, [])

  // Generate CSS selector
  const generateSelector = (element) => {
    if (!element) return ''
    
    // Use ID if available
    if (element.id) {
      return `#${element.id}`
    }
    
    // Use class if available
    if (element.className && element.className.trim()) {
      const classes = element.className.trim().split(/\s+/).join('.')
      return `${element.tagName.toLowerCase()}.${classes}`
    }
    
    // Build path
    const path = []
    let current = element
    
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.nodeName.toLowerCase()
      
      if (current.id) {
        selector = `#${current.id}`
        path.unshift(selector)
        break
      } else if (current.className && current.className.trim()) {
        const firstClass = current.className.trim().split(/\s+/)[0]
        selector += `.${firstClass}`
      } else {
        // Use nth-child
        const siblings = Array.from(current.parentNode.children)
        const index = siblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
      }
      
      path.unshift(selector)
      current = current.parentElement
      
      if (path.length > 4) break
    }
    
    return path.join(' > ')
  }

  // Update highlight position
  const updateHighlight = useCallback((element) => {
    if (!element || !iframeRef.current) {
      setHighlightBox(null)
      return
    }

    try {
      const iframeRect = iframeRef.current.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      
      setHighlightBox({
        left: iframeRect.left + elementRect.left,
        top: iframeRect.top + elementRect.top,
        width: elementRect.width,
        height: elementRect.height
      })
    } catch (error) {
      setHighlightBox(null)
    }
  }, [iframeRef])

  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    if (!isActive) return

    const element = getElementAtPoint(e.clientX, e.clientY)
    
    if (element !== hoveredElement) {
      setHoveredElement(element)
      updateHighlight(element)
      
      if (element) {
        const data = getElementData(element)
        if (data) {
          console.log('[Direct Inspector] Hovering:', data.tagName, data.className)
        }
      }
    }
  }, [isActive, hoveredElement, getElementAtPoint, updateHighlight, getElementData])

  // Handle click
  const handleClick = useCallback((e) => {
    if (!isActive) return

    e.preventDefault()
    e.stopPropagation()

    const element = getElementAtPoint(e.clientX, e.clientY)
    
    if (element) {
      setSelectedElement(element)
      const data = getElementData(element)
      
      if (data) {
        console.log('[Direct Inspector] Selected:', data)
        onElementSelect?.(data)
        
        // Add visual selection indicator
        try {
          // Remove previous selection
          iframeRef.current.contentDocument.querySelectorAll('.direct-inspector-selected').forEach(el => {
            el.classList.remove('direct-inspector-selected')
          })
          
          // Add selection to current element
          element.classList.add('direct-inspector-selected')
          
          // Add selection styles if not exist
          let style = iframeRef.current.contentDocument.getElementById('direct-inspector-styles')
          if (!style) {
            style = iframeRef.current.contentDocument.createElement('style')
            style.id = 'direct-inspector-styles'
            style.textContent = `
              .direct-inspector-selected {
                outline: 2px solid #ff0000 !important;
                outline-offset: 1px !important;
              }
            `
            iframeRef.current.contentDocument.head.appendChild(style)
          }
        } catch (error) {
          console.log('[Direct Inspector] Could not add selection styles:', error.message)
        }
      }
    }
  }, [isActive, getElementAtPoint, getElementData, onElementSelect, iframeRef])

  // Handle key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isActive) {
        setHoveredElement(null)
        setSelectedElement(null)
        setHighlightBox(null)
      }
    }

    if (isActive) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive])

  // Update element classes directly
  const updateElementClasses = useCallback(async (newClasses) => {
    if (!selectedElement || !projectId) return false

    try {
      // Update in DOM immediately
      selectedElement.className = newClasses
      
      // Update in source files
      const elementData = getElementData(selectedElement)
      if (elementData) {
        const response = await fetch(`/api/projects/${projectId}/inspector/update-classes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selector: elementData.selector,
            tagName: elementData.tagName,
            id: elementData.id,
            oldClasses: elementData.classes,
            newClasses: newClasses
          })
        })
        
        if (response.ok) {
          console.log('[Direct Inspector] Classes updated in source files')
          return true
        }
      }
    } catch (error) {
      console.error('[Direct Inspector] Failed to update classes:', error)
    }
    
    return false
  }, [selectedElement, projectId, getElementData])

  if (!isActive) {
    return null
  }

  return (
    <>
      {/* Transparent overlay to capture mouse events */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10 cursor-crosshair"
        style={{ 
          backgroundColor: 'transparent',
          pointerEvents: 'auto'
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        title="Click to select element for inspection"
      />
      
      {/* Highlight box */}
      {highlightBox && (
        <div
          className="fixed pointer-events-none z-20 border-2 border-red-500 bg-red-500 bg-opacity-10"
          style={{
            left: highlightBox.left,
            top: highlightBox.top,
            width: highlightBox.width,
            height: highlightBox.height,
            boxSizing: 'border-box'
          }}
        />
      )}
      
      {/* Element info tooltip */}
      {hoveredElement && highlightBox && (
        <div
          className="fixed pointer-events-none z-30 bg-black text-white text-xs px-2 py-1 rounded shadow-lg font-mono"
          style={{
            left: highlightBox.left,
            top: Math.max(0, highlightBox.top - 25),
            maxWidth: '300px'
          }}
        >
          {hoveredElement.tagName.toLowerCase()}
          {hoveredElement.id && `#${hoveredElement.id}`}
          {hoveredElement.className && `.${hoveredElement.className.split(' ').join('.')}`}
        </div>
      )}
    </>
  )
}

export default DirectInspector