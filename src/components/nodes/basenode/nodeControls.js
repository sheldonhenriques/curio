"use client"

import { Copy, Trash2, Monitor, ChevronDown } from "lucide-react"
import { DEVICE_SIZES, CHECKLIST_SIZES } from "@/constants/node"

export default function NodeControls({
    currentDeviceType,
    showSizeDropdown,
    setShowSizeDropdown,
    handleDuplicate,
    handleDelete,
    handleSizeChange,
    setIsHovered,
    hoverTimeoutRef,
    nodeType = "baseNode",
}) {
    const sizeOptions = nodeType === "checklistNode" ? CHECKLIST_SIZES : DEVICE_SIZES

    return (
        <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 rounded-md shadow-lg px-2 py-1 flex gap-1 z-50"
            onMouseEnter={() => {
                if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                }
                setIsHovered(true)
            }}
            onMouseLeave={() => {
                hoverTimeoutRef.current = setTimeout(() => {
                    setIsHovered(false)
                    setShowSizeDropdown(false)
                }, 200)
            }}
        >
            <button
                onClick={handleDuplicate}
                className="p-1 text-white hover:bg-gray-700 rounded transition-colors"
                title="Duplicate"
            >
                <Copy className="w-3.5 h-3.5" />
            </button>

            <div className="relative">
                <button
                    onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                    className="p-1 text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
                    title="Change Size"
                >
                    <Monitor className="w-3.5 h-3.5" />
                    <ChevronDown className="w-2.5 h-2.5" />
                </button>

                {showSizeDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[140px] z-60">
                        {Object.entries(sizeOptions).map(([deviceType, config]) => (
                            <button
                                key={deviceType}
                                onClick={() => handleSizeChange(deviceType)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${currentDeviceType === deviceType ? "bg-blue-50 text-blue-600" : "text-gray-700"
                                    }`}
                            >
                                <span className="flex-shrink-0">{config.icon}</span>
                                <span className="capitalize flex-1">{deviceType}</span>
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                    {config.width}×{config.height}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={handleDelete}
                className="p-1 text-white hover:bg-red-600 rounded transition-colors"
                title="Delete"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
