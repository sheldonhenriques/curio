import { NextResponse } from 'next/server';
import { Daytona } from '@daytonaio/sdk';
import ASTIdInjector from '../../../../../../src/services/astIdInjector.js';
import { getProjectByIdInternal } from '../../../../../../src/utils/supabase/service.js';
import fs from 'fs';
import path from 'path';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { targetFile } = body;
    const client = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });
    
    // Get project to find sandbox ID using service client
    try {
      var projectData = await getProjectByIdInternal(id);
    } catch (error) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    if (!projectData.sandboxId) {
      return NextResponse.json({ error: 'No sandbox found for this project' }, { status: 404 });
    }

    // Get workspace info
    const sandboxes = await client.list();
    const sandbox = sandboxes.find(s => s.id === projectData.sandboxId);
    
    if (!sandbox) {
      return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 });
    }

    // Execute AST ID injection inside the sandbox
    const injectionScript = `
      const fs = require('fs');
      const path = require('path');
      
      // Check if this is a Next.js project
      const packageJsonPath = '/workspace/package.json';
      if (!fs.existsSync(packageJsonPath)) {
        process.exit(1);
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.dependencies || !packageJson.dependencies.next) {
        process.exit(1);
      }

      // Create the AST injector class inside the sandbox
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
            console.error(\`Error processing \${filePath}:\`, error);
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
          
          return \`\${componentName}_\${elementType}_\${elementIndex}\`;
        }

        getElementType(node) {
          if (node.openingElement) {
            const name = node.openingElement.name;
            if (t.isJSXIdentifier(name)) {
              return name.name;
            } else if (t.isJSXMemberExpression(name)) {
              return \`\${name.object.name}_\${name.property.name}\`;
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

        checkIfFileNeedsProcessing(filePath) {
          try {
            const sourceCode = fs.readFileSync(filePath, 'utf8');
            
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

            let elementsWithoutIds = 0;
            
            traverse(ast, {
              JSXElement: (path) => {
                if (!this.hasVisualId(path.node)) {
                  elementsWithoutIds++;
                }
              },
              JSXFragment: (path) => {
                if (!this.hasVisualId(path.node)) {
                  elementsWithoutIds++;
                }
              }
            });

            return elementsWithoutIds > 0;
          } catch (error) {
            console.error(\`Error checking file \${filePath}:\`, error);
            return true; // Process on error to be safe
          }
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

      // Install required dependencies if not present
      const { execSync } = require('child_process');
      
      try {
        require('@babel/parser');
      } catch (e) {
        execSync('npm install @babel/parser @babel/traverse @babel/types @babel/generator', { 
          cwd: '/workspace',
          stdio: 'inherit' 
        });
      }

      // Process the workspace
      const injector = new ASTIdInjector();
      const targetFile = process.argv[2];
      
      if (targetFile) {
        // Process only the specific file
        const fullPath = path.join('/workspace/project', targetFile);
        if (fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath);
          if (['.jsx', '.tsx', '.js', '.ts'].includes(ext)) {
            try {
              // Check if file needs processing by counting elements without IDs
              const needsProcessing = injector.checkIfFileNeedsProcessing(fullPath);
              
              if (needsProcessing) {
                const modifiedCode = injector.injectIds(fullPath);
                fs.writeFileSync(fullPath, modifiedCode, 'utf8');
                console.log(JSON.stringify([{
                  file: fullPath,
                  status: 'success',
                  elementsProcessed: injector.elementCounter
                }]));
              } else {
                console.log(JSON.stringify([{
                  file: fullPath,
                  status: 'skipped',
                  reason: 'All elements already have visual IDs',
                  elementsProcessed: 0
                }]));
              }
            } catch (error) {
              console.log(JSON.stringify([{
                file: fullPath,
                status: 'error',
                error: error.message
              }]));
            }
          }
        } else {
          console.log(JSON.stringify([{
            file: fullPath,
            status: 'error',
            error: 'File not found'
          }]));
        }
      } else {
        // Process entire directory
        injector.processDirectory('/workspace/project').then(results => {
          console.log(JSON.stringify(results));
        }).catch(error => {
          console.error('Error:', error);
          process.exit(1);
        });
      }
    `;

    // Execute the injection script in the sandbox
    const command = targetFile 
      ? `node -e "${injectionScript.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" "${targetFile}"`
      : `node -e "${injectionScript.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    
    const result = await sandbox.process.executeCommand(command, '/workspace/project');

    let processedFiles = [];
    try {
      // Try to parse the output as JSON
      const output = result.output || '';
      const jsonMatch = output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        processedFiles = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
    }

    return NextResponse.json({
      success: true,
      message: 'AST ID injection completed',
      processedFiles,
      fullOutput: result.result || result.output,
      exitCode: result.exitCode
    });

  } catch (error) {
    console.error('AST ID injection error:', error);
    return NextResponse.json(
      { error: 'Failed to inject AST IDs', details: error.message },
      { status: 500 }
    );
  }
}