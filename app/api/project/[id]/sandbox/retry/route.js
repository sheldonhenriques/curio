import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { scheduleSandboxCreation } from '@/services/backgroundJobs';

export async function POST(_request, { params }) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the project (just title and verify ownership)
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('title')
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Just schedule the retry - the job will handle all the database updates
    scheduleSandboxCreation(parseInt(id), project.title, user.id);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error retrying sandbox creation:', error);
    return NextResponse.json({ error: 'Failed to retry sandbox creation' }, { status: 500 });
  }
}