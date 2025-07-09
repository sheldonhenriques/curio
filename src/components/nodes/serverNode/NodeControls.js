// NodeControls.jsx - Floating controls above the node
import React from 'react';
import { Button } from '@/components/ui/Button';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

const NodeControls = ({ node, onSetViewportMode, nodeId, isVisible = false }) => {
  const actualNodeId = node.id || nodeId;
  const currentMode = node.size || 'desktop';
  const match = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS.find(p => p.name.toLowerCase() === currentMode.toLowerCase());
  const dimensions = match ? `${match.width}×${match.height}` : '—';
  
  // Don't render if not visible
  if (!isVisible) return null;
  
  return (
    <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 z-[100] bg-white/98 backdrop-blur-sm border border-gray-300 rounded-lg shadow-xl animate-in fade-in-0 slide-in-from-top-2 duration-200 min-w-max">
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[10px] text-gray-600 font-medium">Viewport:</span>
          <span className="text-[10px] text-gray-500">
            {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} ({dimensions})
          </span>
        </div>
        <div className="flex gap-1">
          {WEB_BROWSER_CONFIG.VIEWPORT_PRESETS.map((preset) => {
            const presetMode = preset.name.toLowerCase();
            const isActive = currentMode.toLowerCase() === presetMode;
            
            return (
              <Button
                key={preset.name}
                size="sm"
                variant={isActive ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetViewportMode(actualNodeId, presetMode);
                }}
                className="h-6 px-2 text-[10px] min-w-0 whitespace-nowrap"
              >
                <preset.icon className="w-2.5 h-2.5 mr-1" />
                {preset.name}
              </Button>
            );
          })}
        </div>
      </div>
      {/* Arrow pointing down to the node */}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-300 rotate-45"></div>
    </div>
  );
};

export default NodeControls;