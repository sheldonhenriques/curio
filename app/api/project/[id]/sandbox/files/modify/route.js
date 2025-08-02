import { NextResponse } from 'next/server'
import { Daytona } from "@daytonaio/sdk"
import { createClient } from '@/utils/supabase/server'

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
    const { id } = await params
    const requestBody = await request.json()
    
    const { filePath, elementSelector, visualId, newClassName, property, value } = requestBody

    if (!id || (!elementSelector && !visualId)) {
      return NextResponse.json(
        { error: 'Project ID and element selector or visualId are required' },
        { status: 400 }
      )
    }

    // Get the project to find the actual sandbox ID
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .single()
    
    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    if (!project.sandbox_id) {
      return NextResponse.json(
        { error: 'No sandbox associated with this project' },
        { status: 400 }
      )
    }

    const daytona = getDaytonaClient()
    const sandboxes = await daytona.list()
    const sandbox = sandboxes.find(s => s.id === project.sandbox_id)

    if (!sandbox) {
      return NextResponse.json(
        { error: 'Sandbox not found' },
        { status: 404 }
      )
    }
    
    // Refresh sandbox data to get current state
    await sandbox.refreshData()
    const sandboxState = sandbox.state
    
    // Check if sandbox is running
    if (sandboxState !== 'started') {
      return NextResponse.json(
        { 
          error: `Sandbox is not running (state: ${sandboxState}). Please start the sandbox first.`,
          sandboxStatus: sandboxState
        },
        { status: 400 }
      )
    }

    const rootDir = await sandbox.getUserRootDir()
    const projectDir = `${rootDir}/project`
    
    // If no file path provided, try to find the main page file
    let targetFilePath = filePath
    if (!targetFilePath) {
      const possiblePaths = [
        'src/app/page.tsx',
        'src/app/page.jsx', 
        'src/app/page.js',
        'pages/index.tsx',
        'pages/index.jsx',
        'pages/index.js',
        'app/page.tsx',
        'app/page.jsx',
        'app/page.js'
      ]
      
      for (const path of possiblePaths) {
        const checkResult = await sandbox.process.executeCommand(
          `test -f "${projectDir}/${path}" && echo "exists"`,
          projectDir
        )
        if (checkResult.result.trim() === 'exists') {
          targetFilePath = path
          break
        }
      }
      
      if (!targetFilePath) {
        return NextResponse.json(
          { error: 'Could not find main page file. Please specify filePath.' },
          { status: 404 }
        )
      }
    }
    
    const fullFilePath = `${projectDir}/${targetFilePath}`

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

    // Use AST-injected visualId or fallback to selector-based approach
    const hasVisualId = visualId ? fileContent.includes(`data-visual-id="${visualId}"`) : false
    console.log('File modification attempt:', {
      filePath: targetFilePath,
      visualId,
      property,
      value,
      fileContentLength: fileContent.length,
      hasVisualId,
      usingFallback: !hasVisualId && visualId ? 'tag-based' : 'none'
    })
    
    const updatedContent = updateClassNameInContent(fileContent, visualId, newClassName, property, value)

    if (updatedContent === fileContent) {
      console.log('No changes made - element not found or content identical')
      return NextResponse.json({
        success: true,
        message: 'No changes needed',
        filePath: targetFilePath,
        debug: {
          visualId,
          hasVisualId: fileContent.includes(`data-visual-id="${visualId}"`),
          fileLength: fileContent.length
        }
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
      filePath: targetFilePath,
      updatedContent: updatedContent.substring(0, 500) + '...' // Return first 500 chars for confirmation
    })

  } catch (error) {
    console.error('File modification error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * AST-based element update function
 * Uses visualId for precise targeting, falls back to selector-based approach
 */
function updateClassNameInContent(content, visualId, newClassName, property, value) {
  
  // Handle different types of updates
  if (property === 'textContent') {
    // Update text content within JSX elements
    return updateTextContentById(content, visualId, value)
  } else {
    // Update className attribute
    return updateClassNameById(content, visualId, newClassName)
  }
}

// Legacy functions removed - we now use AST-injected data-visual-id attributes

function updateTextContentById(content, visualId, newText) {
  // Sanitize the new text to prevent JSX syntax issues
  const sanitizedText = sanitizeTextForJSX(newText)
  
  // Try visual ID first if available
  if (visualId) {
    const idPattern = new RegExp(`(data-visual-id="${visualId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`, 'g')
    const match = content.match(idPattern)
    
    if (match) {
      // Continue with existing visual ID logic
      return updateTextContentWithVisualId(content, visualId, sanitizedText)
    }
  }
  
  // Fallback approach: try to extract tag name from visualId and update first matching element
  if (visualId && visualId.includes('_')) {
    const parts = visualId.split('_')
    if (parts.length >= 2) {
      const tagName = parts[1] // Extract tag name from visualId pattern like "Page_h1_0"
      return updateTextContentByTagName(content, tagName, sanitizedText)
    }
  }
  
  // Final fallback
  return updateTextContentFallback(content, sanitizedText)
}

function updateTextContentWithVisualId(content, visualId, sanitizedText) {
  // More precise pattern to find the element and its content
  // Handle both self-closing and container elements
  const elementPattern = new RegExp(`(<[^>]*data-visual-id="${visualId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>)([\\s\\S]*?)(<\/[^>]+>)`, 'g')
  
  let updatedContent = content
  let wasUpdated = false
  
  updatedContent = updatedContent.replace(elementPattern, (match, openTag, innerContent, closeTag) => {
    if (!wasUpdated) {
      // Strategy: Replace the entire inner content with the new text, but preserve certain nested elements
      // This is a more reliable approach for complex JSX structures
      
      // Check if this looks like a complex JSX structure with mixed content
      const hasNestedElements = /<[^>]+>/g.test(innerContent);
      const hasJSXExpressions = /\{[^}]*\}/g.test(innerContent);
      
      if (hasNestedElements || hasJSXExpressions) {
        // Analyze the content structure similar to the NextJS inspector
        const contentAnalysis = analyzeContentStructure(innerContent);
        
        if (contentAnalysis.strategy === 'preserve_with_text_replacement') {
          // Strategy: Preserve important elements but replace text content
          const updatedInner = replaceTextInComplexContent(innerContent, sanitizedText, contentAnalysis);
          wasUpdated = true;
          return `${openTag}${updatedInner}${closeTag}`;
        }
        
        // Pattern 1: Text after nested elements (like "Deploy now" after <Image>)
        const afterElementsMatch = innerContent.match(/^([\s\S]*>)\s*([^<{]+?)\s*$/);
        
        if (afterElementsMatch && afterElementsMatch[2].trim()) {
          // Found text after nested elements - this is likely the main text content
          const beforeText = afterElementsMatch[1];
          const originalText = afterElementsMatch[2].trim();
          
          // Replace just the trailing text part, preserving whitespace structure
          const updatedInner = `${beforeText}\n            ${sanitizedText}\n          `;
          wasUpdated = true;
          return `${openTag}${updatedInner}${closeTag}`;
        }
        
        // Pattern 2: Text with JSX expressions like "Get started by editing{" "} <code>..."
        const textWithExpressionMatch = innerContent.match(/^(\s*)([^<{]+?)(\{[^}]*\}\s*<[\s\S]*)/);
        
        if (textWithExpressionMatch && textWithExpressionMatch[2].trim()) {
          const leadingSpace = textWithExpressionMatch[1];
          const originalText = textWithExpressionMatch[2].trim();
          const afterExpression = textWithExpressionMatch[3];
          
          // Replace the initial text but keep the JSX expression and nested elements
          const updatedInner = `${leadingSpace}${sanitizedText}${afterExpression}`;
          wasUpdated = true;
          return `${openTag}${updatedInner}${closeTag}`;
        }
        
        // Strategy 2: Look for text between JSX expressions and elements
        
        // Extract all text segments that aren't inside JSX elements or expressions
        const segments = innerContent.split(/(<[^>]+>|\{[^}]*\})/g);
        
        let mainTextSegment = null;
        let mainTextIndex = -1;
        
        segments.forEach((segment, index) => {
          // Skip JSX elements and expressions
          if (!segment.match(/^<[^>]+>$/) && !segment.match(/^\{[^}]*\}$/)) {
            const trimmed = segment.trim();
            if (trimmed && trimmed.length > 2) { // Ignore very short segments like spaces
              if (!mainTextSegment || trimmed.length > mainTextSegment.length) {
                mainTextSegment = trimmed;
                mainTextIndex = index;
              }
            }
          }
        });
        
        if (mainTextSegment && mainTextIndex !== -1) {
          segments[mainTextIndex] = segments[mainTextIndex].replace(mainTextSegment, sanitizedText);
          const updatedInner = segments.join('');
          wasUpdated = true;
          return `${openTag}${updatedInner}${closeTag}`;
        }
        
        // Strategy 3: If we can't find a clear text segment, replace everything but preserve key nested elements
        const preservePatterns = [
          /<Image[^>]*\/?>.*?(?:<\/Image>)?/gi,
          /<code[^>]*>.*?<\/code>/gi,
          /<span[^>]*>.*?<\/span>/gi,
          /<em[^>]*>.*?<\/em>/gi,
          /<strong[^>]*>.*?<\/strong>/gi
        ];
        
        let hasPreservableElements = false;
        for (const pattern of preservePatterns) {
          if (pattern.test(innerContent)) {
            hasPreservableElements = true;
            break;
          }
        }
        
        if (hasPreservableElements) {
          // For now, just replace with the new text - this is the safest approach
          wasUpdated = true;
          return `${openTag}${sanitizedText}${closeTag}`;
        }
        
        // Fallback: replace entire content
        wasUpdated = true;
        return `${openTag}${sanitizedText}${closeTag}`;
        
      } else {
        // Simple text content - straightforward replacement
        wasUpdated = true;
        return `${openTag}${sanitizedText}${closeTag}`;
      }
    }
    return match
  })
  
  if (!wasUpdated) {
    // Last resort: find the element and replace everything inside
    const ultimateFallback = new RegExp(`(<[^>]*data-visual-id="${visualId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>)[\\s\\S]*?(<\/[^>]+>)`, 'g')
    
    updatedContent = updatedContent.replace(ultimateFallback, (_, openTag, closeTag) => {
      return `${openTag}${sanitizedText}${closeTag}`;
    });
  }
  
  // Note: We don't remove data-visual-id as it's permanently injected by AST parser
  return updatedContent
}

