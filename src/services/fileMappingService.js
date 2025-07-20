/**
 * File Mapping Service
 * Maps DOM elements to their corresponding CSS files and rules
 */

/**
 * Parse CSS content to extract selectors and their locations
 */
export function parseCSSSelectors(cssContent, fileName) {
  const selectors = []
  const lines = cssContent.split('\n')
  
  let currentRule = null
  let braceDepth = 0
  let inComment = false
  let inString = false
  let stringChar = null
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    let selectorBuffer = ''
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      // Handle comments
      if (!inString && char === '/' && nextChar === '*') {
        inComment = true
        i++ // Skip next char
        continue
      }
      
      if (inComment && char === '*' && nextChar === '/') {
        inComment = false
        i++ // Skip next char
        continue
      }
      
      if (inComment) continue
      
      // Handle strings
      if ((char === '"' || char === "'") && !inString) {
        inString = true
        stringChar = char
        continue
      }
      
      if (inString && char === stringChar && line[i - 1] !== '\\') {
        inString = false
        stringChar = null
        continue
      }
      
      if (inString) continue
      
      // Handle CSS rules
      if (char === '{') {
        braceDepth++
        
        if (braceDepth === 1 && selectorBuffer.trim()) {
          // Start of a new CSS rule
          currentRule = {
            selectors: selectorBuffer.trim().split(',').map(s => s.trim()),
            fileName,
            lineStart: lineNum + 1,
            lineEnd: null,
            properties: []
          }
        }
        selectorBuffer = ''
      } else if (char === '}') {
        braceDepth--
        
        if (braceDepth === 0 && currentRule) {
          // End of CSS rule
          currentRule.lineEnd = lineNum + 1
          selectors.push(currentRule)
          currentRule = null
        }
      } else if (braceDepth === 0) {
        // We're outside of rules, collecting selectors
        selectorBuffer += char
      } else if (braceDepth === 1 && currentRule) {
        // Inside a rule, collect properties
        const propertyMatch = line.substring(i).match(/^\s*([a-z-]+)\s*:\s*([^;]+);?/)
        if (propertyMatch) {
          currentRule.properties.push({
            property: propertyMatch[1],
            value: propertyMatch[2].trim(),
            line: lineNum + 1
          })
          i += propertyMatch[0].length - 1
        }
      }
    }
    
    // Handle selectors that span multiple lines
    if (braceDepth === 0 && selectorBuffer.trim() && !line.includes('{')) {
      // Continue building selector on next line
      if (lineNum < lines.length - 1) {
        selectorBuffer += ' '
      }
    }
  }
  
  return selectors
}

/**
 * Parse HTML content to find linked CSS files
 */
export function parseHTMLStylesheets(htmlContent) {
  const stylesheets = []
  
  // Match <link> tags for CSS
  const linkRegex = /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi
  let match
  
  while ((match = linkRegex.exec(htmlContent)) !== null) {
    stylesheets.push({
      type: 'external',
      href: match[1],
      tag: match[0]
    })
  }
  
  // Match <style> tags for inline CSS
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let styleIndex = 0
  
  while ((match = styleRegex.exec(htmlContent)) !== null) {
    stylesheets.push({
      type: 'inline',
      content: match[1],
      tag: match[0],
      id: `inline-${styleIndex++}`
    })
  }
  
  return stylesheets
}

/**
 * Calculate selector specificity
 */
