import { MonitorSmartphone, Laptop, Tablet, Smartphone, List, ListChecks, Maximize2 } from "lucide-react"

export const DEVICE_SIZES = {
    desktop: { width: 1200, height: 800, icon: <MonitorSmartphone className="w-4 h-4" /> },
    laptop: { width: 1024, height: 768, icon: <Laptop className="w-4 h-4" /> },
    tablet: { width: 768, height: 1024, icon: <Tablet className="w-4 h-4" /> },
    mobile: { width: 375, height: 667, icon: <Smartphone className="w-4 h-4" /> },
}

export const CHECKLIST_SIZES = {
  compact: { width: 280, height: 200, icon: <List className="w-4 h-4" /> },
  normal: { width: 320, height: 300, icon: <ListChecks className="w-4 h-4" /> },
  expanded: { width: 400, height: 450, icon: <Maximize2 className="w-4 h-4" /> },
}