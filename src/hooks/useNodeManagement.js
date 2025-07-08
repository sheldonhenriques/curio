import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';

export const useNodeManagement = () => {
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();

  const updateNodeData = useCallback((nodeId, updates) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [setNodes]);

  const deleteNode = useCallback((nodeId) => {
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
    setEdges((edges) => 
      edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );
  }, [setNodes, setEdges]);

  const toggleNodeFeature = useCallback((nodeId, featureName, value) => {
    updateNodeData(nodeId, { [featureName]: value });
  }, [updateNodeData]);

  const setNodeState = useCallback((nodeId, state) => {
    updateNodeData(nodeId, { state });
  }, [updateNodeData]);

  return {
    updateNodeData,
    deleteNode,
    toggleNodeFeature,
    setNodeState,
    getNodes,
    getEdges
  };
};