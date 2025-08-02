"use client"

import { useState, useCallback } from "react"
import { useReactFlow } from "reactflow"
import { DEVICE_SIZES } from "@/constants/node"
import BaseNode from "@/components/nodes/basenode"
import WebserverHeader from "@/components/nodes/webserver/WebserverHeader"
import WebserverPreview from "@/components/nodes/webserver/WebserverPreview"
import { usePropertyPanel } from "@/components/flow/Canvas"

export default function WebserverNode({ id, data, selected }) {
  const { setNodes } = useReactFlow()
  const { setSelectedElement, setUpdateElementFunction } = usePropertyPanel()
  const [hasError, setHasError] = useState(data.hasError || false)
  const [isSelectModeActive, setIsSelectModeActive] = useState(false)

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
    // The WebserverPreview component will handle cache-busting internally
    // No need to modify the node's URL permanently
  }, [id, setNodes])

  const handleSelectModeToggle = useCallback(() => {
    const newSelectModeActive = !isSelectModeActive
    setIsSelectModeActive(newSelectModeActive)
    
    if (newSelectModeActive) {
      // When activating select mode, mark this node as active
      setSelectedElement(null, id) // Mark this node as active without selecting an element
    } else {
      // When deactivating select mode, clear selection and active node
      setSelectedElement(null, null) // Clear both element and active node
    }
  }, [isSelectModeActive, setSelectedElement, id])

  const handleElementSelected = useCallback((element) => {
    // Enhance element with node-specific data
    const enhancedElement = {
      ...element,
      filePath: data.filePath || null, // Add the specific file path from node data
      currentRoute: data.route || extractPath(data.url) // Add current route from node data
    }
    
    // Use the enhanced setSelectedElement that includes nodeId tracking
    setSelectedElement(enhancedElement, id)
  }, [setSelectedElement, data.filePath, data.route, data.url, id, data.title])


  const handleUpdateElementRef = useCallback((updateFn) => {
    setUpdateElementFunction(() => updateFn)
  }, [setUpdateElementFunction])

  const currentPath = extractPath(data.url)

  // Custom webserver content
  const webserverContent = (
    <div className="flex flex-col h-full relative">
      <WebserverHeader
        url={data.url}
        path={currentPath}
        onPathChange={handlePathChange}
        hasError={hasError || data.hasError}
        isSelectModeActive={isSelectModeActive}
        onSelectModeToggle={handleSelectModeToggle}
        onRefresh={handleRetry}
      />

      <WebserverPreview
        url={data.url}
        hasError={hasError || data.hasError}
        onLoadError={handleLoadError}
        onLoadSuccess={handleLoadSuccess}
        onRetry={handleRetry}
        sandboxStatus={data.sandboxStatus}
        isSelectModeActive={isSelectModeActive}
        onElementSelected={handleElementSelected}
        onUpdateElement={handleUpdateElementRef}
      />
    </div>
  )

  return (
    <BaseNode id={id} data={data} selected={selected} nodeType="webserverNode" sizeOptions={DEVICE_SIZES}>
      {webserverContent}
    </BaseNode>
  )
}
