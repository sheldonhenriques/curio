import { useState, useCallback, useRef } from 'react'

/**
 * Custom hook for managing change history with undo/redo functionality
 */
export const useChangeManager = (maxHistorySize = 50) => {
  const [history, setHistory] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const lastSavedIndex = useRef(-1)

  /**
   * Add a new change to the history
   */
  const addChange = useCallback((change) => {
    setHistory(prevHistory => {
      // Remove any changes after current index (when we've undone some changes)
      const newHistory = prevHistory.slice(0, currentIndex + 1)
      
      // Add the new change
      newHistory.push({
        ...change,
        timestamp: Date.now(),
        id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift()
        // Adjust saved index if needed
        if (lastSavedIndex.current > 0) {
          lastSavedIndex.current--
        }
      }
      
      return newHistory
    })
    
    setCurrentIndex(prevIndex => {
      const newIndex = Math.min(prevIndex + 1, maxHistorySize - 1)
      setHasUnsavedChanges(newIndex !== lastSavedIndex.current)
      return newIndex
    })
  }, [currentIndex, maxHistorySize])

  /**
   * Undo the last change
   */
  const undo = useCallback(() => {
    if (currentIndex >= 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      setHasUnsavedChanges(newIndex !== lastSavedIndex.current)
      return history[currentIndex] // Return the change being undone
    }
    return null
  }, [currentIndex, history])

  /**
   * Redo the next change
   */
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      setHasUnsavedChanges(newIndex !== lastSavedIndex.current)
      return history[newIndex] // Return the change being redone
    }
    return null
  }, [currentIndex, history])

  /**
   * Mark current state as saved
   */
  const markAsSaved = useCallback(() => {
    lastSavedIndex.current = currentIndex
    setHasUnsavedChanges(false)
  }, [currentIndex])

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
    lastSavedIndex.current = -1
    setHasUnsavedChanges(false)
  }, [])

  /**
   * Get the current change (if any)
   */
  const getCurrentChange = useCallback(() => {
    return currentIndex >= 0 ? history[currentIndex] : null
  }, [currentIndex, history])

  /**
   * Get changes since last save
   */
  const getUnsavedChanges = useCallback(() => {
    const startIndex = Math.max(0, lastSavedIndex.current + 1)
    return history.slice(startIndex, currentIndex + 1)
  }, [history, currentIndex])

  /**
   * Batch multiple changes into a single history entry
   */
  const batchChanges = useCallback((changes, description = 'Batch changes') => {
    if (changes.length === 0) return

    const batchChange = {
      type: 'batch',
      description,
      changes: changes.map(change => ({
        ...change,
        timestamp: change.timestamp || Date.now()
      })),
      timestamp: Date.now()
    }

    addChange(batchChange)
  }, [addChange])

  /**
   * Create a style change entry
   */
  const addStyleChange = useCallback((selector, property, oldValue, newValue, filePath) => {
    const change = {
      type: 'style',
      selector,
      property,
      oldValue,
      newValue,
      filePath,
      description: `Change ${property} of ${selector}`
    }
    
    addChange(change)
  }, [addChange])

  /**
   * Create a file change entry
   */
  const addFileChange = useCallback((filePath, oldContent, newContent, description) => {
    const change = {
      type: 'file',
      filePath,
      oldContent,
      newContent,
      description: description || `Edit ${filePath.split('/').pop()}`
    }
    
    addChange(change)
  }, [addChange])

  /**
   * Create an element change entry
   */
  const addElementChange = useCallback((selector, changeType, oldData, newData, description) => {
    const change = {
      type: 'element',
      selector,
      changeType, // 'attribute', 'class', 'content', etc.
      oldData,
      newData,
      description: description || `${changeType} change on ${selector}`
    }
    
    addChange(change)
  }, [addChange])

  // State derived from history
  const canUndo = currentIndex >= 0
  const canRedo = currentIndex < history.length - 1
  const historySize = history.length
  const changesSinceLastSave = currentIndex - lastSavedIndex.current

  return {
    // State
    history,
    currentIndex,
    hasUnsavedChanges,
    canUndo,
    canRedo,
    historySize,
    changesSinceLastSave,

    // Actions
    addChange,
    undo,
    redo,
    markAsSaved,
    clearHistory,
    batchChanges,

    // Specific change types
    addStyleChange,
    addFileChange,
    addElementChange,

    // Getters
    getCurrentChange,
    getUnsavedChanges
  }
}

/**
 * Hook for managing style changes specifically
 */
export const useStyleChangeManager = (projectId, maxHistorySize = 50) => {
  const changeManager = useChangeManager(maxHistorySize)
  const [activeStyles, setActiveStyles] = useState(new Map()) // selector -> styles

  /**
   * Apply a style change
   */
  const applyStyleChange = useCallback((selector, property, value, filePath) => {
    setActiveStyles(prevStyles => {
      const elementStyles = prevStyles.get(selector) || {}
      const oldValue = elementStyles[property]
      
      // Add to change history
      changeManager.addStyleChange(selector, property, oldValue, value, filePath)
      
      // Update active styles
      const newElementStyles = { ...elementStyles, [property]: value }
      const newStyles = new Map(prevStyles)
      newStyles.set(selector, newElementStyles)
      
      return newStyles
    })
  }, [changeManager])

  /**
   * Undo style change
   */
  const undoStyleChange = useCallback(() => {
    const change = changeManager.undo()
    
    if (change && change.type === 'style') {
      setActiveStyles(prevStyles => {
        const elementStyles = prevStyles.get(change.selector) || {}
        const newElementStyles = { ...elementStyles }
        
        if (change.oldValue !== undefined) {
          newElementStyles[change.property] = change.oldValue
        } else {
          delete newElementStyles[change.property]
        }
        
        const newStyles = new Map(prevStyles)
        newStyles.set(change.selector, newElementStyles)
        
        return newStyles
      })
    } else if (change && change.type === 'batch') {
      // Handle batch undo
      change.changes.forEach(batchedChange => {
        if (batchedChange.type === 'style') {
          setActiveStyles(prevStyles => {
            const elementStyles = prevStyles.get(batchedChange.selector) || {}
            const newElementStyles = { ...elementStyles }
            
            if (batchedChange.oldValue !== undefined) {
              newElementStyles[batchedChange.property] = batchedChange.oldValue
            } else {
              delete newElementStyles[batchedChange.property]
            }
            
            const newStyles = new Map(prevStyles)
            newStyles.set(batchedChange.selector, newElementStyles)
            
            return newStyles
          })
        }
      })
    }
    
    return change
  }, [changeManager])

  /**
   * Redo style change
   */
  const redoStyleChange = useCallback(() => {
    const change = changeManager.redo()
    
    if (change && change.type === 'style') {
      setActiveStyles(prevStyles => {
        const elementStyles = prevStyles.get(change.selector) || {}
        const newElementStyles = { ...elementStyles, [change.property]: change.newValue }
        const newStyles = new Map(prevStyles)
        newStyles.set(change.selector, newElementStyles)
        
        return newStyles
      })
    } else if (change && change.type === 'batch') {
      // Handle batch redo
      change.changes.forEach(batchedChange => {
        if (batchedChange.type === 'style') {
          setActiveStyles(prevStyles => {
            const elementStyles = prevStyles.get(batchedChange.selector) || {}
            const newElementStyles = { ...elementStyles, [batchedChange.property]: batchedChange.newValue }
            const newStyles = new Map(prevStyles)
            newStyles.set(batchedChange.selector, newElementStyles)
            
            return newStyles
          })
        }
      })
    }
    
    return change
  }, [changeManager])

  /**
   * Get styles for a specific element
   */
  const getElementStyles = useCallback((selector) => {
    return activeStyles.get(selector) || {}
  }, [activeStyles])

  /**
   * Clear all active styles
   */
  const clearActiveStyles = useCallback(() => {
    setActiveStyles(new Map())
    changeManager.clearHistory()
  }, [changeManager])

  /**
   * Batch multiple style changes
   */
  const batchStyleChanges = useCallback((styleChanges, description = 'Batch style changes') => {
    const changes = styleChanges.map(({ selector, property, oldValue, newValue, filePath }) => ({
      type: 'style',
      selector,
      property,
      oldValue,
      newValue,
      filePath,
      description: `Change ${property} of ${selector}`
    }))
    
    // Apply all changes to active styles
    setActiveStyles(prevStyles => {
      const newStyles = new Map(prevStyles)
      
      styleChanges.forEach(({ selector, property, newValue }) => {
        const elementStyles = newStyles.get(selector) || {}
        const newElementStyles = { ...elementStyles, [property]: newValue }
        newStyles.set(selector, newElementStyles)
      })
      
      return newStyles
    })
    
    // Add to history as batch
    changeManager.batchChanges(changes, description)
  }, [changeManager])

  return {
    // Include all change manager functions
    ...changeManager,
    
    // Style-specific state
    activeStyles,
    
    // Style-specific actions
    applyStyleChange,
    undoStyleChange,
    redoStyleChange,
    getElementStyles,
    clearActiveStyles,
    batchStyleChanges
  }
}

export default useChangeManager