"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  File, 
  Folder, 
  FolderOpen, 
  Plus, 
  Search, 
  RefreshCw,
  AlertCircle,
  FileText,
  Code
} from "lucide-react"
import CodeEditor from "./CodeEditor"
import useFileOperations from "@/hooks/useFileOperations"

const FileTreeItem = ({ 
  item, 
  depth = 0, 
  expanded, 
  onToggle, 
  onSelect, 
  selectedFile,
  isEditable 
}) => {
  const isExpanded = expanded.has(item.path)
  const isSelected = selectedFile === item.path
  const hasChildren = item.type === 'directory'

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-colors duration-150 ${
          isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(item)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(item.path)
            }}
            className="p-0.5 rounded hover:bg-gray-200"
          >
            {isExpanded ? (
              <FolderOpen className="w-3 h-3 text-blue-500" />
            ) : (
              <Folder className="w-3 h-3 text-gray-500" />
            )}
          </button>
        ) : (
          <File className={`w-3 h-3 ml-1 ${isEditable(item.name) ? 'text-green-500' : 'text-gray-400'}`} />
        )}
        
        <span className={`text-xs ${!isEditable(item.name) && item.type === 'file' ? 'text-gray-400' : 'text-gray-700'}`}>
          {item.name}
        </span>
        
        {item.type === 'file' && (
          <span className="text-xs text-gray-400 ml-auto">
            {(item.size / 1024).toFixed(1)}KB
          </span>
        )}
      </div>
      
      {hasChildren && isExpanded && item.children && (
        <div>
          {item.children.map(child => (
            <FileTreeItem
              key={child.path}
              item={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedFile={selectedFile}
              isEditable={isEditable}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const FileEditor = ({ projectId, selectedElement }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [expanded, setExpanded] = useState(new Set(['src', 'public', 'app']))
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    loading,
    error,
    fileStructure,
    readFile,
    writeFile,
    getFileStructure,
    getWebFiles,
    isFileEditable,
    getLanguageFromFile,
    clearError
  } = useFileOperations(projectId)

  // Load file structure on mount
  useEffect(() => {
    if (projectId) {
      getFileStructure()
    }
  }, [projectId, getFileStructure])

  // Handle file selection
  const handleFileSelect = useCallback(async (item) => {
    if (item.type === 'directory') {
      toggleExpanded(item.path)
      return
    }

    if (!isFileEditable(item.name)) {
      console.log('File is not editable:', item.name)
      return
    }

    setIsLoading(true)
    setSelectedFile(item.path)
    
    try {
      const content = await readFile(item.path)
      setFileContent(content)
      setEditedContent(content)
    } catch (error) {
      console.error('Failed to read file:', error)
    } finally {
      setIsLoading(false)
    }
  }, [readFile, isFileEditable])

  // Handle file save
  const handleFileSave = useCallback(async (content, filename) => {
    if (!selectedFile) return

    try {
      await writeFile(selectedFile, content)
      setFileContent(content)
      console.log('File saved successfully:', selectedFile)
    } catch (error) {
      console.error('Failed to save file:', error)
      throw error
    }
  }, [selectedFile, writeFile])

  // Handle content change
  const handleContentChange = useCallback((content) => {
    setEditedContent(content)
  }, [])

  // Toggle expanded state
  const toggleExpanded = useCallback((path) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpanded(newExpanded)
  }, [expanded])

  // Filter files based on search term
  const filterFiles = useCallback((files, term) => {
    if (!term) return files
    
    return files.filter(file => 
      file.name.toLowerCase().includes(term.toLowerCase()) ||
      (file.children && filterFiles(file.children, term).length > 0)
    )
  }, [])

  // Build file tree from flat structure
  const buildFileTree = useCallback((files) => {
    if (!files) return []
    
    const tree = {}
    const result = []
    
    files.forEach(file => {
      const pathParts = file.path.split('/')
      let current = tree
      
      pathParts.forEach((part, index) => {
        if (!part) return
        
        if (index === pathParts.length - 1) {
          // This is the file/directory
          current[part] = {
            ...file,
            children: file.type === 'directory' ? [] : undefined
          }
        } else {
          // This is a parent directory
          if (!current[part]) {
            current[part] = {
              name: part,
              path: pathParts.slice(0, index + 1).join('/'),
              type: 'directory',
              children: []
            }
          }
          current = current[part].children = current[part].children || {}
        }
      })
    })
    
    // Convert tree object to array
    const convertToArray = (obj) => {
      return Object.values(obj).map(item => ({
        ...item,
        children: item.children ? convertToArray(item.children) : undefined
      }))
    }
    
    return convertToArray(tree)
  }, [])

  const fileTree = buildFileTree(fileStructure?.files)
  const filteredTree = filterFiles(fileTree, searchTerm)

  return (
    <div className="h-full flex">
      {/* File Explorer Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Files</h3>
            <button
              onClick={() => getFileStructure()}
              disabled={loading}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {error && (
            <div className="flex items-center gap-2 p-2 text-red-600 bg-red-50 rounded text-xs mb-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
              <button onClick={clearError} className="ml-auto text-red-800">×</button>
            </div>
          )}
          
          {loading && !fileStructure && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-xs">Loading files...</span>
            </div>
          )}
          
          {filteredTree.length > 0 ? (
            <div className="space-y-0.5">
              {filteredTree.map(item => (
                <FileTreeItem
                  key={item.path}
                  item={item}
                  expanded={expanded}
                  onToggle={toggleExpanded}
                  onSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  isEditable={isFileEditable}
                />
              ))}
            </div>
          ) : fileStructure && !loading && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <FileText className="w-6 h-6 mb-2" />
              <p className="text-xs">No files found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-500">
            {fileStructure?.totalWebFiles || 0} web files
          </div>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <CodeEditor
            content={fileContent}
            language={getLanguageFromFile(selectedFile)}
            fileName={selectedFile.split('/').pop()}
            height="100%"
            onChange={handleContentChange}
            onSave={handleFileSave}
            projectId={projectId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <Code className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700 mb-1">No file selected</h3>
              <p className="text-xs text-gray-500">
                Select a file from the explorer to start editing
              </p>
              
              {selectedElement && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                  <p className="text-blue-700 mb-1">💡 Tip:</p>
                  <p className="text-blue-600">
                    Selected element: <code className="font-mono">{selectedElement.selector}</code>
                  </p>
                  <p className="text-blue-600 mt-1">
                    Find the corresponding CSS file to edit its styles
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading file...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileEditor