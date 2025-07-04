import { useState, useCallback } from 'react';

export const useWebBrowser = (initialData, nodeId) => {
  const [nodeData, setNodeData] = useState(initialData);

  const handleRefresh = useCallback(() => {
    setNodeData(prev => ({
      ...prev,
      isRefreshing: true,
      lastVisited: new Date().toLocaleString()
    }));

    // Simulate refresh delay
    setTimeout(() => {
      setNodeData(prev => ({
        ...prev,
        isRefreshing: false
      }));
    }, 1000);
  }, []);

  const handleUrlChange = useCallback((newUrl) => {
    setNodeData(prev => ({
      ...prev,
      url: newUrl,
      isLoading: true,
      lastVisited: new Date().toLocaleString()
    }));

    // Simulate loading
    setTimeout(() => {
      setNodeData(prev => ({
        ...prev,
        isLoading: false,
        title: `Page: ${new URL(newUrl).hostname}`,
        canGoBack: true
      }));
    }, 500);
  }, []);

  const handleNavigateBack = useCallback(() => {
    if (nodeData.canGoBack) {
      setNodeData(prev => ({
        ...prev,
        canGoBack: false,
        canGoForward: true,
        lastVisited: new Date().toLocaleString()
      }));
    }
  }, [nodeData.canGoBack]);

  const handleNavigateForward = useCallback(() => {
    if (nodeData.canGoForward) {
      setNodeData(prev => ({
        ...prev,
        canGoBack: true,
        canGoForward: false,
        lastVisited: new Date().toLocaleString()
      }));
    }
  }, [nodeData.canGoForward]);

  const handleToggleNotes = useCallback(() => {
    // Implement notes functionality
    console.log('Toggle notes for node:', nodeId);
  }, [nodeId]);

  return {
    nodeData,
    handleRefresh,
    handleUrlChange,
    handleNavigateBack,
    handleNavigateForward,
    handleToggleNotes
  };
};