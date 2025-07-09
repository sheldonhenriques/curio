// useNodeManagement.js - Updated with better sizing
import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';

export const useNodeManagement = () => {
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();
  
  const updateNodeData = useCallback((nodeId, updates) => {
    console.log('🔄 updateNodeData called:', {
      nodeId,
      updates,
      currentNodes: getNodes().find(n => n.id === nodeId)?.data
    });
    
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          const newNode = { ...node, data: { ...node.data, ...updates } };
          console.log('✅ Node updated:', {
            nodeId,
            oldData: node.data,
            newData: newNode.data,
            updates
          });
          return newNode;
        }
        return node;
      })
    );
  }, [setNodes, getNodes]);
  
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
    console.log('🎯 setViewportMode in hook called:', {
      nodeId,
      mode,
      currentNodes: getNodes().length
    });
    
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node;
        
        console.log('🔍 Processing node:', {
          nodeId,
          currentData: node.data,
          mode
        });
        
        // Find the preset for the selected mode
        const preset = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS.find(p => p.name.toLowerCase() === mode.toLowerCase());
        if (!preset) {
          console.log('❌ No preset found for mode:', mode);
          return node;
        }
        
        // Use tighter sizing calculation
        const scale = 0.3;
        const headerHeight = 40;
        const nodeWidth = (preset.width * scale) + 16; // Reduced padding
        const nodeHeight = (preset.height * scale) + headerHeight + 8; // Minimal extra height
        
        const updates = { 
          size: mode.toLowerCase(),
          viewport: {
            width: preset.width,
            height: preset.height
          }
        };
        
        console.log('📊 Applying updates:', {
          preset,
          updates,
          calculatedNodeWidth: nodeWidth,
          calculatedNodeHeight: nodeHeight
        });
        
        const newNode = { 
          ...node, 
          data: { ...node.data, ...updates },
          style: { 
            ...node.style, 
            width: nodeWidth,
            height: nodeHeight,
            minWidth: Math.max(WEB_BROWSER_CONFIG.MIN_WIDTH, nodeWidth),
            minHeight: nodeHeight
          }
        };
        
        console.log('✅ Node transformed:', {
          nodeId,
          oldData: node.data,
          newData: newNode.data,
          oldStyle: node.style,
          newStyle: newNode.style
        });
        
        return newNode;
      })
    );
  }, [setNodes, getNodes]);
  
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