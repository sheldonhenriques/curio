import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Project from '@/models/Project';
import { deleteSandbox } from '@/services/sandboxService';

export async function GET(_request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const project = await Project.findOne({ id: parseInt(id) });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('❌ [SERVER] Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    
    const project = await Project.findOneAndUpdate(
      { id: parseInt(id) },
      { 
        ...body,
        updatedAt: 'just now',
        updatedAtTimestamp: new Date()
      },
      { new: true }
    );
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    // First, find the project to get sandbox information
    const project = await Project.findOne({ id: parseInt(id) });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // If project has a sandbox, try to delete it
    let sandboxDeletionMessage = null;
    if (project.sandboxId) {
      try {
        const sandboxResult = await deleteSandbox(project.sandboxId);
        sandboxDeletionMessage = sandboxResult.message;
      } catch (sandboxError) {
        console.error(`Failed to delete sandbox for project ${id}:`, sandboxError.message);
        sandboxDeletionMessage = `Warning: Failed to delete sandbox: ${sandboxError.message}`;
        // Continue with project deletion even if sandbox deletion fails
      }
    }
    
    // Delete the project from database
    await Project.findOneAndDelete({ id: parseInt(id) });
    
    return NextResponse.json({ 
      message: 'Project deleted successfully',
      sandboxMessage: sandboxDeletionMessage
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}