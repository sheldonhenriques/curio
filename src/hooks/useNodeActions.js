import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';

export const useNodeActions = () => {
  const { setNodes } = useReactFlow();

  const deleteNode = useCallback((nodeId) => {
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
  }, [setNodes]);

  const updateNodeInFlow = useCallback((nodeId, updates) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updates
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const toggleDesktopModeInFlow = useCallback((nodeId, currentDesktopMode) => {
    updateNodeInFlow(nodeId, { desktopMode: !currentDesktopMode });
  }, [updateNodeInFlow]);

  const updateViewportInFlow = useCallback((nodeId, viewport) => {
    updateNodeInFlow(nodeId, { viewport });
  }, [updateNodeInFlow]);

  const setLoadingStateInFlow = useCallback((nodeId, isLoading) => {
    updateNodeInFlow(nodeId, { isLoading, hasError: false });
  }, [updateNodeInFlow]);

  const setErrorStateInFlow = useCallback((nodeId) => {
    updateNodeInFlow(nodeId, { hasError: true, isLoading: false });
  }, [updateNodeInFlow]);

  const setSuccessStateInFlow = useCallback((nodeId) => {
    updateNodeInFlow(nodeId, { hasError: false, isLoading: false });
  }, [updateNodeInFlow]);

  return {
    deleteNode,
    updateNodeInFlow,
    toggleDesktopModeInFlow,
    updateViewportInFlow,
    setLoadingStateInFlow,
    setErrorStateInFlow,
    setSuccessStateInFlow
  };
};