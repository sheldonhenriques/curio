// NodeHeader.jsx
import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Server, Trash2, AlertCircle } from 'lucide-react';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

const NodeHeader = ({ node, onDelete }) => {
  const VIEWPORT_PRESETS = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS;
  const getScreenModeDisplay = () => {
    const mode = node.screen || 'desktop';
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };

  const getViewportDimensions = () => {
    const sizeKey = (node.size || 'desktop').toLowerCase();
    const match = VIEWPORT_PRESETS.find(p => p.name.toLowerCase() === sizeKey);
    return match ? `${match.width}×${match.height}` : '—';
  };

  return (
    <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg flex-shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Server className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium text-sm truncate">{node.title}</span>
        
        <Badge variant="outline" className="text-xs flex-shrink-0">
          {getScreenModeDisplay()}
        </Badge>
        
        {node.hasError && (
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        )}
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <Badge variant="secondary" className="text-xs">
          {getViewportDimensions()}
        </Badge>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
          className="h-6 w-6 p-0"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default NodeHeader;