function updateTextContentByTagName(content, tagName, sanitizedText) {
  console.log(`🔄 Using tag-based fallback for ${tagName}`)
  
  // Try the specific tag first
  let tagPattern = new RegExp(`(<${tagName}[^>]*>)([\\s\\S]*?)(<\/${tagName}>)`, 'i')
  
  let updatedContent = content
  let wasUpdated = false
  
  updatedContent = updatedContent.replace(tagPattern, (match, openTag, innerContent, closeTag) => {
    if (wasUpdated) return match
    
    console.log(`✅ Updated ${tagName} element using tag-based fallback`)
    wasUpdated = true
    return `${openTag}${sanitizedText}${closeTag}`
  })
  
  // If specific tag failed, try common alternatives based on the tag type
  if (!wasUpdated) {
    console.log(`❌ Tag-based fallback failed - no ${tagName} element found`)
    
    // Try alternative elements based on context
    const alternativeElements = getAlternativeElements(tagName)
    for (const altTag of alternativeElements) {
      console.log(`🔄 Trying alternative element: ${altTag}`)
      const altPattern = new RegExp(`(<${altTag}[^>]*>)([\\s\\S]*?)(<\/${altTag}>)`, 'i')
      
      updatedContent = updatedContent.replace(altPattern, (match, openTag, innerContent, closeTag) => {
        if (wasUpdated) return match
        
        console.log(`✅ Updated ${altTag} element using alternative fallback`)
        wasUpdated = true
        return `${openTag}${sanitizedText}${closeTag}`
      })
      
      if (wasUpdated) break
    }
  }
  
  if (!wasUpdated) {
    console.log(`❌ All tag-based fallbacks failed`)
  }
  
  return updatedContent
}

