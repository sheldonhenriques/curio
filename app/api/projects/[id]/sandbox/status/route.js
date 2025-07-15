import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Project from '@/models/Project';
import { getSandboxStatus } from '@/services/sandboxService';

const findProjectWithSandbox = async (id) => {
  const project = await Project.findOne({ id: parseInt(id) });
  if (!project) {
    throw new Error('Project not found');
  }
  if (!project.sandboxId) {
    throw new Error('No sandbox associated with this project');
  }
  return project;
};

export async function GET(_request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const project = await findProjectWithSandbox(id);
    const result = await getSandboxStatus(project.sandboxId);
    
    return NextResponse.json({
      success: true,
      sandboxId: project.sandboxId,
      ...result
    });
    
  } catch (error) {
    console.error('Error getting sandbox status:', error);
    
    if (error.message === 'Project not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === 'No sandbox associated with this project') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get sandbox status' },
      { status: 500 }
    );
  }
}