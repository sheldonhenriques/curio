import { WEB_BROWSER_CONFIG } from '../constants/nodeConfig';

export const nodeHelpers = {
  calculateProgress: (items) => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter(item => item.completed).length;
    return Math.round((completed / items.length) * 100);
  },

  generateUniqueId: () => Date.now() + Math.random(),

  validateItemText: (text) => {
    return text && text.trim().length > 0;
  },

  formatItemText: (text) => {
    return text.trim().substring(0, 200); // Limit to 200 chars
  },
  
  validateUrl: (url) => {
    let cleanUrl = url.trim()
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "http://" + cleanUrl
    }
    
    try {
      new URL(cleanUrl)
      return cleanUrl
    } catch {
      throw new Error("Invalid URL format")
    }
  },
  
  generateNodeId: () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  getRandomPosition: () => ({
    x: Math.random() * 400 + 50,
    y: Math.random() * 300 + 50,
  })
};

export const calculateDesktopScale = (nodeWidth, nodeHeight) => {
  const availableWidth = nodeWidth - 20; // Account for padding
  const availableHeight = nodeHeight - 100; // Account for header/controls
  
  const scaleX = availableWidth / WEB_BROWSER_CONFIG.DEFAULT_DESKTOP_SIZE.width;
  const scaleY = availableHeight / WEB_BROWSER_CONFIG.DEFAULT_DESKTOP_SIZE.height;
  
  return Math.min(scaleX, scaleY, 1);
};

export const getIframeStyle = (desktopMode) => {
  if (!desktopMode) return {};
  
  return {
    transform: 'scale(0.5)',
    transformOrigin: '0 0',
    width: '200%',
    height: '200%'
  };
};

export const calculateScale = (nodeWidth, nodeHeight, viewport) => {
  const availableWidth = nodeWidth - 20; // Account for padding
  const availableHeight = nodeHeight - 100; // Account for header/controls
  
  const scaleX = availableWidth / viewport.width;
  const scaleY = availableHeight / viewport.height;
  
  return Math.min(scaleX, scaleY, 1);
};

export const getViewportDisplayText = (node) => {
  return `${node.viewport?.width || 1200}×${node.viewport?.height || 800}`;
};

export const getContainerStyle = (viewport, scale = 0.3) => {
  return {
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
    transform: `scale(${scale})`,
    transformOrigin: '0 0',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  };
};

export const getWrapperStyle = (viewport, scale = 0.3) => {
  return {
    width: `${viewport.width * scale}px`,
    height: `${viewport.height * scale}px`,
    overflow: 'hidden'
  };
};