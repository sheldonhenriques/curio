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

export const getContainerStyle = (isDesktopMode, nodeWidth, nodeHeight) => {
  if (isDesktopMode) {
    const scale = calculateDesktopScale(nodeWidth, nodeHeight);
    
    return {
      width: WEB_BROWSER_CONFIG.DEFAULT_DESKTOP_SIZE.width,
      height: WEB_BROWSER_CONFIG.DEFAULT_DESKTOP_SIZE.height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left'
    };
  }
  
  return {
    width: '100%',
    height: '100%'
  };
};

export const getIframeStyle = (isDesktopMode) => {
  if (isDesktopMode) {
    return {
      width: WEB_BROWSER_CONFIG.DEFAULT_DESKTOP_SIZE.width,
      height: WEB_BROWSER_CONFIG.DEFAULT_DESKTOP_SIZE.height
    };
  }
  
  return {};
};

export const getViewportDisplayText = (node) => {
  if (node.desktopMode) {
    return `${WEB_BROWSER_CONFIG.DEFAULT_DESKTOP_SIZE.width}×${WEB_BROWSER_CONFIG.DEFAULT_DESKTOP_SIZE.height}`;
  }
  
  return `${node.viewport.width}×${node.viewport.height}`;
};