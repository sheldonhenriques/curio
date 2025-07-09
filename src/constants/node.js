import {
    MonitorSmartphone,
    Laptop,
    Tablet,
    Smartphone
} from "lucide-react"

export const DEVICE_SIZES = {
    desktop: { width: 1200, height: 800, icon: <MonitorSmartphone className="w-4 h-4" /> },
    laptop: { width: 1024, height: 768, icon: <Laptop className="w-4 h-4" /> },
    tablet: { width: 768, height: 1024, icon: <Tablet className="w-4 h-4" /> },
    mobile: { width: 375, height: 667, icon: <Smartphone className="w-4 h-4" /> },
}