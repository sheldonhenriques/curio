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
      url: "https://3000-8c9cfa1d-c054-4c29-84d6-d1eda254123a.proxy.daytona.work/",
      hasError: false,
    },
    style: { width: 1200, height: 800 },
  },
  {
    id: "5",
    type: "webserverNode",
    position: { x: 2550, y: 950 },
    data: {
      label: "/dashboard",
      deviceType: "desktop",
      url: "https://3000-8c9cfa1d-c054-4c29-84d6-d1eda254123a.proxy.daytona.work/about",
      hasError: false,
    },
    style: { width: 1200, height: 800 },
  }
]