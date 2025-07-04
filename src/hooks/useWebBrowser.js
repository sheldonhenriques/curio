import { useState, useCallback } from 'react';

export const useWebBrowser = (initialData, nodeId) => {
  const [nodeData, setNodeData] = useState(initialData);

  const handleRefresh = useCallback(() => {
    setNodeData(prev => ({
      ...prev,
      isRefreshing: true,
      lastVisited: new Date().toLocaleString()
    }));

    // Force iframe reload by changing URL slightly
    const currentUrl = nodeData.url;
    const separator = currentUrl.includes('?') ? '&' : '?';
    const refreshUrl = `${currentUrl}${separator}_refresh=${Date.now()}`;
    
    setNodeData(prev => ({
      ...prev,
      url: refreshUrl,
      isLoading: true
    }));

    setTimeout(() => {
      setNodeData(prev => ({
        ...prev,
        isRefreshing: false
      }));
    }, 1000);
  }, [nodeData.url]);

  const handleUrlChange = useCallback((newUrl) => {
    // Validate URL format
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      newUrl = 'https://' + newUrl;
    }

    setNodeData(prev => ({
      ...prev,
      url: newUrl,
      isLoading: true,
      lastVisited: new Date().toLocaleString()
    }));
  }, []);

  const handleLoadComplete = useCallback(() => {
    setNodeData(prev => ({
      ...prev,
      isLoading: false,
      canGoBack: true
    }));
  }, []);

  const handleLoadError = useCallback(() => {
    setNodeData(prev => ({
      ...prev,
      isLoading: false
    }));
  }, []);

  const handleNavigateBack = useCallback(() => {
    if (nodeData.canGoBack) {
      // In a real implementation, you'd need to track history
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
    console.log('Toggle notes for node:', nodeId);
  }, [nodeId]);

  return {
    nodeData,
    handleRefresh,
    handleUrlChange,
    handleNavigateBack,
    handleNavigateForward,
    handleToggleNotes,
    handleLoadComplete,
    handleLoadError
  };
};