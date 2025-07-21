"use client"

import { useState, useCallback } from "react"
import { useReactFlow } from "reactflow"
import { DEVICE_SIZES } from "@/constants/node"
import BaseNode from "@/components/nodes/basenode"
import WebserverHeader from "@/components/nodes/webserver/WebserverHeader"
import WebserverPreview from "@/components/nodes/webserver/WebserverPreview"
import PropertyPanel from "@/components/nodes/webserver/PropertyPanel"

export default function WebserverNode({ id, data, selected }) {
  const { setNodes } = useReactFlow()
  const [hasError, setHasError] = useState(data.hasError || false)
  const [isSelectModeActive, setIsSelectModeActive] = useState(false)
  const [selectedElement, setSelectedElement] = useState(null)
  const [updateElementFunction, setUpdateElementFunction] = useState(null)

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

  const handleSelectModeToggle = useCallback(() => {
    setIsSelectModeActive(prev => !prev)
    if (isSelectModeActive) {
      setSelectedElement(null)
    }
  }, [isSelectModeActive])

  const handleElementSelected = useCallback((element) => {
    setSelectedElement(element)
  }, [])

  const handlePropertyChange = useCallback(async (property, value) => {
    if (!selectedElement || !value) return
    
    // Convert property to Tailwind class
    const tailwindClass = convertPropertyToTailwind(property, value)
    
    // Send property change to iframe for immediate visual update
    if (updateElementFunction) {
      updateElementFunction(property, tailwindClass)
    }
    
    // Update files in sandbox
    if (data.sandboxId) {
      try {
        // Extract project ID from sandbox URL
        let projectId = data.projectId
        if (!projectId && data.url) {
          // Try to extract from Daytona URL pattern
          const match = data.url.match(/(\w+)-[\w-]+\.proxy\.daytona\.work/)
          if (match) {
            projectId = match[1]
          }
        }

        if (projectId) {
          const response = await fetch(`/api/projects/${projectId}/sandbox/files/modify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: 'src/app/page.tsx', // Default to main page - this should be dynamic in production
              elementSelector: selectedElement.elementPath,
              newClassName: tailwindClass,
              property,
              value
            })
          })

          const result = await response.json()
          if (!result.success) {
            console.error('Failed to update file:', result.error)
          }
        }
      } catch (error) {
        console.error('Error updating file:', error)
      }
    }
  }, [updateElementFunction, selectedElement, data.sandboxId, data.projectId])

  // Helper function to convert property values to Tailwind classes
  const convertPropertyToTailwind = useCallback((property, value) => {
    if (!value) return ''
    
    // If the value is already a Tailwind class, return it
    if (value.includes('-') && (value.startsWith('m-') || value.startsWith('p-') || value.startsWith('text-') || 
        value.startsWith('bg-') || value.startsWith('font-') || value.startsWith('border-') || 
        value.startsWith('rounded-') || value === 'hidden' || value === 'block' || value === 'flex' || 
        value === 'grid' || value === 'inline')) {
      return value
    }
    
    switch (property) {
      case 'margin':
        return value ? `m-${value}` : ''
      case 'padding':
        return value ? `p-${value}` : ''
      case 'fontSize':
        return value.startsWith('text-') ? value : `text-${value}`
      case 'fontWeight':
        return value.startsWith('font-') ? value : `font-${value}`
      case 'textColor':
        return value.startsWith('text-') ? value : `text-${value}`
      case 'backgroundColor':
        return value.startsWith('bg-') ? value : `bg-${value}`
      case 'textAlign':
        return value.startsWith('text-') ? value : `text-${value}`
      case 'borderRadius':
        return value.startsWith('rounded') ? value : `rounded-${value}`
      case 'display':
        return value // display values are usually direct (block, flex, etc.)
      default:
        return value
    }
  }, [])

  const handleUpdateElementRef = useCallback((updateFn) => {
    setUpdateElementFunction(() => updateFn)
  }, [])

  const handlePropertyPanelClose = useCallback(() => {
    setSelectedElement(null)
    setIsSelectModeActive(false)
  }, [])

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

      <PropertyPanel
        element={selectedElement}
        isVisible={!!selectedElement}
        onClose={handlePropertyPanelClose}
        onPropertyChange={handlePropertyChange}
      />
    </div>
  )

  return (
    <BaseNode id={id} data={data} selected={selected} nodeType="webserverNode" sizeOptions={DEVICE_SIZES}>
      {webserverContent}
    </BaseNode>
  )
}
