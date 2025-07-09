import { useState, useCallback, useEffect } from 'react';

export const useNodeData = (externalData) => {
  const [nodeData, setNodeData] = useState(externalData);

  // sync with prop if it changes
  useEffect(() => {
    setNodeData(externalData);
  }, [externalData]);

  const updateNodeData = useCallback((updates) => {
    setNodeData(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleDesktopMode = useCallback(() => {
    setNodeData(prev => ({
      ...prev,
      desktopMode: !prev.desktopMode
    }));
  }, []);

  const updateViewport = useCallback((viewport) => {
    setNodeData(prev => ({
      ...prev,
      viewport
    }));
  }, []);

  const setLoadingState = useCallback((isLoading) => {
    setNodeData(prev => ({
      ...prev,
      isLoading,
      hasError: false
    }));
  }, []);

  const setErrorState = useCallback(() => {
    setNodeData(prev => ({
      ...prev,
      hasError: true,
      isLoading: false
    }));
  }, []);

  const setSuccessState = useCallback(() => {
    setNodeData(prev => ({
      ...prev,
      hasError: false,
      isLoading: false
    }));
  }, []);

  return {
    nodeData,
    updateNodeData,
    toggleDesktopMode,
    updateViewport,
    setLoadingState,
    setErrorState,
    setSuccessState
  };
};
