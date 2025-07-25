import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createSandbox } from '@/services/sandboxService';

export async function POST(_request, { params }) {
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
    
    // Get the project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    let sandboxData = null;
    let sandboxError = null;
    
    try {
      sandboxData = await createSandbox(project.title);
    } catch (error) {
      console.error('Error creating sandbox:', error);
      sandboxError = error.message;
    }
    
    // Update the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        sandbox_id: sandboxData?.sandboxId || null,
        sandbox_status: sandboxData ? 'created' : 'failed',
        sandbox_error: sandboxError,
      })
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }
    
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