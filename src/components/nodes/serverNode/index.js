import React, { useCallback } from 'react';
import BaseNodeWrapper from '@/components/nodes/base/BaseNodeWrapper';
import NodeHeader from '@/components/nodes/serverNode/NodeHeader';
import NodeControls from '@/components/nodes/serverNode/NodeControls';
import NodePreview from '@/components/nodes/serverNode/NodePreview';
import { useNodeData } from '@/hooks/useNodeData';
import { useNodeManagement } from '@/hooks/useNodeManagement';

const ServerNode = ({ data, selected, id }) => {
  const { nodeData } = useNodeData(data);
  const { updateNodeData, deleteNode, toggleNodeFeature, setNodeState } = useNodeManagement();

  const handleToggleDesktopMode = useCallback(() => {
    toggleNodeFeature(id, 'desktopMode', !nodeData.desktopMode);
  }, [id, nodeData.desktopMode, toggleNodeFeature]);

  const handleUpdateViewport = useCallback((viewport) => {
    updateNodeData(id, { viewport });
  }, [id, updateNodeData]);

  const handleLoadError = useCallback(() => {
    setNodeState(id, 'error');
  }, [id, setNodeState]);

  const handleLoadSuccess = useCallback(() => {
    setNodeState(id, 'success');
  }, [id, setNodeState]);

  return (
    <BaseNodeWrapper
      id={id}
      data={data}
      selected={selected}
      className="border-2 flex flex-col min-h-0"
      onDelete={deleteNode}
      onToggleFeature={toggleNodeFeature}
      onUpdateData={updateNodeData}
      onStateChange={setNodeState}
    >
      {({ handleDelete, handleToggleFeature, handleUpdateData, handleStateChange }) => (
        <>
          <NodeHeader node={nodeData} onDelete={handleDelete} />

          {/* Node controls - only shown when selected */}
          {selected && (
            <NodeControls
              node={nodeData}
              onToggleDesktopMode={handleToggleDesktopMode}
              onUpdateViewport={handleUpdateViewport}
            />
          )}

          {/* Main preview area */}
          <NodePreview
            node={nodeData}
            onLoadError={handleLoadError}
            onLoadSuccess={handleLoadSuccess}
          />
        </>
      )}
    </BaseNodeWrapper>
  );
};

export default ServerNode;