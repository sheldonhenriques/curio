export const initialNodes = [
  {
    id: "1",
    type: "baseNode",
    position: { x: 100, y: 100 },
    data: { label: "Desktop View", deviceType: "desktop" },
    style: { width: 1200, height: 800 },
  },
  {
    id: "2",
    type: "aichatNode",
    position: { x: 450, y: 950 },
    data: {
      label: "AI Chat",
      deviceType: "normal",
    },
    style: { width: 480, height: 600 },
    zIndex: 9999,
  },
  {
    id: "3",
    type: "checklistNode",
    position: { x: 100, y: 950 },
    data: {
      label: "Project Tasks",
      deviceType: "normal",
      checklistItems: [
        { id: 1, text: "Design wireframes", completed: true },
        { id: 2, text: "Implement components", completed: false },
        { id: 3, text: "Write tests", completed: false },
      ],
    },
    style: { width: 320, height: 300 },
  },
  {
    id: "4",
    type: "webserverNode",
    position: { x: 1350, y: 950 },
    data: {
      label: "/dashboard",
      deviceType: "desktop",
      url: "https://3000-8a68fc00-fcd4-4170-a625-3242aa7fd6b1.proxy.daytona.work/",
      hasError: false,
    },
    style: { width: 1200, height: 800 },
  }
]