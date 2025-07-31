import { NextResponse } from 'next/server';
import { scheduleSandboxCreation } from '@/services/backgroundJobs';
import { getAuthenticatedUser } from '@/utils/auth/apiAuth';

export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { user, supabase } = authResult;

    // Fetch user's projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ [SERVER] Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedProjects = projects.map(project => ({
      ...project,
      // Transform field names for frontend compatibility
      totalTasks: project.total_tasks || 0,
      sandboxId: project.sandbox_id,
      sandboxStatus: project.sandbox_status,
      sandboxError: project.sandbox_error,
      // Keep updated_at timestamp for formatting
      updated_at: project.updated_at,
      // Remove raw DB fields
      total_tasks: undefined,
      sandbox_id: undefined,
      sandbox_status: undefined,
      sandbox_error: undefined
    }));

    return NextResponse.json(transformedProjects);
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
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { user, supabase } = authResult;

    const body = await request.json();
    
    // Create project with user association
    const projectData = {
      user_id: user.id,
      title: body.title,
      description: body.description,
      color: body.color,
      starred: body.starred || false,
      progress: body.progress || 0,
      total_tasks: body.totalTasks || 0,
      status: body.status,
      tags: body.tags || [],
      team: body.team || [],
      sandbox_id: null,
      sandbox_status: 'creating',
      sandbox_error: null
    };
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    
    // Schedule sandbox creation in the background
    scheduleSandboxCreation(project.id, body.title, user.id);
    
    const response = {
      ...project,
      // Transform field names for frontend compatibility
      totalTasks: project.total_tasks || 0,
      sandboxId: project.sandbox_id,
      sandboxStatus: project.sandbox_status,
      sandboxError: project.sandbox_error,
      // Keep updated_at timestamp for formatting
      updated_at: project.updated_at,
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