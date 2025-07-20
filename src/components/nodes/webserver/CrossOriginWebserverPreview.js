"use client"

import { useCallback, useRef, useEffect, useState } from "react"
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import PostMessageInspector from "./PostMessageInspector"
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

const CrossOriginWebserverPreview = ({ 
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

  const handleLoad = useCallback(() => {
    console.log('[CrossOrigin Inspector] Iframe loaded')
    onLoadSuccess?.()
  }, [onLoadSuccess])

  const handleError = useCallback(() => {
    console.log('[CrossOrigin Inspector] Iframe load error')
    onLoadError?.()
    setInspectorReady(false)
  }, [onLoadError])

  // Handle element selection
  const handleElementSelect = useCallback((elementData) => {
    console.log('[CrossOrigin Inspector] Element selected:', elementData)
    setSelectedElement(elementData)
  }, [])

  // Handle style changes
  const handleStyleChange = useCallback(async (property, value) => {
    if (!selectedElement) return

    console.log('[CrossOrigin Inspector] Style change:', property, '=', value)

    // Update element via PostMessage
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'INSPECTOR_UPDATE_STYLE',
          data: {
            selector: selectedElement.selector,
            property,
            value
          }
        }, '*')

        // Update local state
        setSelectedElement(prev => ({
          ...prev,
          [property === 'className' ? 'className' : 'styles']: 
            property === 'className' ? value : { ...prev.styles, [property]: value }
        }))

        // Update source files for className changes
        if (property === 'className' && projectId) {
          try {
            const response = await fetch(`/api/projects/${projectId}/inspector/update-classes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                selector: selectedElement.selector,
                tagName: selectedElement.tagName,
                id: selectedElement.id,
                oldClasses: selectedElement.className?.split(' ').filter(c => c.trim()) || [],
                newClasses: value
              })
            })
            
            if (response.ok) {
              console.log('[CrossOrigin Inspector] Updated classes in source files')
            } else {
              console.warn('[CrossOrigin Inspector] Failed to update source files')
            }
          } catch (error) {
            console.error('[CrossOrigin Inspector] Error updating source files:', error)
          }
        }

      } catch (error) {
        console.error('[CrossOrigin Inspector] Error sending style update:', error)
      }
    }
  }, [selectedElement, projectId])

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

  // Main content with iframe
  const renderIframe = () => (
    <div className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-full border-0"
        title="Website preview"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
      
      {/* PostMessage Inspector */}
      <PostMessageInspector
        iframeRef={iframeRef}
        isActive={isInspectorActive}
        onElementSelect={handleElementSelect}
        projectId={projectId}
      />
    </div>
  )

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

export default CrossOriginWebserverPreview