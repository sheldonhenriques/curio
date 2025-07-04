import React, { useState, useEffect } from 'react';

const WebBrowserFrame = ({ url, isLoading, title, onLoadComplete, onLoadError }) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setHasError(false);
    onLoadComplete?.();
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setHasError(true);
    setErrorMessage('Failed to load page. Site may not allow embedding.');
    onLoadError?.();
  };

  useEffect(() => {
    setIframeLoading(true);
    setHasError(false);
  }, [url]);

  return (
    <div className="relative h-48 bg-gray-100 border-y border-gray-200">
      {(isLoading || iframeLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}

      {hasError ? (
        <div className="h-full flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🚫</div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Can't load page</h3>
            <p className="text-xs text-gray-500">{errorMessage}</p>
            <button
              onClick={() => window.open(url, '_blank')}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Open in new tab
            </button>
          </div>
        </div>
      ) : (
        <iframe
          src={url}
          title={title}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          loading="lazy"
        />
      )}
    </div>
  );
};

export default WebBrowserFrame;