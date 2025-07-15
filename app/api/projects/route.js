import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Project from '@/models/Project';
import { scheduleSandboxCreation } from '@/services/backgroundJobs';

export async function GET() {
  try {
    await connectToDatabase();
    const projects = await Project.find({}).sort({ updatedAtTimestamp: -1 });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('❌ [SERVER] Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const lastProject = await Project.findOne().sort({ id: -1 });
    const nextId = lastProject ? lastProject.id + 1 : 1;
    
    // Create project immediately with 'creating' status
    const projectData = {
      ...body,
      id: nextId,
      sandboxId: null,
      sandboxStatus: 'creating',
      sandboxError: null,
      updatedAt: 'just now'
    };
    
    const project = new Project(projectData);
    await project.save();
    
    // Schedule sandbox creation in the background
    scheduleSandboxCreation(nextId, body.title);
    
    const response = {
      ...project.toObject(),
      message: 'Project created successfully. Sandbox is being created in the background.'
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}