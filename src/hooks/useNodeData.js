import { useState, useCallback } from 'react';

export const useNodeData = (initialData) => {
  const [nodeData, setNodeData] = useState(initialData);

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