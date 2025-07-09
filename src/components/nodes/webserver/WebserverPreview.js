"use client"

import { useCallback } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

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

const WebserverPreview = ({ url, hasError, onLoadError, onLoadSuccess, onRetry }) => {
  const handleLoad = useCallback(() => {
    onLoadSuccess?.()
  }, [onLoadSuccess])

  const handleError = useCallback(() => {
    onLoadError?.()
  }, [onLoadError])

  if (hasError) {
    return <ErrorState onRetry={onRetry} />
  }

  return (
    <div className="flex-1 p-2">
      <div className="w-full h-full border border-gray-200 rounded overflow-hidden">
        <iframe
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