function getAlternativeElements(originalTag) {
  const alternatives = {
    'li': ['p', 'div', 'span'], // List items often become paragraphs or divs
    'p': ['div', 'span', 'li'], // Paragraphs might be divs or spans
    'span': ['p', 'div', 'li'], // Spans might be paragraphs or divs
    'div': ['p', 'section', 'article'], // Divs might be paragraphs or semantic elements
    'h1': ['h2', 'h3', 'div', 'p'], // Headings might be other headings or text elements
    'h2': ['h1', 'h3', 'div', 'p'],
    'h3': ['h2', 'h4', 'div', 'p'],
    'h4': ['h3', 'h5', 'div', 'p'],
    'h5': ['h4', 'h6', 'div', 'p'],
    'h6': ['h5', 'div', 'p']
  }
  
  return alternatives[originalTag] || ['div', 'p', 'span'] // Default alternatives
}

function updateClassNameById(content, visualId, newClassName) {
  if (!newClassName) {
    return content
  }
  
  // Try visual ID first if available
  if (visualId) {
    const elementPattern = new RegExp(`(<[^>]*)(data-visual-id="${visualId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")([^>]*>)`, 'g')
    
    let updatedContent = content
    let wasUpdated = false
    
    updatedContent = updatedContent.replace(elementPattern, (match, _beforeId, _visualIdAttr, afterId) => {
      if (wasUpdated) return match
      
      // Check if className already exists in the element
      const classNamePattern = /className=["']([^"']*)["']/
      const classNameMatch = match.match(classNamePattern)
      
      let updatedElement
      if (classNameMatch) {
        // Update existing className
        const existingClasses = classNameMatch[1].split(' ').filter(cls => cls.trim())
        const newClasses = newClassName.split(' ').filter(cls => cls.trim())
        
        // Remove conflicting classes and add new ones
        const cleanedClasses = removeConflictingTailwindClasses(existingClasses, newClasses)
        const mergedClasses = [...new Set([...cleanedClasses, ...newClasses])]
        
        updatedElement = match.replace(classNamePattern, `className="${mergedClasses.join(' ')}"`)
      } else {
        // Add new className attribute
        updatedElement = match.replace(afterId, ` className="${newClassName}"${afterId}`)
      }
      
      wasUpdated = true
      return updatedElement
    })
    
    if (wasUpdated) {
      return updatedContent
    }
  }
  
  // Fallback: try to update the first matching element by tag name if visualId contains tag info
  if (visualId && visualId.includes('_')) {
    const parts = visualId.split('_')
    if (parts.length >= 2) {
      const tagName = parts[1] // Extract tag name from visualId pattern like "Page_h1_0"
      console.log(`🔄 Using tag-based className fallback for ${tagName}`)
      const tagPattern = new RegExp(`(<${tagName}[^>]*>)`, 'i')
      
      let updatedContent = content
      let wasUpdated = false
      
      updatedContent = updatedContent.replace(tagPattern, (match) => {
        if (wasUpdated) return match
        
        const classNamePattern = /className=["']([^"']*)["']/
        const classNameMatch = match.match(classNamePattern)
        
        let updatedElement
        if (classNameMatch) {
          const existingClasses = classNameMatch[1].split(' ').filter(cls => cls.trim())
          const newClasses = newClassName.split(' ').filter(cls => cls.trim())
          const cleanedClasses = removeConflictingTailwindClasses(existingClasses, newClasses)
          const mergedClasses = [...new Set([...cleanedClasses, ...newClasses])]
          updatedElement = match.replace(classNamePattern, `className="${mergedClasses.join(' ')}"`)
        } else {
          updatedElement = match.replace('>', ` className="${newClassName}">`)
        }
        
        console.log(`✅ Updated ${tagName} className using tag-based fallback`)
        wasUpdated = true
        return updatedElement
      })
      
      if (wasUpdated) {
        return updatedContent
      } else {
        console.log(`❌ Tag-based className fallback failed - no ${tagName} element found`)
        
        // Try alternative elements
        const alternativeElements = getAlternativeElements(tagName)
        for (const altTag of alternativeElements) {
          console.log(`🔄 Trying alternative className element: ${altTag}`)
          const altPattern = new RegExp(`(<${altTag}[^>]*>)`, 'i')
          
          updatedContent = updatedContent.replace(altPattern, (match) => {
            if (wasUpdated) return match
            
            const classNamePattern = /className=["']([^"']*)["']/
            const classNameMatch = match.match(classNamePattern)
            
            let updatedElement
            if (classNameMatch) {
              const existingClasses = classNameMatch[1].split(' ').filter(cls => cls.trim())
              const newClasses = newClassName.split(' ').filter(cls => cls.trim())
              const cleanedClasses = removeConflictingTailwindClasses(existingClasses, newClasses)
              const mergedClasses = [...new Set([...cleanedClasses, ...newClasses])]
              updatedElement = match.replace(classNamePattern, `className="${mergedClasses.join(' ')}"`)
            } else {
              updatedElement = match.replace('>', ` className="${newClassName}">`)
            }
            
            console.log(`✅ Updated ${altTag} className using alternative fallback`)
            wasUpdated = true
            return updatedElement
          })
          
          if (wasUpdated) {
            return updatedContent
          }
        }
      }
    }
  }
  
  // Final fallback: use general className update
  return updateClassName(content, newClassName)
}


