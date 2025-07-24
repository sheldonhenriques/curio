import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { deleteSandbox } from '@/services/sandboxService';

export async function GET(_request, { params }) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch project
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Transform the data to match expected format
    const transformedProject = {
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
    };
    
    return NextResponse.json(transformedProject);
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
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prepare update data, mapping frontend keys to database column names
    const updateData = {
      title: body.title,
      description: body.description,
      color: body.color,
      starred: body.starred,
      progress: body.progress,
      total_tasks: body.totalTasks,
      updated_at: new Date().toISOString(),
      status: body.status,
      tags: body.tags,
      team: body.team,
      sandbox_id: body.sandboxId,
      sandbox_status: body.sandboxStatus,
      sandbox_error: body.sandboxError
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );
    
    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found or failed to update' },
        { status: 404 }
      );
    }

    
    // Transform field names for frontend compatibility
    const response = {
      ...project,
      totalTasks: project.total_tasks || 0,
      sandboxId: project.sandbox_id,
      sandboxStatus: project.sandbox_status,
      sandboxError: project.sandbox_error,
      // Keep updated_at timestamp for formatting
      updated_at: project.updated_at
    };
    
    return NextResponse.json(response);
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
    const supabase = await createClient();
    const { id } = await params;
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // First, find the project to get sandbox information
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('sandbox_id')
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // If project has a sandbox, try to delete it
    let sandboxDeletionMessage = null;
    if (project.sandbox_id) {
      try {
        const sandboxResult = await deleteSandbox(project.sandbox_id);
        sandboxDeletionMessage = sandboxResult.message;
      } catch (sandboxError) {
        console.error(`Failed to delete sandbox for project ${id}:`, sandboxError.message);
        sandboxDeletionMessage = `Warning: Failed to delete sandbox: ${sandboxError.message}`;
        // Continue with project deletion even if sandbox deletion fails
      }
    }
    
    // Delete the project from database (CASCADE will handle sections and chat_sessions)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', parseInt(id))
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }
    
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