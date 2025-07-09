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
    type: "baseNode",
    position: { x: 450, y: 200 },
    data: { label: "Mobile View", deviceType: "mobile" },
    style: { width: 375, height: 667 },
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
  }
]