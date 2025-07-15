import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Project from '@/models/Project';
import { createSandbox } from '@/services/sandboxService';

export async function POST(_request, { params }) {
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
    
    let sandboxData = null;
    let sandboxError = null;
    
    try {
      console.log(`Retrying sandbox creation for project: ${project.title}`);
      sandboxData = await createSandbox(project.title);
      console.log(`Sandbox created successfully: ${sandboxData.sandboxId}`);
    } catch (error) {
      console.error('Error creating sandbox:', error);
      sandboxError = error.message;
    }
    
    const updatedProject = await Project.findOneAndUpdate(
      { id: parseInt(id) },
      {
        sandboxId: sandboxData?.sandboxId || null,
        sandboxStatus: sandboxData ? 'created' : 'failed',
        sandboxError: sandboxError,
        updatedAt: 'just now',
        updatedAtTimestamp: new Date()
      },
      { new: true }
    );
    
    if (sandboxError) {
      return NextResponse.json({
        success: false,
        error: sandboxError,
        project: updatedProject
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      sandboxId: sandboxData.sandboxId,
      previewUrl: sandboxData.previewUrl,
      project: updatedProject
    });
    
  } catch (error) {
    console.error('Error retrying sandbox creation:', error);
    return NextResponse.json(
      { error: 'Failed to retry sandbox creation' },
      { status: 500 }
    );
  }
}