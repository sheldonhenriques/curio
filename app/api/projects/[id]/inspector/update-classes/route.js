import { NextResponse } from 'next/server'
import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { join } from 'path'

/**
 * Update element classes in source files
 * POST /api/projects/[id]/inspector/update-classes
 */
export async function POST(request, { params }) {
  try {
    const { id: projectId } = params
    const { selector, tagName, id: elementId, oldClasses, newClasses } = await request.json()

    console.log('[Update Classes] Request:', { selector, tagName, elementId, oldClasses, newClasses })

    // Get project sandbox path (this would need to be implemented based on your sandbox setup)
    const sandboxPath = await getSandboxPath(projectId)
    if (!sandboxPath) {
      return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 })
    }

    // Find and update source files
    const sourceFiles = await findSourceFiles(sandboxPath)
    let updated = false

    for (const filePath of sourceFiles) {
      try {
        const content = await readFile(filePath, 'utf-8')
        const updatedContent = updateClassesInContent(content, {
          selector,
          tagName,
          elementId,
          oldClasses,
          newClasses
        })

        if (updatedContent && updatedContent !== content) {
          // Create backup
          await writeFile(filePath + '.backup', content)
          
          // Write updated content
          await writeFile(filePath, updatedContent)
          
          console.log('[Update Classes] Updated file:', filePath)
          updated = true
          break // Stop after first successful update
        }
      } catch (error) {
        console.error('[Update Classes] Error updating file:', filePath, error)
      }
    }

    return NextResponse.json({ 
      success: updated,
      message: updated ? 'Classes updated successfully' : 'No matching element found in source files'
    })

  } catch (error) {
    console.error('[Update Classes] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Get sandbox path for project
 */
async function getSandboxPath(projectId) {
  // This is a simplified version - you'd need to implement based on your Daytona setup
  // For now, we'll assume the sandbox is in a predictable location
  const possiblePaths = [
    `/tmp/sandbox-${projectId}`,
    `/workspaces/project-${projectId}`,
    `/app/sandbox/${projectId}`
  ]

  for (const path of possiblePaths) {
    try {
      const stats = await stat(path)
      if (stats.isDirectory()) {
        return path
      }
    } catch (error) {
      // Path doesn't exist, continue
    }
  }

  return null
}

/**
 * Find source files (HTML, JSX, etc.)
 */
async function findSourceFiles(basePath) {
  const sourceFiles = []
  const extensions = ['.html', '.jsx', '.js', '.tsx', '.ts']

  async function scanDirectory(dirPath) {
    try {
      const items = await readdir(dirPath)
      
      for (const item of items) {
        const itemPath = join(dirPath, item)
        
        try {
          const stats = await stat(itemPath)
          
          if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            await scanDirectory(itemPath)
          } else if (stats.isFile()) {
            const hasValidExtension = extensions.some(ext => item.endsWith(ext))
            if (hasValidExtension) {
              sourceFiles.push(itemPath)
            }
          }
        } catch (error) {
          // Skip files we can't access
        }
      }
    } catch (error) {
      // Skip directories we can't access
    }
  }

  await scanDirectory(basePath)
  return sourceFiles
}

/**
 * Update classes in file content
 */
function updateClassesInContent(content, { selector, tagName, elementId, oldClasses, newClasses }) {
  try {
    // Strategy 1: Find by ID if available
    if (elementId) {
      const patterns = [
        // JSX: id="elementId" className="..."
        new RegExp(`(<${tagName}[^>]*\\s+id=["']${elementId}["'][^>]*\\s+className=["'])[^"']*["']`, 'gi'),
        // HTML: id="elementId" class="..."
        new RegExp(`(<${tagName}[^>]*\\s+id=["']${elementId}["'][^>]*\\s+class=["'])[^"']*["']`, 'gi'),
        // JSX: className="..." id="elementId"
        new RegExp(`(<${tagName}[^>]*\\s+className=["'])[^"']*["']([^>]*\\s+id=["']${elementId}["'])`, 'gi'),
        // HTML: class="..." id="elementId"
        new RegExp(`(<${tagName}[^>]*\\s+class=["'])[^"']*["']([^>]*\\s+id=["']${elementId}["'])`, 'gi')
      ]

      for (const pattern of patterns) {
        const matches = content.match(pattern)
        if (matches) {
          return content.replace(pattern, (match, prefix, suffix = '') => {
            return `${prefix}${newClasses}"${suffix}`
          })
        }
      }
    }

    // Strategy 2: Find by old classes if unique enough
    if (oldClasses && oldClasses.length > 0) {
      const oldClassString = oldClasses.join(' ')
      const escapedOldClasses = escapeRegExp(oldClassString)
      
      const patterns = [
        // JSX: className="oldClasses"
        new RegExp(`(<${tagName}[^>]*\\s+className=["'])${escapedOldClasses}(["'])`, 'gi'),
        // HTML: class="oldClasses"
        new RegExp(`(<${tagName}[^>]*\\s+class=["'])${escapedOldClasses}(["'])`, 'gi')
      ]

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return content.replace(pattern, `$1${newClasses}$2`)
        }
      }
    }

    // Strategy 3: Find first occurrence of tagName with any class
    const patterns = [
      new RegExp(`(<${tagName}[^>]*\\s+className=["'])[^"']*["']`, 'i'),
      new RegExp(`(<${tagName}[^>]*\\s+class=["'])[^"']*["']`, 'i')
    ]

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        console.warn('[Update Classes] Using fallback pattern - may update wrong element')
        return content.replace(pattern, `$1${newClasses}"`)
      }
    }

    return null // No match found

  } catch (error) {
    console.error('[Update Classes] Error updating content:', error)
    return null
  }
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}