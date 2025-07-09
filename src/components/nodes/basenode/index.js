"use client"

import { useState, useRef, useCallback } from "react"
import { Handle, Position, useReactFlow } from "reactflow"
import { DEVICE_SIZES } from '@/constants/node'
import NodeControls from "@/components/nodes/basenode/nodeControls"

export default function BaseNode({ id, data, selected }) {
    const [isHovered, setIsHovered] = useState(false)
    const [showSizeDropdown, setShowSizeDropdown] = useState(false)
    const hoverTimeoutRef = useRef(null)
    const nodeRef = useRef(null)
    const { setNodes, getNode } = useReactFlow()

    const currentDeviceType = data.deviceType || "desktop"

    const handleDelete = useCallback(() => {
        setNodes((nodes) => nodes.filter((node) => node.id !== id))
    }, [id, setNodes])

    const handleDuplicate = useCallback(() => {
        const node = getNode(id)
        if (!node) return

        const size = DEVICE_SIZES[node.data.deviceType || "desktop"] || { width: 300 }

        const newNode = {
            ...node,
            id: `${id}-copy-${Date.now()}`,
            position: {
                x: node.position.x + size.width + 40,
                y: node.position.y,
            },
            data: {
                ...node.data,
                label: `${node.data.label} Copy`,
            },
        }

        setNodes((nodes) => [...nodes, newNode])
    }, [id, getNode, setNodes])

    const handleSizeChange = useCallback(
        (deviceType) => {
            const size = DEVICE_SIZES[deviceType]
            setNodes((nodes) =>
                nodes.map((node) =>
                    node.id === id
                        ? {
                            ...node,
                            style: { ...node.style, width: size.width, height: size.height },
                            data: { ...node.data, deviceType },
                        }
                        : node,
                ),
            )
            setShowSizeDropdown(false)
        },
        [id, setNodes],
    )

    return (
        <div
            ref={nodeRef}
            className={`relative bg-white border-2 rounded-lg shadow-lg transition-all duration-200 w-full h-full ${selected ? "border-blue-500" : "border-gray-300"
                } ${isHovered ? "shadow-xl" : ""}`}
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

            <div className="p-4 h-full flex items-center justify-center pointer-events-none">
                <span className="text-sm font-medium text-gray-700 select-none">{data.label}</span>
            </div>

            {isHovered && (
                <NodeControls
                    currentDeviceType={currentDeviceType}
                    showSizeDropdown={showSizeDropdown}
                    setShowSizeDropdown={setShowSizeDropdown}
                    handleDuplicate={handleDuplicate}
                    handleDelete={handleDelete}
                    handleSizeChange={handleSizeChange}
                    setIsHovered={setIsHovered}
                    hoverTimeoutRef={hoverTimeoutRef}
                />
            )}

            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-gray-400 border-2 border-white opacity-0 hover:opacity-100 transition-opacity"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-gray-400 border-2 border-white opacity-0 hover:opacity-100 transition-opacity"
            />
            <Handle
                type="source"
                position={Position.Left}
                className="w-3 h-3 bg-gray-400 border-2 border-white opacity-0 hover:opacity-100 transition-opacity"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-gray-400 border-2 border-white opacity-0 hover:opacity-100 transition-opacity"
            />
        </div>
    )
}
