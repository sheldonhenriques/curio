// useNodeManagement.js - keeping the original logic, just fixing the property names
import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

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

  const updateViewport = useCallback((nodeId, viewport) => {
    updateNodeData(nodeId, { viewport });
  }, [updateNodeData]);

  const setViewportMode = useCallback((nodeId, mode) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node;
        
        // Find the preset for the selected mode
        const preset = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS.find(p => p.name.toLowerCase() === mode.toLowerCase());
        if (!preset) return node;
        
        const updates = { 
          screen: mode.toLowerCase(),
          viewport: {
            width: preset.width,
            height: preset.height
          }
        };
        
        // Calculate the appropriate node width based on mode
        const scale = 0.3;
        const nodeWidth = (preset.width * scale) + 20; // +20 for padding
        
        return { 
          ...node, 
          data: { ...node.data, ...updates },
          style: { ...node.style, width: nodeWidth }
        };
      })
    );
  }, [setNodes]);

  return {
    updateNodeData,
    deleteNode,
    toggleNodeFeature,
    setNodeState,
    updateViewport,
    setViewportMode,
    getNodes,
    getEdges
  };
};