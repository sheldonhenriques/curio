import {
  Monitor,
  Smartphone,
  Tablet
} from "lucide-react"

export const CHECKLIST_CONFIG = {
  MIN_WIDTH: 300,
  MIN_HEIGHT: 200,
  MAX_HEIGHT: 400,
  MAX_ITEMS: 50,
  RESIZE_COLOR: '#3b82f6',
  PROGRESS_COLOR: '#3b82f6',
  DELETE_COLOR: '#ef4444',
  ANIMATION_DURATION: 200,
  SIZES: {
    EXTRA_SMALL: { width: 300 },
    SMALL: { width: 400 },
    MEDIUM: { width: 500 },
    LARGE: { width: 640 },
    EXTRA_LARGE: { width: 720 }
  },
};

export const WEB_BROWSER_CONFIG = {
  DEFAULT_DESKTOP_SIZE: {
    width: 1920,
    height: 1080
  },
  VIEWPORT_PRESETS: [
    { name: "Desktop", icon: Monitor, width: 1920, height: 1080 },
    { name: "Laptop", icon: Monitor, width: 1024, height: 768 },
    { name: "Tablet", icon: Tablet, width: 768, height: 1024 },
    { name: "Mobile", icon: Smartphone, width: 375, height: 667 },
  ],
  IFRAME_SANDBOX_PERMISSIONS: "allow-same-origin allow-scripts allow-forms allow-popups"
};