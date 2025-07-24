"use client"

import { useCallback, useEffect, useRef } from "react"
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react"

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

const WebserverPreview = ({ url, hasError, onLoadError, onLoadSuccess, onRetry, sandboxStatus, isSelectModeActive, onElementSelected, onUpdateElement }) => {
  const iframeRef = useRef(null)
  const handleLoad = useCallback(() => {
    onLoadSuccess?.()
  }, [onLoadSuccess])

  const handleError = useCallback(() => {
    onLoadError?.()
  }, [onLoadError])

  // Handle messages from iframe
  const handleMessage = useCallback((event) => {
    try {
      // Check if this is a Visual Editor message
      if (event.data && typeof event.data === 'object' && event.data.type && 
          (event.data.type.startsWith('VISUAL_EDITOR') || 
           event.data.type === 'ELEMENT_SELECTED' || 
           event.data.type === 'SELECT_MODE_ACTIVATED' || 
           event.data.type === 'SELECT_MODE_DEACTIVATED' ||
           event.data.type === 'ELEMENT_UPDATED' ||
           event.data.type === 'TEXT_CONTENT_UPDATED' ||
           event.data.type === 'TEXT_UPDATE_ERROR')) {
        const { type, element, error } = event.data

        switch (type) {
          case 'VISUAL_EDITOR_READY':
            break
          case 'SELECT_MODE_ACTIVATED':
            break
          case 'SELECT_MODE_DEACTIVATED':
            break
          case 'ELEMENT_SELECTED':
            onElementSelected?.(element)
            break
          case 'ELEMENT_UPDATED':
            break
          case 'TEXT_CONTENT_UPDATED':
            console.log('Text content updated successfully in iframe:', event.data.newText)
            break
          case 'TEXT_UPDATE_ERROR':
            console.error('Text update error from iframe:', error)
            break
          default:
            break
        }
      }
    } catch (error) {
      console.error('Error handling iframe message:', error)
    }
  }, [onElementSelected])

  // Send message to iframe
  const sendToIframe = useCallback((message) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(message, '*')
      } catch (error) {
        console.error('Error sending message to iframe:', error)
      }
    }
  }, [])

  // Listen for messages from iframe
  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  // Send select mode changes to iframe
  useEffect(() => {
    if (isSelectModeActive) {
      sendToIframe({ type: 'ACTIVATE_SELECT_MODE' })
    } else {
      sendToIframe({ type: 'DEACTIVATE_SELECT_MODE' })
    }
  }, [isSelectModeActive, sendToIframe])

  // Expose method to send property updates to iframe
  const sendPropertyUpdate = useCallback((property, value, visualId) => {
    const message = {
      type: 'UPDATE_ELEMENT_PROPERTY',
      data: {
        property,
        value,
        visualId,
        action: determineUpdateAction(property, value)
      }
    }
    sendToIframe(message)
  }, [sendToIframe])

  const determineUpdateAction = (property, value) => {
    if (property === 'textContent') {
      return 'UPDATE_TEXT_CONTENT'
    } else if (property.startsWith('data-') || property === 'src' || property === 'href') {
      return 'UPDATE_ATTRIBUTE'
    } else {
      return 'UPDATE_TAILWIND_CLASS'
    }
  }

  // Expose sendPropertyUpdate via ref or callback
  useEffect(() => {
    if (onUpdateElement) {
      onUpdateElement(sendPropertyUpdate)
    }
  }, [onUpdateElement, sendPropertyUpdate])

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
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          title="Website preview"
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  )
}

export default WebserverPreview
