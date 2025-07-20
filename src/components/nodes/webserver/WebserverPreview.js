"use client"

import { useCallback, useRef, useEffect, useState } from "react"
import { AlertCircle, RefreshCw, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useInspectorCommunication } from "@/lib/inspectorCommunication"
import { injectInspectorScript, isInspectorInjected } from "@/lib/inspectorScript"
import InspectorSidebar from "@/components/inspector/InspectorSidebar"
import { updateElementClassName } from "@/services/tailwindUpdater"

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

const WebserverPreview = ({ 
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
  const [sidebarWidth, setSidebarWidth] = useState(400) // Default sidebar width
  const [isResizing, setIsResizing] = useState(false)
  const [selectedElement, setSelectedElement] = useState(null)
  const [inspectorReady, setInspectorReady] = useState(false)

  // Initialize inspector communication
  const communication = useInspectorCommunication({ debug: true })
  const handleLoad = useCallback(() => {
    console.log('[Inspector] Iframe loaded, inspector active:', isInspectorActive)
    onLoadSuccess?.()
    
    // Only inject inspector when using proxy (inspector mode active)
    if (isInspectorActive && iframeRef.current) {
      // Wait for proxy iframe to fully load, then inject inspector
      setTimeout(async () => {
        try {
          console.log('[Inspector] Attempting to inject script via proxy')
          
          const injectionSuccess = await injectInspectorScript(iframeRef.current)
          
          if (injectionSuccess) {
            console.log('[Inspector] Script injection successful, initializing communication')
            communication.initialize(iframeRef.current)
            
            // Give the inspector a moment to set up, then try to enable it
            setTimeout(() => {
              console.log('[Inspector] Attempting to enable inspector')
              const enabled = communication.enableInspector()
              console.log('[Inspector] Enable result:', enabled)
            }, 500)
          } else {
            console.error('[Inspector] Script injection failed')
            setInspectorReady(false)
          }
        } catch (error) {
          console.error('[Inspector] Failed to inject inspector script:', error)
          setInspectorReady(false)
        }
      }, 1500) // Increased timeout for better reliability
    }
  }, [onLoadSuccess, communication, isInspectorActive])

  const handleError = useCallback(() => {
    onLoadError?.()
    setInspectorReady(false)
  }, [onLoadError])

  // Setup inspector communication listeners
  useEffect(() => {
    const handleInspectorReady = () => {
      console.log('[Inspector] Inspector ready - enabling selection mode')
      setInspectorReady(true)
    }

    const handleElementSelect = (data) => {
      console.log('[Inspector] Element selected:', data)
      setSelectedElement(data)
    }

    const handleElementHover = (data) => {
      // Handle element hover feedback
      console.log('[Inspector] Element hovered:', data.tagName, data.className)
    }

    const handleStyleResponse = (data) => {
      console.log('[Inspector] Style response received:', data)
      // Update selected element with new data after style changes
      setSelectedElement(data)
    }

    const handleError = (data) => {
      console.error('[Inspector] Error:', data)
    }

    communication.on('INSPECTOR_READY', handleInspectorReady)
    communication.on('ELEMENT_SELECT', handleElementSelect)
    communication.on('ELEMENT_HOVER', handleElementHover)
    communication.on('STYLE_RESPONSE', handleStyleResponse)
    communication.on('ERROR', handleError)

    return () => {
      communication.off('INSPECTOR_READY', handleInspectorReady)
      communication.off('ELEMENT_SELECT', handleElementSelect)
      communication.off('ELEMENT_HOVER', handleElementHover)
      communication.off('STYLE_RESPONSE', handleStyleResponse)
      communication.off('ERROR', handleError)
    }
  }, [communication])

  // Handle inspector state changes
  useEffect(() => {
    if (inspectorReady) {
      if (isInspectorActive) {
        communication.enableInspector()
      } else {
        communication.disableInspector()
      }
    }
  }, [isInspectorActive, inspectorReady, communication])

  // Force iframe reload when inspector is toggled
  useEffect(() => {
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      const expectedSrc = isInspectorActive 
        ? `${window.location.origin}/inspector-proxy.html?url=${encodeURIComponent(url)}`
        : url;

      if (currentSrc !== expectedSrc) {
        console.log('[Inspector] Reloading iframe for inspector toggle:', expectedSrc);
        iframeRef.current.src = expectedSrc;
        setInspectorReady(false);
      }
    }
  }, [isInspectorActive, url])

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

  // Handle style changes from inspector
  const handleStyleChange = useCallback(async (property, value) => {
    if (selectedElement && communication && inspectorReady) {
      const styles = { [property]: value }
      communication.updateElementStyles(selectedElement.selector, styles)
      
      // For className changes, also try to persist to file
      if (property === 'className' && projectId) {
        try {
          console.log(`[Inspector] Attempting to update className in source files for element: ${selectedElement.selector}`)
          console.log(`[Inspector] New className: ${value}`)
          
          // Use TailwindUpdater service to persist changes
          updateElementClassName(projectId, selectedElement, value)
            .then((success) => {
              if (success) {
                console.log('[Inspector] Successfully persisted className changes to source file')
              } else {
                console.warn('[Inspector] Could not find element in source files to update')
              }
            })
            .catch((error) => {
              console.error('[Inspector] Failed to persist className changes:', error)
            })
          
        } catch (error) {
          console.error('[Inspector] Failed to persist className changes:', error)
        }
      }
    }
  }, [selectedElement, communication, inspectorReady, projectId])

  // Handle element selection from DOM tree
  const handleElementSelect = useCallback((element) => {
    if (communication && inspectorReady) {
      // This would select element by DOM node - for now just log
      console.log('Element selected from tree:', element)
    }
  }, [communication, inspectorReady])

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

  // Main content with iframe
  const renderIframe = () => {
    // Use proxy for inspector injection when inspector is active
    const iframeSrc = isInspectorActive 
      ? `/inspector-proxy.html?url=${encodeURIComponent(url)}`
      : url;

    return (
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="w-full h-full border-0"
        title="Website preview"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    );
  }

  // Inspector sidebar component
  const renderInspectorSidebar = () => (
    <InspectorSidebar
      selectedElement={selectedElement}
      inspectorReady={inspectorReady}
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

export default WebserverPreview
