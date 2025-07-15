import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Project from '@/models/Project';

export async function GET() {
  try {
    await connectToDatabase();
    const projects = await Project.find({}).sort({ updatedAtTimestamp: -1 });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
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
    
    const projectData = {
      ...body,
      id: nextId,
      updatedAt: 'just now'
    };
    
    const project = new Project(projectData);
    await project.save();
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}