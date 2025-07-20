"use client"

import { useCallback, useRef, useEffect, useState } from "react"
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import DirectInspector from "./DirectInspector"
import InspectorSidebar from "@/components/inspector/InspectorSidebar"

const ErrorState = ({ onRetry }) => (
  <div className="flex-1 flex items-center justify-center bg-red-50">
    <div className="text-center text-red-600">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm mb-2">Could not load page</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto">
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  </div>
)

const LoadingState = ({ message }) => (
  <div className="flex-1 flex items-center justify-center bg-blue-50">
    <div className="text-center text-blue-600">
      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
      <p className="text-sm">{message || "Loading..."}</p>
    </div>
  </div>
)

const StoppedState = () => (
  <div className="flex-1 flex items-center justify-center bg-yellow-50">
    <div className="text-center text-yellow-600">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm">Sandbox is stopped</p>
      <p className="text-xs text-gray-500 mt-1">Please start the sandbox to view the preview</p>
    </div>
  </div>
)

const DirectWebserverPreview = ({ 
  url, 
  hasError, 
  onLoadError, 
  onLoadSuccess, 
  onRetry, 
  sandboxStatus,
  isInspectorActive,
  projectId
}) => {
  const iframeRef = useRef(null)
  const [sidebarWidth, setSidebarWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [selectedElement, setSelectedElement] = useState(null)
  const [inspectorReady, setInspectorReady] = useState(false)
  const [canAccessIframe, setCanAccessIframe] = useState(false)

  const handleLoad = useCallback(() => {
    console.log('[Direct Inspector] Iframe loaded')
    onLoadSuccess?.()
    
    // Test if we can access iframe content (same-origin)
    setTimeout(() => {
      try {
        if (iframeRef.current?.contentDocument) {
          console.log('[Direct Inspector] Same-origin access confirmed')
          setCanAccessIframe(true)
          setInspectorReady(true)
        } else {
          console.log('[Direct Inspector] Cross-origin iframe detected')
          setCanAccessIframe(false)
          setInspectorReady(false)
        }
      } catch (error) {
        console.log('[Direct Inspector] Cannot access iframe:', error.message)
        setCanAccessIframe(false)
        setInspectorReady(false)
      }
    }, 500)
  }, [onLoadSuccess])

  // Listen for iframe content ready message
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'IFRAME_CONTENT_READY') {
        console.log('[Direct Inspector] Iframe content ready via proxy')
        setCanAccessIframe(true)
        setInspectorReady(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleError = useCallback(() => {
    console.log('[Direct Inspector] Iframe load error')
    onLoadError?.()
    setInspectorReady(false)
    setCanAccessIframe(false)
  }, [onLoadError])

  // Handle element selection
  const handleElementSelect = useCallback((elementData) => {
    console.log('[Direct Inspector] Element selected:', elementData)
    setSelectedElement(elementData)
  }, [])

  // Handle inspector toggle (reload iframe with proxy when needed)
  useEffect(() => {
    if (iframeRef.current) {
      const expectedSrc = isInspectorActive 
        ? `/api/proxy?url=${encodeURIComponent(url)}`
        : url
      const currentSrc = iframeRef.current.src
      
      if (currentSrc !== expectedSrc) {
        console.log('[Direct Inspector] Reloading iframe for inspector toggle')
        setCanAccessIframe(false)
        setInspectorReady(false)
        setSelectedElement(null)
        
        iframeRef.current.src = expectedSrc
      }
    }
  }, [isInspectorActive, url])

  // Handle style changes
  const handleStyleChange = useCallback(async (property, value) => {
    if (!selectedElement || !canAccessIframe) return

    try {
      // Update element in DOM immediately
      const selector = selectedElement.selector
      const element = iframeRef.current.contentDocument.querySelector(selector)
      
      if (element) {
        if (property === 'className') {
          element.className = value
          console.log('[Direct Inspector] Updated className to:', value)
          
          // Update selected element data
          setSelectedElement(prev => ({
            ...prev,
            className: value,
            classes: value.split(' ').filter(c => c.trim())
          }))
        } else {
          element.style[property] = value
          console.log('[Direct Inspector] Updated style:', property, '=', value)
        }

        // Update in source files
        if (property === 'className' && projectId) {
          try {
            const response = await fetch(`/api/projects/${projectId}/inspector/update-classes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                selector: selectedElement.selector,
                tagName: selectedElement.tagName,
                id: selectedElement.id,
                oldClasses: selectedElement.classes || [],
                newClasses: value
              })
            })
            
            if (response.ok) {
              console.log('[Direct Inspector] Updated classes in source files')
            } else {
              console.warn('[Direct Inspector] Failed to update source files')
            }
          } catch (error) {
            console.error('[Direct Inspector] Error updating source files:', error)
          }
        }
      }
    } catch (error) {
      console.error('[Direct Inspector] Error updating element:', error)
    }
  }, [selectedElement, canAccessIframe, projectId])

  // Resize handler for split pane
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      
      const container = iframeRef.current?.parentElement?.parentElement
      if (!container) return
      
      const containerRect = container.getBoundingClientRect()
      const newWidth = containerRect.right - e.clientX
      const minWidth = 300
      const maxWidth = containerRect.width - 300
      
      setSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Show different states based on sandbox status
  if (sandboxStatus === 'creating') {
    return <LoadingState message="Setting up sandbox..." />
  }

  if (sandboxStatus === 'starting') {
    return <LoadingState message="Starting sandbox..." />
  }

  if (sandboxStatus === 'stopped') {
    return <StoppedState />
  }

  if (sandboxStatus === 'failed' || sandboxStatus === 'error') {
    return <ErrorState onRetry={onRetry} />
  }

  if (hasError) {
    return <ErrorState onRetry={onRetry} />
  }

  // Show loading state if no URL is available yet
  if (!url) {
    return <LoadingState message="Waiting for preview URL..." />
  }

  // Get iframe source URL
  const getIframeSrc = () => {
    if (isInspectorActive) {
      // Use proxy for same-origin access when inspector is active
      return `/api/proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }

  // Main content with iframe
  const renderIframe = () => (
    <div className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        src={getIframeSrc()}
        className="w-full h-full border-0"
        title="Website preview"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
      
      {/* Direct Inspector Overlay */}
      {isInspectorActive && canAccessIframe && (
        <DirectInspector
          iframeRef={iframeRef}
          isActive={isInspectorActive}
          onElementSelect={handleElementSelect}
          projectId={projectId}
        />
      )}
      
      {/* Status indicator */}
      {isInspectorActive && (
        <div className="absolute top-2 left-2 z-30 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow">
          {canAccessIframe ? '✅ Inspector Ready - Click elements to select' : '❌ Cannot access iframe (CORS)'}
        </div>
      )}
    </div>
  )

  // Inspector sidebar component
  const renderInspectorSidebar = () => (
    <InspectorSidebar
      selectedElement={selectedElement}
      inspectorReady={inspectorReady && canAccessIframe}
      onElementSelect={handleElementSelect}
      onStyleChange={handleStyleChange}
      projectId={projectId}
    />
  )

  return (
    <div className="flex-1 p-2">
      <div className="w-full h-full border border-gray-200 rounded overflow-hidden">
        {isInspectorActive ? (
          // Split-pane layout
          <div className="flex h-full">
            {/* Main iframe area */}
            <div 
              className="flex-1 border-r border-gray-200 overflow-hidden"
              style={{ width: `calc(100% - ${sidebarWidth}px)` }}
            >
              {renderIframe()}
            </div>
            
            {/* Resize handle */}
            <div
              className={`w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors duration-150 ${
                isResizing ? 'bg-blue-500' : ''
              }`}
              onMouseDown={handleMouseDown}
            />
            
            {/* Inspector sidebar */}
            <div 
              className="overflow-hidden"
              style={{ width: `${sidebarWidth}px` }}
            >
              {renderInspectorSidebar()}
            </div>
          </div>
        ) : (
          // Single iframe layout
          renderIframe()
        )}
      </div>
    </div>
  )
}

export default DirectWebserverPreview