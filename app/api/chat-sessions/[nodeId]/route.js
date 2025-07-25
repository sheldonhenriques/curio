import { createClient } from '@/utils/supabase/server';

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { nodeId } = await params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!nodeId) {
      return Response.json({ error: 'Node ID is required' }, { status: 400 });
    }
    
    let query = supabase
      .from('chat_sessions')
      .select(`
        *,
        messages (
          id,
          message_id,
          type,
          content,
          metadata,
          timestamp
        )
      `)
      .eq('user_id', user.id)
      .eq('node_id', nodeId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (projectId) {
      query = query.eq('project_id', parseInt(projectId));
    }
    
    const { data: sessions, error } = await query;
    
    if (error) {
      console.error('Error fetching chat session:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
    
    // Return the session or null if no session exists
    const session = sessions.length > 0 ? {
      sessionId: sessions[0].session_id,
      nodeId: sessions[0].node_id,
      projectId: sessions[0].project_id,
      createdAt: sessions[0].created_at,
      updatedAt: sessions[0].updated_at,
      isActive: sessions[0].is_active,
      messages: sessions[0].messages || []
    } : null;
    
    return Response.json({ session });
    
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}