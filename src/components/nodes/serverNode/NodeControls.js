import React from 'react';
import { Button } from '@/components/ui/Button';
import { Maximize2 } from 'lucide-react';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

const NodeControls = ({ node, onToggleDesktopMode, onUpdateViewport }) => {
  const handleDesktopToggle = (e) => {
    e.stopPropagation();
    onToggleDesktopMode(node.id);
  };

  const handleViewportChange = (preset) => (e) => {
    e.stopPropagation();
    onUpdateViewport(node.id, {
      width: preset.width,
      height: preset.height
    });
  };

  return (
    <div className="p-2 border-b bg-blue-50 space-y-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={node.desktopMode ? "default" : "outline"}
          onClick={handleDesktopToggle}
          className="h-6 px-2 text-xs"
        >
          <Maximize2 className="w-3 h-3 mr-1" />
          Desktop
        </Button>
        
        <span className="text-xs text-gray-500">
          {node.desktopMode ? "Desktop layout" : "Responsive"}
        </span>
      </div>

      {!node.desktopMode && (
        <div className="flex gap-1 flex-wrap">
          {WEB_BROWSER_CONFIG.VIEWPORT_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              size="sm"
              variant={node.viewport.width === preset.width ? "default" : "outline"}
              onClick={handleViewportChange(preset)}
              className="h-6 px-2 text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NodeControls;