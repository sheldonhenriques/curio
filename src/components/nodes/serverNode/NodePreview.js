// NodePreview.jsx - Updated with compact mode support
import React, { useMemo, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

const ErrorState = ({ isCompact = false }) => (
  <div className="flex-1 flex items-center justify-center bg-red-50">
    <div className="text-center text-red-600">
      <AlertCircle className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} mx-auto mb-1`} />
      <p className={`${isCompact ? 'text-[8px]' : 'text-[10px]'}`}>Failed to load</p>
    </div>
  </div>
);

const NodePreview = ({ node, nodeId, onLoadError, onLoadSuccess, isCompact = false }) => {
  const VIEWPORT_PRESETS = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS;
  
  const actualNodeId = node.id || nodeId;
  
  const handleLoad = useCallback(() => {
    onLoadSuccess?.(actualNodeId);
  }, [actualNodeId, onLoadSuccess]);

  const handleError = useCallback(() => {
    onLoadError?.(actualNodeId);
  }, [actualNodeId, onLoadError]);

  const { containerStyle, wrapperStyle } = useMemo(() => {
    const scale = 0.3;
    const sizeKey = (node.size || 'desktop').toLowerCase();
    const match = VIEWPORT_PRESETS.find(p => p.name.toLowerCase() === sizeKey);
    const viewportWidth = match?.width || 1280;
    const viewportHeight = match?.height || 800;
    
    return {
      containerStyle: {
        width: `${viewportWidth}px`,
        height: `${viewportHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
        border: '1px solid #e5e7eb',
        borderRadius: isCompact ? '2px' : '4px',
        overflow: 'hidden'
      },
      wrapperStyle: {
        width: `${viewportWidth * scale}px`,
        height: `${viewportHeight * scale}px`,
        overflow: 'hidden'
      }
    };
  }, [node.size, isCompact]);

  if (node.hasError) {
    return <ErrorState isCompact={isCompact} />;
  }

  const padding = isCompact ? 'p-0.5' : 'p-1';

  return (
    <div className={`h-full overflow-hidden ${padding}`}>
      <div className="w-full h-full flex justify-start">
        <div style={wrapperStyle}>
          <div style={containerStyle}>
            <iframe
              src={node.url}
              className="w-full h-full border-0"
              sandbox={WEB_BROWSER_CONFIG.IFRAME_SANDBOX_PERMISSIONS}
              title={`${node.size || 'desktop'} preview of ${node.title}`}
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