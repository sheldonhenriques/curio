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