import { createClient } from '@/utils/supabase/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
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
      .limit(10);
    
    if (projectId) {
      query = query.eq('project_id', parseInt(projectId));
    }
    
    const { data: sessions, error } = await query;
    
    if (error) {
      console.error('Error fetching chat sessions:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
    
    // Transform sessions to match expected format
    const transformedSessions = sessions.map(session => ({
      sessionId: session.session_id,
      nodeId: session.node_id,
      projectId: session.project_id,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      isActive: session.is_active,
      messages: session.messages || [],
      messageCount: session.messages?.length || 0
    }));
    
    return Response.json({ sessions: transformedSessions });
    
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { sessionId, nodeId, projectId } = await request.json();
    
    if (!sessionId || !nodeId || !projectId) {
      return Response.json({ 
        error: 'Session ID, node ID, and project ID are required' 
      }, { status: 400 });
    }
    
    // Check if session already exists
    const { data: existingSession, error: fetchError } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        messages (count)
      `)
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();
    
    if (existingSession && !fetchError) {
      // If session exists and is active, return it
      if (existingSession.is_active) {
        return Response.json({ 
          message: 'Session already exists',
          session: {
            sessionId: existingSession.session_id,
            nodeId: existingSession.node_id,
            projectId: existingSession.project_id,
            createdAt: existingSession.created_at,
            updatedAt: existingSession.updated_at,
            isActive: existingSession.is_active,
            messageCount: existingSession.messages?.[0]?.count || 0
          }
        }, { status: 200 });
      } else {
        // Reactivate existing session
        const { data: reactivatedSession, error: updateError } = await supabase
          .from('chat_sessions')
          .update({ is_active: true })
          .eq('id', existingSession.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error reactivating session:', updateError);
          return Response.json({ error: 'Internal server error' }, { status: 500 });
        }
        
        return Response.json({ 
          message: 'Session reactivated',
          session: {
            sessionId: reactivatedSession.session_id,
            nodeId: reactivatedSession.node_id,
            projectId: reactivatedSession.project_id,
            createdAt: reactivatedSession.created_at,
            updatedAt: reactivatedSession.updated_at,
            isActive: reactivatedSession.is_active,
            messageCount: existingSession.messages?.[0]?.count || 0
          }
        }, { status: 200 });
      }
    }
    
    // Create new session
    const { data: session, error: createError } = await supabase
      .from('chat_sessions')
      .insert([{
        session_id: sessionId,
        user_id: user.id,
        node_id: nodeId,
        project_id: parseInt(projectId),
        is_active: true
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating chat session:', createError);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
    
    return Response.json({ 
      message: 'Session created successfully',
      session: {
        sessionId: session.session_id,
        nodeId: session.node_id,
        projectId: session.project_id,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        isActive: session.is_active,
        messageCount: 0
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating chat session:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    
    if (!nodeId) {
      return Response.json({ error: 'Node ID is required' }, { status: 400 });
    }
    
    // Deactivate all sessions for this node
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ is_active: false })
      .eq('node_id', nodeId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select('id');
    
    if (error) {
      console.error('Error clearing chat sessions:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
    
    return Response.json({ 
      message: 'Sessions cleared successfully',
      modifiedCount: data?.length || 0
    });
    
  } catch (error) {
    console.error('Error clearing chat sessions:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}