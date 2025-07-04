export const checklistNodes = [
  {
    id: 'checklist-1',
    type: 'checklist',
    position: { x: 100, y: 100 },
    data: {
      title: 'Strategic Goals',
      items: [
        { id: 1, text: 'Increase market share by 15%', completed: false },
        { id: 2, text: 'Improve user retention by 20%', completed: false },
        { id: 3, text: 'Launch 3 new product initiatives', completed: true },
        { id: 4, text: 'Expand to enterprise market', completed: false }
      ]
    }
  },
  {
    id: 'checklist-2',
    type: 'checklist',
    position: { x: 450, y: 100 },
    data: {
      title: 'Strategic Goals',
      items: [
        { id: 1, text: 'Increase market share by 15%', completed: false },
        { id: 2, text: 'Improve user retention by 20%', completed: false },
        { id: 3, text: 'Launch 3 new product initiatives', completed: true },
        { id: 4, text: 'Expand to enterprise market', completed: false }
      ]
    }
  },
  {
    id: 'checklist-3',
    type: 'checklist',
    position: { x: 450, y: 450 },
    data: {
      title: 'Strategic Goals',
      items: [
        { id: 1, text: 'Increase market share by 15%', completed: false },
        { id: 2, text: 'Improve user retention by 20%', completed: false },
        { id: 3, text: 'Launch 3 new product initiatives', completed: true },
        { id: 4, text: 'Expand to enterprise market', completed: false }
      ]
    }
  },
  {
    id: 'web-1',
    type: 'webBrowser',
    position: { x: 100, y: 450 },
    data: {
      url: 'https://docs.github.com/en',
      title: 'Product Documentation',
      lastVisited: '7/3/2025 10:20 AM',
      favicon: '🌐',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isRefreshing: false
    }
  }
];