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
  }
};

export const defaultWebNodeData = {
  url: 'about:blank',
  title: 'New Tab',
  lastVisited: new Date().toLocaleString(),
  favicon: '🌐',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  isRefreshing: false
};

export const createWebBrowserNode = (position = { x: 0, y: 0 }, customData = {}) => {
  return {
    id: `web-${Date.now()}`,
    type: 'webBrowser',
    position,
    data: {
      ...defaultWebNodeData,
      ...customData
    }
  };
};

export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return 'Invalid URL';
  }
};