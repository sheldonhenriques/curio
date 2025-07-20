import { useState, useCallback } from 'react'

/**
 * Custom hook for handling file operations with the inspector API
 */
export const useFileOperations = (projectId) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileStructure, setFileStructure] = useState(null)

  /**
   * Read file contents from sandbox
   */
  const readFile = useCallback(async (filePath) => {
    if (!projectId) {
      throw new Error('Project ID is required')
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/inspector/files/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to read file')
      }

      const data = await response.json()
      return data.content
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [projectId])

  /**
   * Write file contents to sandbox
   */
  const writeFile = useCallback(async (filePath, content, createBackup = true) => {
    if (!projectId) {
      throw new Error('Project ID is required')
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/inspector/files/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath, content, createBackup }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to write file')
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [projectId])

  /**
   * Get project file structure
   */
  const getFileStructure = useCallback(async (path = '', options = {}) => {
    if (!projectId) {
      throw new Error('Project ID is required')
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        path,
        ...options
      })

      const response = await fetch(`/api/projects/${projectId}/inspector/files/structure?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get file structure')
      }

      const data = await response.json()
      setFileStructure(data)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [projectId])

  /**
   * Get web-related files (HTML, CSS, JS)
   */
  const getWebFiles = useCallback(async () => {
    const structure = await getFileStructure('', {
      fileTypes: 'html,css,js,jsx,ts,tsx,scss,sass,less',
      includeHidden: false
    })
    return structure.webFiles
  }, [getFileStructure])

  /**
   * Check if file exists and is editable
   */
  const isFileEditable = useCallback((filename) => {
    const editableExtensions = ['html', 'css', 'js', 'jsx', 'ts', 'tsx', 'scss', 'sass', 'less', 'json']
    const extension = filename.split('.').pop()?.toLowerCase()
    return editableExtensions.includes(extension)
  }, [])

  /**
   * Get appropriate language mode for file
   */
  const getLanguageFromFile = useCallback((filename) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    
    const languageMap = {
      'css': 'css',
      'scss': 'css',
      'sass': 'css',
      'less': 'css',
      'html': 'html',
      'htm': 'html',
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'json': 'javascript'
    }

    return languageMap[extension] || 'css'
  }, [])

  /**
   * Create a new file
   */
  const createFile = useCallback(async (filePath, initialContent = '') => {
    return await writeFile(filePath, initialContent, false)
  }, [writeFile])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // Data
    loading,
    error,
    fileStructure,
    
    // Actions
    readFile,
    writeFile,
    createFile,
    getFileStructure,
    getWebFiles,
    
    // Utilities
    isFileEditable,
    getLanguageFromFile,
    clearError
  }
}

export default useFileOperations