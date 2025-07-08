import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Server, Trash2, AlertCircle } from 'lucide-react';
import { getViewportDisplayText } from '@/utils/nodeHelpers';

const NodeHeader = ({ node, onDelete }) => {
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(node.id);
  };

  return (
    <div className="flex items-center justify-between p-2 border-b bg-gray-50 rounded-t-lg">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Server className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium text-xs truncate">{node.title}</span>
        
        {node.desktopMode && (
          <Badge variant="outline" className="text-xs">
            Desktop
          </Badge>
        )}
        
        {node.hasError && (
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Badge variant="secondary" className="text-xs">
          {getViewportDisplayText(node)}
        </Badge>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDeleteClick}
          className="h-5 w-5 p-0"
          aria-label="Delete node"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default NodeHeader;