// Fallback function for when we can't parse the selector properly
function updateTextContentFallback(content, newText) {
  
  // Look for the most prominent text-containing elements in order of priority
  const patterns = [
    /(<h1[^>]*>)([^<]+)(<\/h1>)/gi,
    /(<h2[^>]*>)([^<]+)(<\/h2>)/gi,
    /(<h3[^>]*>)([^<]+)(<\/h3>)/gi,
    /(<title[^>]*>)([^<]+)(<\/title>)/gi,
    /(<p[^>]*>)([^<]+)(<\/p>)/gi
  ]
  
  for (const pattern of patterns) {
    const matches = [...content.matchAll(pattern)]
    if (matches.length > 0) {
      let updateCount = 0
      const updatedContent = content.replace(pattern, (match, openTag, __, closeTag) => {
        if (updateCount === 0) {
          updateCount++
          return `${openTag}${newText}${closeTag}`
        }
        return match
      })
      
      return updatedContent
    }
  }
  
  return content
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
    
    // Remove conflicting Tailwind classes
    const cleanedClasses = removeConflictingTailwindClasses(classes, newClasses)
    
    // Merge classes, avoiding duplicates
    const mergedClasses = [...new Set([...cleanedClasses, ...newClasses])]
    
    return `className="${mergedClasses.join(' ')}"`
  })

  // If no className attribute was found, try to add it to the first JSX element
  if (!hasClassNameAttribute) {
    // Look for JSX opening tags and add className to the first one
    const jsxPattern = /<(\w+)([^>]*?)>/
    const match = content.match(jsxPattern)
    if (match) {
      const [fullMatch, tagName, attributes] = match
      const newTag = `<${tagName}${attributes} className="${newClassName}">`
      return content.replace(fullMatch, newTag)
    }
  }

  return hasClassNameAttribute ? updatedContent : content
}