export function calculateSpecificity(selector) {
  // Remove pseudo-elements and normalize
  const normalized = selector
    .replace(/::?[a-z-]+/gi, '')
    .replace(/\[[^\]]*\]/g, '[attr]')
    .replace(/\s+/g, ' ')
    .trim()
  
  let a = 0 // IDs
  let b = 0 // Classes, attributes, pseudo-classes
  let c = 0 // Elements
  
  // Count IDs
  a = (normalized.match(/#[a-z0-9_-]+/gi) || []).length
  
  // Count classes, attributes, pseudo-classes
  b += (normalized.match(/\.[a-z0-9_-]+/gi) || []).length
  b += (normalized.match(/\[[^\]]*\]/g) || []).length
  b += (normalized.match(/:[a-z-]+/gi) || []).length
  
  // Count elements
  const elements = normalized
    .replace(/#[a-z0-9_-]+/gi, '')
    .replace(/\.[a-z0-9_-]+/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/:[a-z-]+/gi, '')
    .split(/[\s>+~]/)
    .filter(part => part.trim() && part !== '*')
  
  c = elements.length
  
  return {
    a,
    b,
    c,
    value: a * 100 + b * 10 + c,
    string: `${a},${b},${c}`
  }
}

/**
 * Check if a selector matches an element
 */
export function selectorMatches(selector, element) {
  try {
    const normalizedSelector = selector.trim()
    
    // Basic matching patterns
    const patterns = {
      // Tag selector
      tag: /^[a-z][a-z0-9]*$/i,
      // ID selector
      id: /^#[a-z0-9_-]+$/i,
      // Class selector
      class: /^\.[a-z0-9_-]+$/i,
      // Attribute selector
      attribute: /^\[[^\]]+\]$/,
      // Descendant selector
      descendant: /\s+/,
      // Child selector
      child: /\s*>\s*/,
      // Adjacent sibling
      adjacent: /\s*\+\s*/,
      // General sibling
      sibling: /\s*~\s*/
    }
    
    // Simple selector matching
    if (patterns.tag.test(normalizedSelector)) {
      return element.tagName?.toLowerCase() === normalizedSelector.toLowerCase()
    }
    
    if (patterns.id.test(normalizedSelector)) {
      return element.id === normalizedSelector.substring(1)
    }
    
    if (patterns.class.test(normalizedSelector)) {
      const className = normalizedSelector.substring(1)
      return element.className?.split(' ').includes(className)
    }
    
    // For complex selectors, use a more sophisticated approach
    if (patterns.descendant.test(normalizedSelector) || 
        patterns.child.test(normalizedSelector) ||
        patterns.adjacent.test(normalizedSelector) ||
        patterns.sibling.test(normalizedSelector)) {
      
      // This would require DOM traversal - simplified for now
      const parts = normalizedSelector.split(/[\s>+~]/)
      const lastPart = parts[parts.length - 1].trim()
      
      return selectorMatches(lastPart, element)
    }
    
    // Compound selectors (e.g., div.class#id)
    if (normalizedSelector.includes('.') || normalizedSelector.includes('#')) {
      const parts = normalizedSelector.match(/^([a-z0-9]*)((?:\.[a-z0-9_-]+)*)((?:#[a-z0-9_-]+)*)$/i)
      
      if (parts) {
        const [, tag, classes, id] = parts
        
        // Check tag
        if (tag && element.tagName?.toLowerCase() !== tag.toLowerCase()) {
          return false
        }
        
        // Check ID
        if (id && element.id !== id.substring(1)) {
          return false
        }
        
        // Check classes
        if (classes) {
          const requiredClasses = classes.split('.').filter(c => c)
          const elementClasses = element.className?.split(' ') || []
          
          return requiredClasses.every(cls => elementClasses.includes(cls))
        }
        
        return true
      }
    }
    
    return false
  } catch (error) {
    console.warn('Error matching selector:', selector, error)
    return false
  }
}

/**
 * Find CSS rules that apply to a specific element
 */
export function findApplicableRules(element, cssRules) {
  const applicableRules = []
  
  for (const rule of cssRules) {
    for (const selector of rule.selectors) {
      if (selectorMatches(selector, element)) {
        const specificity = calculateSpecificity(selector)
        
        applicableRules.push({
          ...rule,
          matchingSelector: selector,
          specificity,
          score: specificity.value
        })
      }
    }
  }
  
  // Sort by specificity (higher specificity first)
  return applicableRules.sort((a, b) => b.score - a.score)
}

/**
 * Build a complete style map for a project
 */
export class FileMappingEngine {
  constructor() {
    this.cssRules = new Map() // fileName -> rules
    this.htmlFiles = new Map() // fileName -> stylesheets
    this.elementToRules = new Map() // elementSelector -> applicable rules
  }
  
  /**
   * Add CSS file to the mapping
   */
  addCSSFile(fileName, content) {
    const rules = parseCSSSelectors(content, fileName)
    this.cssRules.set(fileName, rules)
    return rules
  }
  
  /**
   * Add HTML file to the mapping
   */
  addHTMLFile(fileName, content) {
    const stylesheets = parseHTMLStylesheets(content)
    this.htmlFiles.set(fileName, stylesheets)
    return stylesheets
  }
  
  /**
   * Find all CSS rules that apply to an element
   */
  findRulesForElement(element) {
    const allRules = []
    
    // Collect all CSS rules from all files
    for (const [fileName, rules] of this.cssRules) {
      allRules.push(...rules)
    }
    
    return findApplicableRules(element, allRules)
  }
  
  /**
   * Find which files likely contain styles for an element
   */
  findFilesForElement(element) {
    const applicableRules = this.findRulesForElement(element)
    const fileMap = new Map()
    
    for (const rule of applicableRules) {
      if (!fileMap.has(rule.fileName)) {
        fileMap.set(rule.fileName, {
          fileName: rule.fileName,
          rules: [],
          relevanceScore: 0
        })
      }
      
      const fileInfo = fileMap.get(rule.fileName)
      fileInfo.rules.push(rule)
      fileInfo.relevanceScore += rule.score
    }
    
    // Sort by relevance (higher score = more relevant)
    return Array.from(fileMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }
  
  /**
   * Get CSS property suggestions for an element
   */
  getPropertySuggestions(element) {
    const applicableRules = this.findRulesForElement(element)
    const properties = new Map()
    
    for (const rule of applicableRules) {
      for (const prop of rule.properties) {
        if (!properties.has(prop.property)) {
          properties.set(prop.property, {
            property: prop.property,
            values: [],
            sources: []
          })
        }
        
        const propInfo = properties.get(prop.property)
        propInfo.values.push(prop.value)
        propInfo.sources.push({
          fileName: rule.fileName,
          line: prop.line,
          selector: rule.matchingSelector
        })
      }
    }
    
    return Array.from(properties.values())
  }
  
  /**
   * Clear all mappings
   */
  clear() {
    this.cssRules.clear()
    this.htmlFiles.clear()
    this.elementToRules.clear()
  }
  
  /**
   * Get statistics about the mapping
   */
  getStats() {
    let totalRules = 0
    let totalSelectors = 0
    
    for (const rules of this.cssRules.values()) {
      totalRules += rules.length
      totalSelectors += rules.reduce((sum, rule) => sum + rule.selectors.length, 0)
    }
    
    return {
      cssFiles: this.cssRules.size,
      htmlFiles: this.htmlFiles.size,
      totalRules,
      totalSelectors
    }
  }
}

// Export singleton instance
export const fileMappingEngine = new FileMappingEngine()

/**
 * Utility function to resolve relative CSS paths
 */
export function resolveCSSPath(htmlFilePath, cssHref) {
  // Handle absolute URLs
  if (cssHref.startsWith('http://') || cssHref.startsWith('https://')) {
    return cssHref
  }
  
  // Handle absolute paths
  if (cssHref.startsWith('/')) {
    return cssHref
  }
  
  // Handle relative paths
  const htmlDir = htmlFilePath.split('/').slice(0, -1).join('/')
  return htmlDir ? `${htmlDir}/${cssHref}` : cssHref
}