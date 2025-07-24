import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSandboxStatus } from '@/services/sandboxService';

const findProjectWithSandbox = async (supabase, id, userId) => {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', parseInt(id))
    .eq('user_id', userId)
    .single();

  if (error || !project) {
    throw new Error('Project not found');
  }
  if (!project.sandbox_id) {
    throw new Error('No sandbox associated with this project');
  }
  return project;
};

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
    
    const project = await findProjectWithSandbox(supabase, id, user.id);
    const result = await getSandboxStatus(project.sandbox_id);
    
    return NextResponse.json({
      success: true,
      sandboxId: project.sandbox_id,
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