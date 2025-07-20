"use client"

import { useState, useEffect } from "react"
import { updateElementClassName } from "@/services/tailwindUpdater"
import { 
  Layers, 
  Palette, 
  Code, 
  FileText, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Copy,
  ExternalLink,
  File,
  Target
} from "lucide-react"
import FileEditor from "./FileEditor"
import StyleSources from "./StyleSources"

const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
)

const ElementsTab = ({ selectedElement, onElementSelect }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set(['body']))

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // Mock DOM tree for now - will be replaced with real data
  const mockDomTree = [
    {
      id: 'html',
      tagName: 'html',
      children: [
        {
          id: 'head',
          tagName: 'head',
          children: [
            { id: 'title', tagName: 'title', text: 'Page Title' },
            { id: 'meta-charset', tagName: 'meta', attributes: { charset: 'utf-8' } }
          ]
        },
        {
          id: 'body',
          tagName: 'body',
          children: [
            {
              id: 'main',
              tagName: 'main',
              className: 'container mx-auto px-4',
              children: [
                { id: 'h1', tagName: 'h1', className: 'text-2xl font-bold', text: 'Welcome' },
                { id: 'p', tagName: 'p', className: 'text-gray-600', text: 'Lorem ipsum...' }
              ]
            }
          ]
        }
      ]
    }
  ]

  const renderNode = (node, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedElement?.selector?.includes(node.tagName)

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-colors duration-150 ${
            isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => onElementSelect?.(node)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
              }}
              className="p-0.5 rounded hover:bg-gray-200"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          
          <span className="text-blue-600 font-mono text-xs">&lt;</span>
          <span className="font-mono text-xs text-gray-800">{node.tagName}</span>
          
          {node.className && (
            <span className="font-mono text-xs text-purple-600">
              .{node.className.split(' ').join('.')}
            </span>
          )}
          
          {node.attributes && Object.keys(node.attributes).length > 0 && (
            <span className="font-mono text-xs text-gray-500">
              {Object.entries(node.attributes)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ')}
            </span>
          )}
          
          <span className="text-blue-600 font-mono text-xs">&gt;</span>
          
          {node.text && (
            <span className="text-gray-600 text-xs ml-1 truncate">
              {node.text.length > 20 ? `${node.text.substring(0, 20)}...` : node.text}
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Elements</h3>
        <p className="text-xs text-gray-500 mt-1">DOM tree structure</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {mockDomTree.map(node => renderNode(node))}
      </div>
    </div>
  )
}

const StylesTab = ({ selectedElement, onStyleChange, projectId }) => {
  const [expandedSections, setExpandedSections] = useState(new Set(['tailwind', 'layout', 'spacing']))
  const [classInput, setClassInput] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  // Update class input when selected element changes
  useEffect(() => {
    if (selectedElement?.className) {
      setClassInput(selectedElement.className)
    } else {
      setClassInput('')
    }
  }, [selectedElement])

  const handleClassChange = async (newClasses) => {
    if (!selectedElement || !projectId) return

    setIsUpdating(true)
    try {
      console.log('[StylesTab] Updating classes from:', selectedElement.className, 'to:', newClasses)
      
      // Update the element's className immediately for real-time preview
      onStyleChange?.('className', newClasses)
      
      // Update the source file with new classes (async)
      if (newClasses !== selectedElement.className) {
        updateElementClassName(projectId, selectedElement, newClasses)
          .then((success) => {
            if (success) {
              console.log('[StylesTab] Successfully persisted className changes to source file')
            } else {
              console.warn('[StylesTab] Could not find element in source files to update')
            }
          })
          .catch((error) => {
            console.error('[StylesTab] Failed to persist className changes:', error)
          })
      }
      
    } catch (error) {
      console.error('[StylesTab] Failed to update classes:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const addTailwindClass = (className) => {
    const currentClasses = classInput.split(' ').filter(c => c.trim())
    if (!currentClasses.includes(className)) {
      const newClasses = [...currentClasses, className].join(' ')
      setClassInput(newClasses)
      handleClassChange(newClasses)
    }
  }

  const removeTailwindClass = (className) => {
    const currentClasses = classInput.split(' ').filter(c => c.trim() && c !== className)
    const newClasses = currentClasses.join(' ')
    setClassInput(newClasses)
    handleClassChange(newClasses)
  }

  const commonTailwindClasses = {
    Layout: ['block', 'inline', 'flex', 'grid', 'hidden', 'relative', 'absolute', 'fixed', 'sticky'],
    Spacing: ['p-0', 'p-1', 'p-2', 'p-4', 'p-6', 'p-8', 'm-0', 'm-1', 'm-2', 'm-4', 'm-6', 'm-8'],
    Typography: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'font-normal', 'font-bold'],
    Colors: ['text-black', 'text-white', 'text-gray-500', 'bg-white', 'bg-gray-100', 'bg-blue-500', 'bg-red-500'],
    Border: ['border', 'border-2', 'border-gray-200', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-full']
  }

  const styleCategories = [
    {
      id: 'layout',
      label: 'Layout',
      properties: ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index']
    },
    {
      id: 'spacing',
      label: 'Spacing',
      properties: ['margin', 'padding', 'width', 'height']
    },
    {
      id: 'typography',
      label: 'Typography',
      properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'color']
    },
    {
      id: 'background',
      label: 'Background',
      properties: ['background-color', 'background-image', 'background-size']
    },
    {
      id: 'border',
      label: 'Border',
      properties: ['border', 'border-radius', 'outline']
    }
  ]

  const renderProperty = (property, value) => (
    <div key={property} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
      <span className="text-xs font-mono text-gray-600">{property}:</span>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onStyleChange?.(property, e.target.value)}
        className="text-xs font-mono bg-transparent border border-gray-200 rounded px-1 py-0.5 w-20 focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="auto"
      />
    </div>
  )

  const renderTailwindSection = () => (
    <div className="border border-gray-200 rounded">
      <button
        onClick={() => toggleSection('tailwind')}
        className="w-full flex items-center justify-between p-2 bg-blue-50 hover:bg-blue-100 transition-colors duration-150"
      >
        <span className="text-xs font-medium text-blue-700">Tailwind CSS Classes</span>
        {expandedSections.has('tailwind') ? (
          <ChevronDown className="w-3 h-3 text-blue-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-blue-500" />
        )}
      </button>
      
      {expandedSections.has('tailwind') && (
        <div className="p-3 space-y-3 bg-white">
          {/* Class Input */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">CSS Classes</label>
            <div className="relative">
              <input
                type="text"
                value={classInput}
                onChange={(e) => {
                  setClassInput(e.target.value)
                  handleClassChange(e.target.value)
                }}
                className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter Tailwind classes..."
                disabled={isUpdating}
              />
              {isUpdating && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Current Classes */}
          {classInput && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Applied Classes</label>
              <div className="flex flex-wrap gap-1">
                {classInput.split(' ').filter(c => c.trim()).map((className, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded cursor-pointer hover:bg-blue-200"
                    onClick={() => removeTailwindClass(className)}
                  >
                    {className}
                    <span className="text-blue-500 hover:text-blue-700">×</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Add Classes */}
          <div className="space-y-2">
            {Object.entries(commonTailwindClasses).map(([category, classes]) => (
              <div key={category}>
                <label className="text-xs font-medium text-gray-700 mb-1 block">{category}</label>
                <div className="flex flex-wrap gap-1">
                  {classes.map((className) => (
                    <button
                      key={className}
                      onClick={() => addTailwindClass(className)}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors duration-150"
                      disabled={isUpdating || classInput.split(' ').includes(className)}
                    >
                      {className}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Styles</h3>
        {selectedElement ? (
          <p className="text-xs text-gray-500 mt-1 font-mono">{selectedElement.selector}</p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">Select an element to edit styles</p>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {selectedElement ? (
          <div className="p-2 space-y-2">
            {/* Tailwind CSS Section */}
            {renderTailwindSection()}
            
            {/* Traditional CSS Properties */}
            {styleCategories.map(category => {
              const isExpanded = expandedSections.has(category.id)
              return (
                <div key={category.id} className="border border-gray-200 rounded">
                  <button
                    onClick={() => toggleSection(category.id)}
                    className="w-full flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 transition-colors duration-150"
                  >
                    <span className="text-xs font-medium text-gray-700">{category.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-500" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-2 space-y-1 bg-white">
                      {category.properties.map(property => 
                        renderProperty(property, selectedElement.styles?.computed?.[property])
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Palette className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Select an element to view styles</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const ComputedTab = ({ selectedElement }) => {
  if (!selectedElement) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Select an element to view computed styles</p>
        </div>
      </div>
    )
  }

  const computedStyles = selectedElement.styles?.computed || {}

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Computed</h3>
        <p className="text-xs text-gray-500 mt-1 font-mono">{selectedElement.selector}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {Object.entries(computedStyles)
            .filter(([key, value]) => value && value !== 'auto' && value !== 'none')
            .map(([property, value]) => (
              <div key={property} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
                <span className="text-xs font-mono text-gray-600">{property}:</span>
                <span className="text-xs font-mono text-gray-800">{value}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(`${property}: ${value};`)}
                  className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy declaration"
                >
                  <Copy className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

const InspectorSidebar = ({ 
  selectedElement, 
  inspectorReady,
  onElementSelect,
  onStyleChange,
  projectId
}) => {
  const [activeTab, setActiveTab] = useState('elements')

  const tabs = [
    { id: 'elements', label: 'Elements', icon: Layers },
    { id: 'styles', label: 'Styles', icon: Palette },
    { id: 'computed', label: 'Computed', icon: Settings },
    { id: 'sources', label: 'Sources', icon: Target },
    { id: 'files', label: 'Files', icon: File },
    { id: 'console', label: 'Console', icon: Code }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'elements':
        return <ElementsTab selectedElement={selectedElement} onElementSelect={onElementSelect} />
      case 'styles':
        return <StylesTab selectedElement={selectedElement} onStyleChange={onStyleChange} projectId={projectId} />
      case 'computed':
        return <ComputedTab selectedElement={selectedElement} />
      case 'sources':
        return <StyleSources selectedElement={selectedElement} projectId={projectId} />
      case 'files':
        return <FileEditor projectId={projectId} selectedElement={selectedElement} />
      case 'console':
        return (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Code className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Console coming soon</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Inspector</h2>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${inspectorReady ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className="text-xs text-gray-500">
              {inspectorReady ? 'Ready' : 'Loading...'}
            </span>
          </div>
        </div>
        
        <p className="text-xs text-gray-500">
          {inspectorReady ? 'Click elements to inspect and edit styles' : 'Initializing inspector...'}
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
        {tabs.map(tab => (
          <TabButton
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.id}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default InspectorSidebar