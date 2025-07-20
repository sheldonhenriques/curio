"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  FileText, 
  ExternalLink, 
  Code, 
  Search,
  ChevronRight,
  Target,
  Zap
} from "lucide-react"
import { fileMappingEngine } from "@/services/fileMappingService"
import useFileOperations from "@/hooks/useFileOperations"

const StyleSourceItem = ({ 
  source, 
  onFileOpen, 
  onRuleClick,
  isExpanded,
  onToggle
}) => {
  const { fileName, rules, relevanceScore } = source
  const displayName = fileName.split('/').pop()
  
  return (
    <div className="border border-gray-200 rounded bg-white">
      {/* File Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 flex-1">
          <FileText className="w-4 h-4 text-blue-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">{displayName}</div>
            <div className="text-xs text-gray-500">{fileName}</div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {rules.length} rule{rules.length !== 1 ? 's' : ''}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Zap className="w-3 h-3" />
              {Math.round(relevanceScore)}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFileOpen(fileName)
              }}
              className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
              title="Open file"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${
          isExpanded ? 'rotate-90' : ''
        }`} />
      </div>
      
      {/* Rules List */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          {rules.map((rule, index) => (
            <div 
              key={index}
              className="p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
              onClick={() => onRuleClick(rule)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-mono text-blue-600 mb-1">
                    {rule.matchingSelector}
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    Lines {rule.lineStart}-{rule.lineEnd}
                    <span className="ml-2 text-gray-400">
                      Specificity: {rule.specificity.string}
                    </span>
                  </div>
                  
                  {rule.properties.length > 0 && (
                    <div className="space-y-1">
                      {rule.properties.slice(0, 3).map((prop, propIndex) => (
                        <div key={propIndex} className="text-xs font-mono text-gray-700">
                          <span className="text-purple-600">{prop.property}</span>
                          <span className="text-gray-500">: </span>
                          <span className="text-green-600">{prop.value}</span>
                        </div>
                      ))}
                      
                      {rule.properties.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{rule.properties.length - 3} more properties
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="ml-2">
                  <Target className="w-3 h-3 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const StyleSources = ({ 
  selectedElement, 
  projectId, 
  onFileOpen,
  onRuleNavigate 
}) => {
  const [styleSources, setStyleSources] = useState([])
  const [expandedFiles, setExpandedFiles] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [mappingStats, setMappingStats] = useState(null)
  
  const { getWebFiles, readFile } = useFileOperations(projectId)
  
  // Load and analyze files when component mounts or project changes
  useEffect(() => {
    if (projectId) {
      loadProjectFiles()
    }
  }, [projectId])
  
  // Update style sources when selected element changes
  useEffect(() => {
    if (selectedElement) {
      findStylesForElement(selectedElement)
    } else {
      setStyleSources([])
    }
  }, [selectedElement])
  
  const loadProjectFiles = useCallback(async () => {
    if (!projectId) return
    
    setLoading(true)
    
    try {
      // Clear existing mappings
      fileMappingEngine.clear()
      
      // Get all web files
      const webFiles = await getWebFiles()
      
      // Load and parse CSS files
      const cssFiles = webFiles.filter(file => 
        file.name.endsWith('.css') || 
        file.name.endsWith('.scss') || 
        file.name.endsWith('.sass')
      )
      
      for (const file of cssFiles) {
        try {
          const content = await readFile(file.path)
          fileMappingEngine.addCSSFile(file.path, content)
        } catch (error) {
          console.warn(`Failed to load CSS file ${file.path}:`, error)
        }
      }
      
      // Load and parse HTML files
      const htmlFiles = webFiles.filter(file => 
        file.name.endsWith('.html') || 
        file.name.endsWith('.htm')
      )
      
      for (const file of htmlFiles) {
        try {
          const content = await readFile(file.path)
          fileMappingEngine.addHTMLFile(file.path, content)
        } catch (error) {
          console.warn(`Failed to load HTML file ${file.path}:`, error)
        }
      }
      
      // Update stats
      setMappingStats(fileMappingEngine.getStats())
      
    } catch (error) {
      console.error('Failed to load project files:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, getWebFiles, readFile])
  
  const findStylesForElement = useCallback((element) => {
    if (!element) {
      setStyleSources([])
      return
    }
    
    try {
      // Create element object for mapping engine
      const elementForMapping = {
        tagName: element.tagName,
        id: element.id || '',
        className: element.className || '',
        selector: element.selector
      }
      
      // Find applicable files and rules
      const sources = fileMappingEngine.findFilesForElement(elementForMapping)
      
      setStyleSources(sources)
      
      // Auto-expand the most relevant file
      if (sources.length > 0) {
        setExpandedFiles(new Set([sources[0].fileName]))
      }
      
    } catch (error) {
      console.error('Error finding styles for element:', error)
      setStyleSources([])
    }
  }, [])
  
  const handleFileToggle = useCallback((fileName) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(fileName)) {
      newExpanded.delete(fileName)
    } else {
      newExpanded.add(fileName)
    }
    setExpandedFiles(newExpanded)
  }, [expandedFiles])
  
  const handleRuleClick = useCallback((rule) => {
    if (onRuleNavigate) {
      onRuleNavigate(rule)
    }
    
    // Also open the file if handler is provided
    if (onFileOpen) {
      onFileOpen(rule.fileName, rule.lineStart)
    }
  }, [onRuleNavigate, onFileOpen])
  
  if (!selectedElement) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Search className="w-8 h-8 mx-auto mb-3 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700 mb-1">No element selected</h3>
          <p className="text-xs text-gray-500">
            Select an element to see its style sources
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-medium text-gray-900 mb-1">Style Sources</h3>
        <p className="text-xs text-gray-500 font-mono mb-2">
          {selectedElement.selector}
        </p>
        
        {mappingStats && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{mappingStats.cssFiles} CSS files</span>
            <span>{mappingStats.totalRules} rules</span>
            {loading && <span className="text-blue-600">Analyzing...</span>}
          </div>
        )}
      </div>
      
      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && !mappingStats ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading project files...</p>
            </div>
          </div>
        ) : styleSources.length > 0 ? (
          <div className="space-y-3">
            {styleSources.map((source) => (
              <StyleSourceItem
                key={source.fileName}
                source={source}
                onFileOpen={onFileOpen}
                onRuleClick={handleRuleClick}
                isExpanded={expandedFiles.has(source.fileName)}
                onToggle={() => handleFileToggle(source.fileName)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="text-center">
              <Code className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700 mb-1">No styles found</h3>
              <p className="text-xs text-gray-500 mb-3">
                This element doesn&apos;t have any matching CSS rules
              </p>
              
              <button
                onClick={loadProjectFiles}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Refresh analysis
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      {styleSources.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            Found {styleSources.length} file{styleSources.length !== 1 ? 's' : ''} with matching styles
          </div>
        </div>
      )}
    </div>
  )
}

export default StyleSources