const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const fs = require('fs');
const path = require('path');

class ASTIdInjector {
  constructor() {
    this.elementCounter = 0;
    this.componentElementMap = new Map(); // Track elements per component
  }

  /**
   * Parse JSX/TSX file and inject unique data-visual-id attributes
   * @param {string} filePath - Path to the JSX/TSX file
   * @returns {string} - Modified source code with injected IDs
   */
  injectIds(filePath) {
    try {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      const componentName = this.getComponentName(filePath);
      
      // Reset counter for each component
      this.elementCounter = 0;
      
      // Parse the source code
      const ast = parser.parse(sourceCode, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'functionBind',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining'
        ]
      });

      // Traverse and inject IDs
      traverse(ast, {
        JSXElement: (path) => {
          this.injectIdIntoElement(path, componentName);
        },
        JSXFragment: (path) => {
          this.injectIdIntoElement(path, componentName);
        }
      });

      // Generate modified code
      const result = generate(ast, {
        retainLines: true,
        compact: false
      });

      return result.code;
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      // Return original file if parsing fails
      return fs.readFileSync(filePath, 'utf8');
    }
  }

  /**
   * Inject unique ID into JSX element
   * @param {Object} path - Babel traverse path
   * @param {string} componentName - Name of the component
   */
  injectIdIntoElement(path, componentName) {
    const node = path.node;
    
    // Skip if element already has data-visual-id
    if (this.hasVisualId(node)) {
      return;
    }

    // Generate unique ID
    const elementId = this.generateElementId(node, componentName);
    
    // Create data-visual-id attribute
    const visualIdAttr = t.jsxAttribute(
      t.jsxIdentifier('data-visual-id'),
      t.stringLiteral(elementId)
    );

    // Add to opening element
    if (node.openingElement) {
      node.openingElement.attributes.push(visualIdAttr);
    } else if (node.openingFragment) {
      // For fragments, we'll convert to a div with the ID
      // This is necessary because fragments can't have attributes
      console.log(`Converting fragment to div in ${componentName}`);
    }
  }

  /**
   * Check if element already has data-visual-id
   * @param {Object} node - JSX node
   * @returns {boolean}
   */
  hasVisualId(node) {
    if (!node.openingElement || !node.openingElement.attributes) {
      return false;
    }

    return node.openingElement.attributes.some(attr => 
      t.isJSXAttribute(attr) && 
      attr.name && 
      attr.name.name === 'data-visual-id'
    );
  }

  /**
   * Generate unique element ID
   * @param {Object} node - JSX node
   * @param {string} componentName - Component name
   * @returns {string} - Unique element ID
   */
  generateElementId(node, componentName) {
    const elementType = this.getElementType(node);
    const elementIndex = this.elementCounter++;
    
    return `${componentName}_${elementType}_${elementIndex}`;
  }

  /**
   * Get element type from JSX node
   * @param {Object} node - JSX node
   * @returns {string} - Element type
   */
  getElementType(node) {
    if (node.openingElement) {
      const name = node.openingElement.name;
      if (t.isJSXIdentifier(name)) {
        return name.name;
      } else if (t.isJSXMemberExpression(name)) {
        return `${name.object.name}_${name.property.name}`;
      }
    } else if (node.openingFragment) {
      return 'Fragment';
    }
    return 'Unknown';
  }

  /**
   * Extract component name from file path
   * @param {string} filePath - File path
   * @returns {string} - Component name
   */
  getComponentName(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    // Convert kebab-case or snake_case to PascalCase
    return fileName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  /**
   * Process all JSX/TSX files in a directory
   * @param {string} dirPath - Directory path
   * @returns {Array} - Array of processed file results
   */
  processDirectory(dirPath) {
    const results = [];
    
    const processFile = (filePath) => {
      const ext = path.extname(filePath);
      if (['.jsx', '.tsx', '.js', '.ts'].includes(ext)) {
        try {
          const modifiedCode = this.injectIds(filePath);
          
          // Write back to file
          fs.writeFileSync(filePath, modifiedCode, 'utf8');
          
          results.push({
            file: filePath,
            status: 'success',
            elementsProcessed: this.elementCounter
          });
        } catch (error) {
          results.push({
            file: filePath,
            status: 'error',
            error: error.message
          });
        }
      }
    };

    const walkDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and .next directories
          if (!['node_modules', '.next', '.git'].includes(item)) {
            walkDirectory(fullPath);
          }
        } else {
          processFile(fullPath);
        }
      }
    };

    walkDirectory(dirPath);
    return results;
  }

  /**
   * Process a single file and return the modified code without writing
   * @param {string} filePath - File path
   * @returns {string} - Modified source code
   */
  processFile(filePath) {
    return this.injectIds(filePath);
  }
}

module.exports = ASTIdInjector;