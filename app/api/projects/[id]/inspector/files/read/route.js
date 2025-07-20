import { NextResponse } from 'next/server';
import { getProjectById } from '@/lib/mongodb';
import { readSandboxFile } from '@/services/sandboxService';

/**
 * Read file contents from project sandbox
 * POST /api/projects/[id]/inspector/files/read
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
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
      // Read file from sandbox
      const fileContent = await readSandboxFile(project.sandboxId, filePath);

      return NextResponse.json({
        success: true,
        filePath,
        content: fileContent,
        encoding: 'utf-8',
        timestamp: new Date().toISOString()
      });

    } catch (sandboxError) {
      console.error('[Inspector API] Sandbox file read error:', sandboxError);
      
      // Handle specific sandbox errors
      if (sandboxError.message.includes('not found') || sandboxError.message.includes('ENOENT')) {
        return NextResponse.json(
          { error: 'File not found in sandbox', filePath },
          { status: 404 }
        );
      }
      
      if (sandboxError.message.includes('permission') || sandboxError.message.includes('access')) {
        return NextResponse.json(
          { error: 'Permission denied accessing file', filePath },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to read file from sandbox', details: sandboxError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Inspector API] Read file error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}