// Helper function to remove conflicting Tailwind classes
function removeConflictingTailwindClasses(existingClasses, newClasses) {
  const conflicts = {
    // Margin conflicts
    'm-': ['m-', 'mt-', 'mr-', 'mb-', 'ml-', 'mx-', 'my-'],
    'mt-': ['m-', 'mt-', 'my-'],
    'mr-': ['m-', 'mr-', 'mx-'],
    'mb-': ['m-', 'mb-', 'my-'],
    'ml-': ['m-', 'ml-', 'mx-'],
    'mx-': ['m-', 'mx-', 'ml-', 'mr-'],
    'my-': ['m-', 'my-', 'mt-', 'mb-'],
    
    // Padding conflicts
    'p-': ['p-', 'pt-', 'pr-', 'pb-', 'pl-', 'px-', 'py-'],
    'pt-': ['p-', 'pt-', 'py-'],
    'pr-': ['p-', 'pr-', 'px-'],
    'pb-': ['p-', 'pb-', 'py-'],
    'pl-': ['p-', 'pl-', 'px-'],
    'px-': ['p-', 'px-', 'pl-', 'pr-'],
    'py-': ['p-', 'py-', 'pt-', 'pb-'],
    
    // Text size conflicts
    'text-': ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'],
    
    // Font weight conflicts
    'font-': ['font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-black'],
    
    // Display conflicts
    'block': ['block', 'inline', 'inline-block', 'flex', 'grid', 'hidden'],
    'inline': ['block', 'inline', 'inline-block', 'flex', 'grid', 'hidden'],
    'flex': ['block', 'inline', 'inline-block', 'flex', 'grid', 'hidden'],
    'grid': ['block', 'inline', 'inline-block', 'flex', 'grid', 'hidden'],
    'hidden': ['block', 'inline', 'inline-block', 'flex', 'grid', 'hidden']
  }
  
  let cleanedClasses = [...existingClasses]
  
  newClasses.forEach(newClass => {
    // Find conflict patterns for this new class
    const conflictPatterns = Object.keys(conflicts).filter(pattern => {
      if (pattern.endsWith('-')) {
        return newClass.startsWith(pattern)
      }
      return newClass === pattern
    })
    
    conflictPatterns.forEach(pattern => {
      const conflictingClasses = conflicts[pattern]
      cleanedClasses = cleanedClasses.filter(existingClass => {
        return !conflictingClasses.some(conflict => {
          if (conflict.endsWith('-')) {
            return existingClass.startsWith(conflict)
          }
          return existingClass === conflict
        })
      })
    })
  })
  
  return cleanedClasses
}

