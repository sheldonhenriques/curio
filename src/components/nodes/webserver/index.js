"use client"

import { useState, useCallback, useEffect } from "react"
import { useReactFlow } from "reactflow"
import { DEVICE_SIZES } from "@/constants/node"
import BaseNode from "@/components/nodes/basenode"
import WebserverHeader from "@/components/nodes/webserver/WebserverHeader"
import WebserverPreview from "@/components/nodes/webserver/CrossOriginWebserverPreview"

export default function WebserverNode({ id, data, selected }) {
  const { setNodes } = useReactFlow()
  const [hasError, setHasError] = useState(data.hasError || false)
  const [isInspectorActive, setIsInspectorActive] = useState(false)

  const extractPath = (url) => {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname + urlObj.search + urlObj.hash || "/"
    } catch {
      return "/"
    }
  }

  const buildUrl = (baseUrl, newPath) => {
    try {
      const urlObj = new URL(baseUrl)
      // If newPath doesn't start with /, add it
      const path = newPath.startsWith("/") ? newPath : `/${newPath}`
      return `${urlObj.protocol}//${urlObj.host}${path}`
    } catch {
      return baseUrl
    }
  }

  const handlePathChange = useCallback(
    (newPath) => {
      const newUrl = buildUrl(data.url, newPath)
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: newPath,
                  url: newUrl,
                  hasError: false, // Reset error state when URL changes
                },
              }
            : node,
        ),
      )
      setHasError(false)
    },
    [id, data.url, setNodes],
  )

  const handleLoadError = useCallback(() => {
    setHasError(true)
    setNodes((nodes) =>
      nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, hasError: true } } : node)),
    )
  }, [id, setNodes])

  const handleLoadSuccess = useCallback(() => {
    setHasError(false)
    setNodes((nodes) =>
      nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, hasError: false } } : node)),
    )
  }, [id, setNodes])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setNodes((nodes) =>
      nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, hasError: false } } : node)),
    )
  }, [id, setNodes])

  const handleInspectorToggle = useCallback(() => {
    setIsInspectorActive(prev => !prev)
  }, [])

  // Keyboard shortcuts for inspector
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts when this node is selected
      if (!selected) return

      // Ctrl+Shift+I to toggle inspector
      if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault()
        handleInspectorToggle()
      }
      
      // Escape to disable inspector
      if (event.key === 'Escape' && isInspectorActive) {
        event.preventDefault()
        setIsInspectorActive(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, isInspectorActive, handleInspectorToggle])

  const currentPath = extractPath(data.url)

  // Custom webserver content
  const webserverContent = (
    <div className="flex flex-col h-full">
      <WebserverHeader
        url={data.url}
        path={currentPath}
        onPathChange={handlePathChange}
        hasError={hasError || data.hasError}
        isInspectorActive={isInspectorActive}
        onInspectorToggle={handleInspectorToggle}
      />

      <WebserverPreview
        url={data.url}
        hasError={hasError || data.hasError}
        onLoadError={handleLoadError}
        onLoadSuccess={handleLoadSuccess}
        onRetry={handleRetry}
        sandboxStatus={data.sandboxStatus}
        isInspectorActive={isInspectorActive}
        projectId={data.projectId}
      />
    </div>
  )

  return (
    <BaseNode id={id} data={data} selected={selected} nodeType="webserverNode" sizeOptions={DEVICE_SIZES}>
      {webserverContent}
    </BaseNode>
  )
}
