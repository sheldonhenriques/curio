// NodeControls.jsx
import React from 'react';
import { Button } from '@/components/ui/Button';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

const NodeControls = ({ node, onSetViewportMode }) => {
  const currentMode = node.size || 'desktop';

  const match = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS.find(p => p.name.toLowerCase() === currentMode.toLowerCase());
  const dimensions = match ? `${match.width}×${match.height}` : '—';
  
  return (
    <div className="p-2 border-b bg-blue-50 flex-shrink-0 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 font-medium">Viewport:</span>
        <span className="text-xs text-gray-500">
          Current: {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} ({dimensions})
        </span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {WEB_BROWSER_CONFIG.VIEWPORT_PRESETS.map((preset) => {
          const presetMode = preset.name.toLowerCase();
          const isActive = currentMode === presetMode;
          
          return (
            <Button
              key={preset.name}
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                onSetViewportMode(node.id, presetMode);
              }}
              className="h-6 px-2 text-xs"
            >
              <preset.icon className="w-3 h-3 mr-1" />
              {preset.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default NodeControls;