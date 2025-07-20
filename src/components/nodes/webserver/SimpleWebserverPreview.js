"use client"

import { useCallback, useRef, useEffect, useState } from "react"
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { injectSimpleInspector, enableSimpleInspector, disableSimpleInspector } from "@/lib/simpleInspector"

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

const SimpleWebserverPreview = ({ 
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
  const [inspectorReady, setInspectorReady] = useState(false)
  const [selectedElement, setSelectedElement] = useState(null)
  const [logs, setLogs] = useState([])

  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-10), { timestamp, message, data }])
    console.log(`[SIMPLE INSPECTOR] ${message}`, data || '')
  }

  const handleLoad = useCallback(() => {
    addLog('Iframe loaded')
    onLoadSuccess?.()
    
    if (isInspectorActive && iframeRef.current) {
      addLog('Attempting to inject simple inspector')
      
      // Wait longer for iframe to fully initialize
      setTimeout(() => {
        addLog('Starting injection process...')
        const success = injectSimpleInspector(iframeRef.current)
        if (success) {
          addLog('Inspector injection initiated')
        } else {
          addLog('Inspector injection failed')
        }
      }, 2000)
    }
  }, [onLoadSuccess, isInspectorActive])

  const handleError = useCallback(() => {
    addLog('Iframe load error')
    onLoadError?.()
    setInspectorReady(false)
  }, [onLoadError])

  // Listen for inspector messages
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      
      const { type, data } = event.data
      addLog(`Received message: ${type}`, data)
      
      switch (type) {
        case 'INSPECTOR_READY':
          setInspectorReady(true)
          addLog('Inspector ready!')
          break
        case 'ELEMENT_SELECTED':
          setSelectedElement(data)
          addLog('Element selected', data)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Handle inspector activation (reload iframe if needed)
  useEffect(() => {
    if (isInspectorActive && iframeRef.current) {
      // Reset states
      setInspectorReady(false)
      setSelectedElement(null)
      
      // Force reload to ensure clean state
      const currentSrc = iframeRef.current.src
      iframeRef.current.src = 'about:blank'
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc
          addLog('Iframe reloaded for inspector activation')
        }
      }, 100)
    } else if (!isInspectorActive && inspectorReady) {
      addLog('Disabling inspector')
      disableSimpleInspector(iframeRef.current)
      setSelectedElement(null)
    }
  }, [isInspectorActive])

  // Handle inspector ready state changes
  useEffect(() => {
    if (inspectorReady && isInspectorActive && iframeRef.current) {
      addLog('Enabling inspector')
      enableSimpleInspector(iframeRef.current)
    }
  }, [inspectorReady, isInspectorActive])

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

  return (
    <div className="flex-1 p-2">
      <div className="w-full h-full border border-gray-200 rounded overflow-hidden">
        {isInspectorActive && (
          <div className="bg-blue-50 p-2 text-xs text-blue-700 border-b">
            <div className="flex items-center justify-between">
              <span>
                Inspector: {inspectorReady ? '✅ Ready' : '⏳ Initializing...'}
              </span>
              {selectedElement && (
                <span className="font-mono">
                  {selectedElement.tagName.toLowerCase()}
                  {selectedElement.id ? `#${selectedElement.id}` : ''}
                  {selectedElement.className ? `.${selectedElement.className.split(' ').join('.')}` : ''}
                </span>
              )}
            </div>
            
            {/* Debug logs */}
            <details className="mt-2">
              <summary className="cursor-pointer">Debug Logs</summary>
              <div className="mt-1 max-h-32 overflow-y-auto text-xs font-mono bg-white p-2 rounded">
                {logs.map((log, i) => (
                  <div key={i}>
                    [{log.timestamp}] {log.message}
                    {log.data && <pre className="text-gray-500">{JSON.stringify(log.data, null, 2)}</pre>}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
        
        <div className={isInspectorActive ? "h-[calc(100%-60px)]" : "h-full"}>
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            title="Website preview"
            onLoad={handleLoad}
            onError={handleError}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  )
}

export default SimpleWebserverPreview