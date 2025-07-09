// NodeHeader.jsx - Flexible height version
import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Server, Trash2, AlertCircle } from 'lucide-react';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

const NodeHeader = ({ node, onDelete, isCompact = false }) => {
  const VIEWPORT_PRESETS = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS;
  
  const getScreenModeDisplay = () => {
    const mode = node.size || 'desktop';
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };

  const getViewportDimensions = () => {
    const sizeKey = (node.size || 'desktop').toLowerCase();
    const match = VIEWPORT_PRESETS.find(p => p.name.toLowerCase() === sizeKey);
    return match ? `${match.width}×${match.height}` : '—';
  };

  // if (isCompact) {
  //   // Ultra-compact version for very small nodes
  //   return (
  //     <div className="flex items-center justify-between px-1 py-0.5 border-b bg-gray-50 rounded-t-lg flex-shrink-0">
  //       <div className="flex items-center gap-1 flex-1 min-w-0">
  //         <Server className="w-2 h-2 flex-shrink-0" />
  //         <span className="font-medium text-[9px] truncate">{node.title}</span>
  //       </div>
  //       <Button
  //         size="sm"
  //         variant="ghost"
  //         onClick={(e) => {
  //           e.stopPropagation();
  //           onDelete(node.id);
  //         }}
  //         className="h-3 w-3 p-0 hover:bg-red-100"
  //       >
  //         <Trash2 className="w-2 h-2" />
  //       </Button>
  //     </div>
  //   );
  // }

  return (
    <div className="flex items-center justify-between p-1.5 border-b bg-gray-50 rounded-t-lg flex-shrink-0">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Server className="w-3 h-3 flex-shrink-0" />
        <span className="font-medium text-[10px] truncate">{node.title}</span>
        
        {/* <Badge variant="outline" className="text-[9px] flex-shrink-0 px-0.5 py-0 h-3">
          {getScreenModeDisplay()}
        </Badge> */}
        
        {node.hasError && (
          <AlertCircle className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />
        )}
      </div>
      
      {/* <div className="flex items-center gap-1 flex-shrink-0">
        <Badge variant="secondary" className="text-[9px] px-0.5 py-0 h-3">
          {getViewportDimensions()}
        </Badge>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
          className="h-4 w-4 p-0 hover:bg-red-100"
        >
          <Trash2 className="w-2 h-2" />
        </Button>
      </div> */}
    </div>
  );
};

export default NodeHeader;
