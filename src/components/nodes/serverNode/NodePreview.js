import React, { useMemo, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { getContainerStyle, getIframeStyle } from '@/utils/nodeHelpers';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

const ErrorState = () => (
  <div className="flex-1 flex items-center justify-center bg-red-50">
    <div className="text-center text-red-600">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      <p className="text-xs">Failed to load</p>
    </div>
  </div>
);

const IframePreview = ({ node, containerStyle, iframeStyle, onLoad, onError }) => (
  <div className="w-full h-full relative">
    {node.desktopMode ? (
      <div style={containerStyle}>
        <iframe
          src={node.url}
          className="w-full h-full border-0 rounded"
          style={iframeStyle}
          sandbox={WEB_BROWSER_CONFIG.IFRAME_SANDBOX_PERMISSIONS}
          title={`Desktop preview of ${node.title}`}
          onLoad={onLoad}
          onError={onError}
        />
      </div>
    ) : (
      <iframe
        src={node.url}
        className="w-full h-full border-0 rounded"
        sandbox={WEB_BROWSER_CONFIG.IFRAME_SANDBOX_PERMISSIONS}
        title={`Responsive preview of ${node.title}`}
        onLoad={onLoad}
        onError={onError}
      />
    )}
  </div>
);

const NodePreview = ({ node, onLoadError, onLoadSuccess }) => {
  const { containerStyle, iframeStyle } = useMemo(() => ({
    containerStyle: getContainerStyle(node.desktopMode, node.width, node.height),
    iframeStyle: getIframeStyle(node.desktopMode)
  }), [node.desktopMode, node.width, node.height]);

  const handleLoad = useCallback(() => {
    onLoadSuccess?.(node.id);
  }, [node.id, onLoadSuccess]);

  const handleError = useCallback(() => {
    onLoadError?.(node.id);
  }, [node.id, onLoadError]);

  if (node.hasError) {
    return <ErrorState />;
  }

  return (
    <div className="flex-1 overflow-hidden p-1">
      <IframePreview
        node={node}
        containerStyle={containerStyle}
        iframeStyle={iframeStyle}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

export default NodePreview;