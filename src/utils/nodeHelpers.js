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

export const calculateNodeDimensions = (preset, scale = 0.3) => {
  const headerHeight = 40;
  return {
    width: (preset.width * scale) + 16,
    height: (preset.height * scale) + headerHeight + 8
  };
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