import { NextResponse } from 'next/server'
import { Daytona } from "@daytonaio/sdk"

const getDaytonaClient = () => {
  if (!process.env.DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY environment variable is required")
  }
  
  return new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  })
}

/**
 * Modify JSX files in the sandbox to update className attributes
 */
export async function POST(request, { params }) {
  try {
    const { id } = params
    const { filePath, elementSelector, newClassName, property, value } = await request.json()

    if (!id || !filePath || !elementSelector) {
      return NextResponse.json(
        { error: 'Project ID, file path, and element selector are required' },
        { status: 400 }
      )
    }

    const daytona = getDaytonaClient()
    const sandboxes = await daytona.list()
    const sandbox = sandboxes.find(s => s.id.includes(id))

    if (!sandbox) {
      return NextResponse.json(
        { error: 'Sandbox not found' },
        { status: 404 }
      )
    }

    const rootDir = await sandbox.getUserRootDir()
    const projectDir = `${rootDir}/project`
    const fullFilePath = `${projectDir}/${filePath}`

    // Read the current file content
    const readResult = await sandbox.process.executeCommand(
      `cat "${fullFilePath}"`,
      projectDir
    )

    if (readResult.exitCode !== 0) {
      return NextResponse.json(
        { error: `Failed to read file: ${readResult.result}` },
        { status: 500 }
      )
    }

    let fileContent = readResult.result

    // For now, we'll use a simple approach - update className attributes
    // In a production environment, you'd want to use a proper AST parser
    const updatedContent = updateClassNameInContent(fileContent, elementSelector, newClassName, property, value)

    if (updatedContent === fileContent) {
      return NextResponse.json({
        success: true,
        message: 'No changes needed',
        filePath
      })
    }

    // Write the updated content back to the file
    const writeCommand = `cat > "${fullFilePath}" << 'CURIO_EOF'
${updatedContent}
CURIO_EOF`

    const writeResult = await sandbox.process.executeCommand(
      writeCommand,
      projectDir
    )

    if (writeResult.exitCode !== 0) {
      return NextResponse.json(
        { error: `Failed to write file: ${writeResult.result}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File updated successfully',
      filePath,
      updatedContent: updatedContent.substring(0, 500) + '...' // Return first 500 chars for confirmation
    })

  } catch (error) {
    console.error('Error modifying file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Simple className update function
 * This is a basic implementation - in production you'd want to use a proper JSX/TSX parser
 */
function updateClassNameInContent(content, elementSelector, newClassName, property, value) {
  // Handle different types of updates
  if (property === 'textContent') {
    // Update text content within JSX elements
    return updateTextContent(content, elementSelector, value)
  } else {
    // Update className attribute
    return updateClassName(content, newClassName)
  }
}

function updateTextContent(content, elementSelector, newText) {
  // This is a simplified approach - in production you'd want more sophisticated parsing
  // For now, we'll look for common patterns and update text content
  
  // Basic regex patterns for common JSX text elements
  const patterns = [
    // <tag>text</tag>
    /(<(h[1-6]|p|span|div|button|a)[^>]*>)([^<]+)(<\/\2>)/gi,
    // <tag className="...">text</tag>
    /(<(h[1-6]|p|span|div|button|a)[^>]*className="[^"]*"[^>]*>)([^<]+)(<\/\2>)/gi
  ]

  let updatedContent = content
  
  patterns.forEach(pattern => {
    updatedContent = updatedContent.replace(pattern, (match, openTag, tagName, textContent, closeTag) => {
      // Simple heuristic - if the current text matches what we're trying to update
      if (textContent.trim() === newText.trim()) {
        return match // Already updated
      }
      // Update the first occurrence that seems like a reasonable match
      return `${openTag}${newText}${closeTag}`
    })
  })

  return updatedContent
}

function updateClassName(content, newClassName) {
  if (!newClassName) return content

  // Look for className attributes and update them
  // This is a simplified approach - in production you'd want proper AST parsing
  
  // Pattern to match className="existing classes"
  const classNamePattern = /className=["']([^"']*)["']/g
  
  let hasClassNameAttribute = false
  const updatedContent = content.replace(classNamePattern, (match, existingClasses) => {
    hasClassNameAttribute = true
    
    // Parse existing classes
    const classes = existingClasses.split(' ').filter(cls => cls.trim())
    
    // Split new classes
    const newClasses = newClassName.split(' ').filter(cls => cls.trim())
    
    // Merge classes, avoiding duplicates
    const mergedClasses = [...new Set([...classes, ...newClasses])]
    
    return `className="${mergedClasses.join(' ')}"`
  })

  // If no className attribute was found, we'd need to add it
  // This is complex without proper AST parsing, so we'll return the content as-is
  return hasClassNameAttribute ? updatedContent : content
}

/**
 * Get file list for a project
 */
export async function GET(request, { params }) {
  try {
    const { id } = params
    const url = new URL(request.url)
    const path = url.searchParams.get('path') || ''

    const daytona = getDaytonaClient()
    const sandboxes = await daytona.list()
    const sandbox = sandboxes.find(s => s.id.includes(id))

    if (!sandbox) {
      return NextResponse.json(
        { error: 'Sandbox not found' },
        { status: 404 }
      )
    }

    const rootDir = await sandbox.getUserRootDir()
    const projectDir = `${rootDir}/project`
    const targetPath = path ? `${projectDir}/${path}` : projectDir

    // List files in the directory
    const listResult = await sandbox.process.executeCommand(
      `find "${targetPath}" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | head -20`,
      projectDir
    )

    if (listResult.exitCode !== 0) {
      return NextResponse.json(
        { error: `Failed to list files: ${listResult.result}` },
        { status: 500 }
      )
    }

    const files = listResult.result
      .split('\n')
      .filter(file => file.trim())
      .map(file => ({
        path: file.replace(projectDir + '/', ''),
        name: file.split('/').pop(),
        type: 'file'
      }))

    return NextResponse.json({
      success: true,
      files,
      currentPath: path
    })

  } catch (error) {
    console.error('Error listing files:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}