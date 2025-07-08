import React, { useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import NodeHeader from '@/components/nodes/serverNode/NodeHeader';
import NodeControls from '@/components/nodes/serverNode/NodeControls';
import NodePreview from '@/components/nodes/serverNode/NodePreview';
import { useNodeData } from '@/hooks/useNodeData';
import { useNodeActions } from '@/hooks/useNodeActions';

const ServerNode = ({ data, selected, id }) => {
  const {
    nodeData,
    toggleDesktopMode,
    updateViewport,
    setErrorState,
    setSuccessState
  } = useNodeData(data);

  const {
    deleteNode,
    toggleDesktopModeInFlow,
    updateViewportInFlow,
    setErrorStateInFlow,
    setSuccessStateInFlow
  } = useNodeActions();

  const handleDelete = useCallback((nodeId) => {
    deleteNode(nodeId);
  }, [deleteNode]);

  const handleToggleDesktopMode = useCallback((nodeId) => {
    toggleDesktopMode();
    toggleDesktopModeInFlow(nodeId, nodeData.desktopMode);
  }, [toggleDesktopMode, toggleDesktopModeInFlow, nodeData.desktopMode]);

  const handleUpdateViewport = useCallback((nodeId, viewport) => {
    updateViewport(viewport);
    updateViewportInFlow(nodeId, viewport);
  }, [updateViewport, updateViewportInFlow]);

  const handleLoadError = useCallback((nodeId) => {
    setErrorState();
    setErrorStateInFlow(nodeId);
  }, [setErrorState, setErrorStateInFlow]);

  const handleLoadSuccess = useCallback((nodeId) => {
    setSuccessState();
    setSuccessStateInFlow(nodeId);
  }, [setSuccessState, setSuccessStateInFlow]);

  return (
    <div className="bg-white border-2 rounded-lg shadow-lg flex flex-col min-h-0">
      {/* React Flow connection handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
    <NodeHeader node={nodeData} onDelete={handleDelete} />
      
      {/* Node controls - only shown when selected */}
      {selected && (
          <NodeControls
            node={nodeData}
            onToggleDesktopMode={handleToggleDesktopMode}
            onUpdateViewport={handleUpdateViewport}
          />
      )}
      
      {/* Main preview area - allow dragging on iframe container */}
      <NodePreview
        node={nodeData}
        onLoadError={handleLoadError}
        onLoadSuccess={handleLoadSuccess}
      />
    </div>
  );
};

export default ServerNode;