import { NextResponse } from 'next/server';
import { getProjectById } from '@/lib/mongodb';
import { listSandboxFiles } from '@/services/sandboxService';

/**
 * Get project file structure from sandbox
 * GET /api/projects/[id]/inspector/files/structure
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const includeHidden = searchParams.get('includeHidden') === 'true';
    const fileTypes = searchParams.get('fileTypes')?.split(',') || [];

    // Get project from database
    const project = await getProjectById(parseInt(id));
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if project has a sandbox
    if (!project.sandboxId) {
      return NextResponse.json(
        { error: 'Project does not have a sandbox' },
        { status: 400 }
      );
    }

    try {
      // Get directory listing
      const files = await listSandboxFiles(project.sandboxId, path);
      
      // Filter and format files
      const filteredFiles = files
        .filter(file => {
          // Skip hidden files unless requested
          if (!includeHidden && file.name.startsWith('.')) {
            return false;
          }
          
          // Filter by file types if specified
          if (fileTypes.length > 0 && file.type === 'file') {
            const extension = file.name.split('.').pop()?.toLowerCase();
            return fileTypes.includes(extension);
          }
          
          return true;
        })
        .map(file => ({
          name: file.name,
          path: file.path,
          type: file.type, // 'file' or 'directory'
          size: file.size || 0,
          extension: file.type === 'file' ? file.name.split('.').pop()?.toLowerCase() : null,
          lastModified: file.lastModified || null,
          isWebFile: isWebRelatedFile(file.name),
          isEditable: isEditableFile(file.name)
        }))
        .sort((a, b) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          // Then alphabetical
          return a.name.localeCompare(b.name);
        });

      // Generate file tree structure for web-related files
      const webFiles = filteredFiles.filter(file => file.isWebFile);
      const fileTree = buildFileTree(webFiles);

      return NextResponse.json({
        success: true,
        path: path || '/',
        files: filteredFiles,
        webFiles,
        fileTree,
        totalFiles: filteredFiles.length,
        totalWebFiles: webFiles.length,
        timestamp: new Date().toISOString()
      });

    } catch (sandboxError) {
      console.error('[Inspector API] Sandbox file structure error:', sandboxError);
      
      if (sandboxError.message.includes('not found') || sandboxError.message.includes('ENOENT')) {
        return NextResponse.json(
          { error: 'Path not found in sandbox', path },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to get file structure from sandbox', details: sandboxError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Inspector API] File structure error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Check if file is web-related (HTML, CSS, JS, etc.)
 */
function isWebRelatedFile(filename) {
  const webExtensions = [
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte',
    'json', 'xml', 'svg', 'php'
  ];
  
  const extension = filename.split('.').pop()?.toLowerCase();
  return webExtensions.includes(extension);
}

/**
 * Check if file is editable in the inspector
 */
function isEditableFile(filename) {
  const editableExtensions = [
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'js', 'jsx', 'ts', 'tsx', 'json'
  ];
  
  const extension = filename.split('.').pop()?.toLowerCase();
  return editableExtensions.includes(extension);
}

/**
 * Build hierarchical file tree structure
 */
function buildFileTree(files) {
  const tree = {};
  
  files.forEach(file => {
    const pathParts = file.path.split('/');
    let current = tree;
    
    pathParts.forEach((part, index) => {
      if (!part) return; // Skip empty parts
      
      if (index === pathParts.length - 1) {
        // This is the file
        current[part] = {
          type: 'file',
          path: file.path,
          extension: file.extension,
          size: file.size,
          isEditable: file.isEditable
        };
      } else {
        // This is a directory
        if (!current[part]) {
          current[part] = {
            type: 'directory',
            children: {}
          };
        }
        current = current[part].children;
      }
    });
  });
  
  return tree;
}