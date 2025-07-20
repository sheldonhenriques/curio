import { NextResponse } from 'next/server';
import { getProjectById } from '@/lib/mongodb';
import { writeSandboxFile, readSandboxFile } from '@/services/sandboxService';

/**
 * Write file contents to project sandbox
 * POST /api/projects/[id]/inspector/files/write
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { filePath, content, createBackup = true } = await request.json();

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'File path and content are required' },
        { status: 400 }
      );
    }

    // Basic security checks
    if (filePath.includes('..') || filePath.startsWith('/etc') || filePath.startsWith('/root')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

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
      let backupPath = null;

      // Create backup if requested and file exists
      if (createBackup) {
        try {
          const existingContent = await readSandboxFile(project.sandboxId, filePath);
          if (existingContent) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            backupPath = `${filePath}.backup-${timestamp}`;
            await writeSandboxFile(project.sandboxId, backupPath, existingContent);
          }
        } catch (backupError) {
          // File doesn't exist or can't be backed up - continue with write
          console.log('[Inspector API] No backup created:', backupError.message);
        }
      }

      // Write the new file content
      await writeSandboxFile(project.sandboxId, filePath, content);

      // Validate the write by reading back
      const writtenContent = await readSandboxFile(project.sandboxId, filePath);
      const success = writtenContent === content;

      return NextResponse.json({
        success,
        filePath,
        backupPath,
        bytesWritten: content.length,
        timestamp: new Date().toISOString(),
        validated: success
      });

    } catch (sandboxError) {
      console.error('[Inspector API] Sandbox file write error:', sandboxError);
      
      // Handle specific sandbox errors
      if (sandboxError.message.includes('permission') || sandboxError.message.includes('access')) {
        return NextResponse.json(
          { error: 'Permission denied writing file', filePath },
          { status: 403 }
        );
      }
      
      if (sandboxError.message.includes('space') || sandboxError.message.includes('ENOSPC')) {
        return NextResponse.json(
          { error: 'Insufficient disk space', filePath },
          { status: 507 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to write file to sandbox', details: sandboxError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Inspector API] Write file error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}