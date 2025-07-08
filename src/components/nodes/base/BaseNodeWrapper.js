import React, { useCallback, useMemo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';

const BaseNodeWrapper = ({
  children,
  selected,
  id,
  data,
  className = '',
  style = {},
  handles = [],
  resizable = false,
  resizeConfig = {},
  onResize,
  onNodeChange,
  onDelete,
  // Common event handlers
  onToggleFeature,
  onUpdateData,
  onStateChange,
  ...props
}) => {
  const defaultHandles = [
    { type: 'target', position: Position.Top },
    { type: 'source', position: Position.Bottom },
    { type: 'target', position: Position.Left },
    { type: 'source', position: Position.Right }
  ];

  const activeHandles = handles.length > 0 ? handles : defaultHandles;

  // Common event handlers that can be reused across nodes
  const handleToggleFeature = useCallback((featureName, currentValue) => {
    if (onToggleFeature) {
      onToggleFeature(id, featureName, !currentValue);
    }
    if (onNodeChange) {
      onNodeChange(id, { [featureName]: !currentValue });
    }
  }, [id, onToggleFeature, onNodeChange]);

  const handleUpdateData = useCallback((updates) => {
    if (onUpdateData) {
      onUpdateData(id, updates);
    }
    if (onNodeChange) {
      onNodeChange(id, updates);
    }
  }, [id, onUpdateData, onNodeChange]);

  const handleStateChange = useCallback((newState) => {
    if (onStateChange) {
      onStateChange(id, newState);
    }
    if (onNodeChange) {
      onNodeChange(id, newState);
    }
  }, [id, onStateChange, onNodeChange]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(id);
    }
  }, [id, onDelete]);

  // Memoized node context to pass to children
  const nodeContext = useMemo(() => ({
    id,
    data,
    selected,
    handleToggleFeature,
    handleUpdateData,
    handleStateChange,
    handleDelete
  }), [id, data, selected, handleToggleFeature, handleUpdateData, handleStateChange, handleDelete]);

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-gray-200 relative ${className}`}
      style={style}
      {...props}
    >
      {/* Connection Handles */}
      {activeHandles.map((handle, index) => (
        <Handle
          key={`${handle.type}-${handle.position}-${index}`}
          type={handle.type}
          position={handle.position}
          id={handle.id}
          style={handle.style}
        />
      ))}

      {/* Node Resizer */}
      {resizable && (
        <NodeResizer
          color={resizeConfig.color || '#ff0071'}
          isVisible={selected}
          minWidth={resizeConfig.minWidth}
          minHeight={resizeConfig.minHeight}
          onResize={onResize}
          {...resizeConfig}
        />
      )}

      {/* Node Content with Context */}
      {typeof children === 'function' ? children(nodeContext) : children}
    </div>
  );
};

export default BaseNodeWrapper;