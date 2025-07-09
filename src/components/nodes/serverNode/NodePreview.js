import React, { useMemo, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

const ErrorState = () => (
  <div className="flex-1 flex items-center justify-center bg-red-50">
    <div className="text-center text-red-600">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      <p className="text-xs">Failed to load</p>
    </div>
  </div>
);

const NodePreview = ({ node, onLoadError, onLoadSuccess }) => {
  const VIEWPORT_PRESETS = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS;
  const handleLoad = useCallback(() => {
    onLoadSuccess?.(node.id);
  }, [node.id, onLoadSuccess]);

  const handleError = useCallback(() => {
    onLoadError?.(node.id);
  }, [node.id, onLoadError]);

  const { containerStyle, wrapperStyle } = useMemo(() => {
    const scale = 0.3;
    const sizeKey = (node.size || 'desktop').toLowerCase();
    const match = VIEWPORT_PRESETS.find(p => p.name.toLowerCase() === sizeKey);
    const viewportWidth = match?.width || 1280;
    const viewportHeight = match?.height || 800;
    
    return {
      // This is the actual iframe container
      containerStyle: {
        width: `${viewportWidth}px`,
        height: `${viewportHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden'
      },
      // This wrapper contains the scaled iframe and defines the visible area
      wrapperStyle: {
        width: `${viewportWidth * scale}px`,
        height: `${viewportHeight * scale}px`,
        overflow: 'hidden'
      }
    };
  }, [node.size]);

  if (node.hasError) {
    return <ErrorState />;
  }

  return (
    <div className="flex-1 overflow-hidden p-2">
      <div className="w-full h-full flex justify-start">
        <div style={wrapperStyle}>
          <div style={containerStyle}>
            <iframe
              src={node.url}
              className="w-full h-full border-0"
              sandbox={WEB_BROWSER_CONFIG.IFRAME_SANDBOX_PERMISSIONS}
              title={`${node.screen || 'desktop'} preview of ${node.title}`}
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodePreview;