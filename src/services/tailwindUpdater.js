/**
 * Tailwind Class Updater Service
 * Handles updating Tailwind CSS classes in source files
 */

/**
 * Update className for an element in source files
 * @param {string} projectId - Project ID
 * @param {Object} element - The selected element data
 * @param {string} newClassName - New className value
 */
export async function updateElementClassName(projectId, element, newClassName) {
  try {
    console.log('[TailwindUpdater] Updating element:', element.selector, 'with classes:', newClassName)
    
    // Get project file structure
    const webFiles = await getWebFiles(projectId)
    
    // Find potential source files (HTML, JSX, etc.)
    const sourceFiles = webFiles.filter(file => 
      /\.(html|jsx?|tsx?)$/i.test(file.name)
    )
    
    console.log('[TailwindUpdater] Found source files:', sourceFiles.map(f => f.name))
    
    // Try to find and update the element in each file
    for (const file of sourceFiles) {
      const updated = await updateClassNameInFile(projectId, file.path, element, newClassName)
      if (updated) {
        console.log('[TailwindUpdater] Successfully updated file:', file.path)
        return true
      }
    }
    
    console.warn('[TailwindUpdater] Could not find element in any source file')
    return false
    
  } catch (error) {
    console.error('[TailwindUpdater] Error updating className:', error)
    throw error
  }
}

/**
 * Get web files for a project
 * @param {string} projectId - Project ID
 */
async function getWebFiles(projectId) {
  const response = await fetch(`/api/projects/${projectId}/inspector/files/structure?fileTypes=html,css,js,jsx,ts,tsx,scss,sass,less&includeHidden=false`)
  if (!response.ok) {
    throw new Error('Failed to get file structure')
  }
  const data = await response.json()
  return data.webFiles || []
}

/**
 * Update className in a specific file
 * @param {string} projectId - Project ID
 * @param {string} filePath - Path to the file
 * @param {Object} element - Element data
 * @param {string} newClassName - New className value
 */
async function updateClassNameInFile(projectId, filePath, element, newClassName) {
  try {
    // Read file content
    const content = await readFile(projectId, filePath)
    
    // Try to find and update the element
    const updatedContent = updateClassNameInContent(content, element, newClassName)
    
    if (updatedContent && updatedContent !== content) {
      // Write updated content back to file
      await writeFile(projectId, filePath, updatedContent)
      console.log('[TailwindUpdater] Updated file:', filePath)
      return true
    }
    
    return false
    
  } catch (error) {
    console.error('[TailwindUpdater] Error updating file:', filePath, error)
    return false
  }
}

/**
 * Read file content
 * @param {string} projectId - Project ID  
 * @param {string} filePath - File path
 */
async function readFile(projectId, filePath) {
  const response = await fetch(`/api/projects/${projectId}/inspector/files/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath })
  })
  if (!response.ok) {
    throw new Error('Failed to read file')
  }
  const data = await response.json()
  return data.content
}

/**
 * Write file content
 * @param {string} projectId - Project ID
 * @param {string} filePath - File path
 * @param {string} content - File content
 */
async function writeFile(projectId, filePath, content) {
  const response = await fetch(`/api/projects/${projectId}/inspector/files/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, content, createBackup: true })
  })
  if (!response.ok) {
    throw new Error('Failed to write file')
  }
  return await response.json()
}

/**
 * Update className in file content
 * @param {string} content - File content
 * @param {Object} element - Element data
 * @param {string} newClassName - New className value
 */
function updateClassNameInContent(content, element, newClassName) {
    try {
      // Extract element information
      const tagName = element.tagName
      const id = element.id
      const originalClassName = element.className
      
      console.log('[TailwindUpdater] Looking for element:', { tagName, id, originalClassName })
      
      // Strategy 1: Find by ID if available
      if (id) {
        const idPattern = new RegExp(
          `(<${tagName}[^>]*\\s+id=["']${id}["'][^>]*\\s+className=["'])[^"']*(['"][^>]*>)`,
          'gi'
        )
        const idReplacement = `$1${newClassName}$2`
        const withIdUpdate = content.replace(idPattern, idReplacement)
        if (withIdUpdate !== content) {
          return withIdUpdate
        }
        
        // Also try with class instead of className (for HTML)
        const idPatternHtml = new RegExp(
          `(<${tagName}[^>]*\\s+id=["']${id}["'][^>]*\\s+class=["'])[^"']*(['"][^>]*>)`,
          'gi'
        )
        const withIdUpdateHtml = content.replace(idPatternHtml, idReplacement)
        if (withIdUpdateHtml !== content) {
          return withIdUpdateHtml
        }
      }
      
      // Strategy 2: Find by original className if it's unique enough
      if (originalClassName && originalClassName.trim()) {
        const escapedClassName = escapeRegExp(originalClassName.trim())
        
        // For JSX (className)
        const classNamePattern = new RegExp(
          `(<${tagName}[^>]*\\s+className=["'])${escapedClassName}(['"][^>]*>)`,
          'gi'
        )
        const classNameReplacement = `$1${newClassName}$2`
        const withClassNameUpdate = content.replace(classNamePattern, classNameReplacement)
        if (withClassNameUpdate !== content) {
          return withClassNameUpdate
        }
        
        // For HTML (class)
        const classPattern = new RegExp(
          `(<${tagName}[^>]*\\s+class=["'])${escapedClassName}(['"][^>]*>)`,
          'gi'
        )
        const withClassUpdate = content.replace(classPattern, classNameReplacement)
        if (withClassUpdate !== content) {
          return withClassUpdate
        }
      }
      
      // Strategy 3: If no specific identifier, try to find the first occurrence of the tag
      // This is less reliable but might work for simple cases
      if (!id && !originalClassName) {
        const simplePattern = new RegExp(
          `(<${tagName}[^>]*\\s+(?:class|className)=["'])[^"']*(['"][^>]*>)`,
          'i'
        )
        const simpleReplacement = `$1${newClassName}$2`
        const withSimpleUpdate = content.replace(simplePattern, simpleReplacement)
        if (withSimpleUpdate !== content) {
          console.warn('[TailwindUpdater] Used simple pattern match - may have updated wrong element')
          return withSimpleUpdate
        }
      }
      
      return null // No match found
      
    } catch (error) {
      console.error('[TailwindUpdater] Error updating content:', error)
      return null
    }
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Check if a file likely contains the element
 * @param {string} content - File content
 * @param {Object} element - Element data
 */
function containsElement(content, element) {
    const tagName = element.tagName
    const id = element.id
    const className = element.className
    
    // Check for tag name
    if (!content.includes(`<${tagName}`)) {
      return false
    }
    
    // If element has ID, check for it
    if (id && content.includes(`id="${id}"`)) {
      return true
    }
    
    // If element has classes, check for some of them
    if (className) {
      const classes = className.split(' ').filter(c => c.trim())
      const hasMatchingClass = classes.some(cls => 
        content.includes(`"${cls}"`) || content.includes(`'${cls}'`)
      )
      if (hasMatchingClass) {
        return true
      }
    }
    
    // Default to possible match
    return true
}