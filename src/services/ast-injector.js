#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

class ASTIdInjector {
  constructor() {
    this.elementCounter = 0;
  }

  async injectIds(filePath) {
    try {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      const componentName = this.getComponentName(filePath);
      
      this.elementCounter = 0;
      
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

      traverse(ast, {
        JSXElement: (path) => {
          this.injectIdIntoElement(path, componentName);
        },
        JSXFragment: (path) => {
          this.injectIdIntoElement(path, componentName);
        }
      });

      const result = generate(ast, {
        retainLines: true,
        compact: false
      });

      return result.code;
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      return fs.readFileSync(filePath, 'utf8');
    }
  }

  injectIdIntoElement(path, componentName) {
    const node = path.node;
    
    if (this.hasVisualId(node)) {
      return;
    }

    const elementId = this.generateElementId(node, componentName);
    
    const visualIdAttr = t.jsxAttribute(
      t.jsxIdentifier('data-visual-id'),
      t.stringLiteral(elementId)
    );

    if (node.openingElement) {
      node.openingElement.attributes.push(visualIdAttr);
    }
  }

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

  generateElementId(node, componentName) {
    const elementType = this.getElementType(node);
    const elementIndex = this.elementCounter++;
    
    return `${componentName}_${elementType}_${elementIndex}`;
  }

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

  getComponentName(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  async processDirectory(dirPath) {
    const results = [];
    
    const processFile = async (filePath) => {
      const ext = path.extname(filePath);
      if (['.jsx', '.tsx', '.js', '.ts'].includes(ext)) {
        try {
          const modifiedCode = await this.injectIds(filePath);
          fs.writeFileSync(filePath, modifiedCode, 'utf8');
          results.push({
            file: filePath,
            status: 'success',
            elementsProcessed: this.elementCounter
          });
        } catch (error) {
          console.error(`✗ Error processing ${filePath}:`, error.message);
          results.push({
            file: filePath,
            status: 'error',
            error: error.message
          });
        }
      }
    };

    const walkDirectory = async (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', '.next', '.git'].includes(item)) {
            await walkDirectory(fullPath);
          }
        } else {
          await processFile(fullPath);
        }
      }
    };

    await walkDirectory(dirPath);
    return results;
  }
}

// Main execution
async function main() {
  const targetDir = process.argv[2];
  
  if (!targetDir) {
    console.error('Usage: node ast-injector.js <target-directory>');
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory ${targetDir} does not exist`);
    process.exit(1);
  }

  const injector = new ASTIdInjector();
  
  try {
    const results = await injector.processDirectory(targetDir);
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    
    if (failed.length > 0) {
      console.error('\nFailed files:');
      failed.forEach(result => {
        console.error(`  - ${result.file}: ${result.error}`);
      });
    }
    
  } catch (error) {
    console.error('AST ID injection failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ASTIdInjector };