/**
 * Analyze content structure to determine the best replacement strategy
 * Inspired by the NextJS inspector approach
 */
function analyzeContentStructure(content) {
  const analysis = {
    hasDirectText: false,
    hasNestedElements: false,
    hasJSXExpressions: false,
    hasImportantElements: false,
    textSegments: [],
    strategy: 'simple'
  };

  // Check for direct text nodes (text that's not inside other elements)
  const directTextMatch = content.match(/^\s*([^<{]+)/);
  if (directTextMatch && directTextMatch[1].trim()) {
    analysis.hasDirectText = true;
    analysis.textSegments.push({
      type: 'direct_text',
      content: directTextMatch[1].trim(),
      position: 'start'
    });
  }

  // Check for nested elements
  analysis.hasNestedElements = /<[^>]+>/g.test(content);

  // Check for JSX expressions
  analysis.hasJSXExpressions = /\{[^}]*\}/g.test(content);

  // Check for important elements that should be preserved
  const importantElements = ['Image', 'code', 'img', 'svg', 'span', 'em', 'strong'];
  analysis.hasImportantElements = importantElements.some(tag => 
    new RegExp(`<${tag}[^>]*>`, 'i').test(content)
  );

  // Look for text after nested elements (common pattern: <Image /> Text)
  const afterElementsMatch = content.match(/^([\s\S]*>)\s*([^<{]+?)\s*$/);
  if (afterElementsMatch && afterElementsMatch[2].trim()) {
    analysis.textSegments.push({
      type: 'trailing_text',
      content: afterElementsMatch[2].trim(),
      position: 'end',
      beforeContent: afterElementsMatch[1]
    });
  }

  // Look for text before JSX expressions
  const beforeExpressionMatch = content.match(/^(\s*)([^<{]+?)(\{[^}]*\})/);
  if (beforeExpressionMatch && beforeExpressionMatch[2].trim()) {
    analysis.textSegments.push({
      type: 'text_before_expression',
      content: beforeExpressionMatch[2].trim(),
      position: 'start',
      leadingSpace: beforeExpressionMatch[1],
      afterContent: beforeExpressionMatch[3]
    });
  }

  // Determine strategy
  if (analysis.hasImportantElements && analysis.textSegments.length > 0) {
    analysis.strategy = 'preserve_with_text_replacement';
  } else if (analysis.textSegments.length > 0) {
    analysis.strategy = 'smart_text_replacement';
  } else {
    analysis.strategy = 'full_replacement';
  }

  return analysis;
}

/**
 * Replace text in complex content while preserving important elements
 */
function replaceTextInComplexContent(content, newText, analysis) {
  let updatedContent = content;

  // Sort text segments by position preference (trailing text first, then start text)
  const sortedSegments = analysis.textSegments.sort((a, b) => {
    if (a.type === 'trailing_text') return -1;
    if (b.type === 'trailing_text') return 1;
    return 0;
  });

  // Replace the most prominent text segment
  const primarySegment = sortedSegments[0];
  if (primarySegment) {
    switch (primarySegment.type) {
      case 'trailing_text':
        // Replace text that comes after nested elements
        updatedContent = `${primarySegment.beforeContent}\n            ${newText}\n          `;
        break;
      
      case 'text_before_expression':
        // Replace text that comes before JSX expressions
        const remainingContent = content.substring(
          primarySegment.leadingSpace.length + primarySegment.content.length
        );
        updatedContent = `${primarySegment.leadingSpace}${newText}${remainingContent}`;
        break;
      
      case 'direct_text':
        // Replace direct text at the start
        updatedContent = content.replace(primarySegment.content, newText);
        break;
    }
  }

  return updatedContent;
}

/**
 * Sanitize text content to prevent JSX syntax issues
 */
function sanitizeTextForJSX(text) {
  if (!text) return text;
  
  // Remove or escape characters that could break JSX
  return text
    .replace(/</g, '&lt;')  // Escape < characters
    .replace(/>/g, '&gt;')  // Escape > characters  
    .replace(/\{/g, '&#123;') // Escape { characters
    .replace(/\}/g, '&#125;') // Escape } characters
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Get file list for a project
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params
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
    console.error('File modification error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}