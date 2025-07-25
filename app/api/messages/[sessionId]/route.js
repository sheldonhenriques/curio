import { createClient } from '@/utils/supabase/server';

export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { sessionId } = params;
    const { messageId, type, content, metadata } = await request.json();
    
    if (!sessionId || !messageId || !type || !content) {
      return Response.json({ 
        error: 'Session ID, message ID, type, and content are required' 
      }, { status: 400 });
    }
    
    // First, verify that the session exists and belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    
    if (sessionError || !session) {
      return Response.json({ error: 'Session not found or unauthorized' }, { status: 404 });
    }
    
    // Check if message already exists to prevent duplicates
    const { data: existingMessage, error: existingError } = await supabase
      .from('messages')
      .select('id')
      .eq('message_id', messageId)
      .eq('chat_session_id', session.id)
      .single();
    
    if (existingMessage && !existingError) {
      // Message already exists, return success
      return Response.json({ 
        message: 'Message already exists',
        messageId: existingMessage.id
      }, { status: 200 });
    }
    
    // Insert the message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert([{
        message_id: messageId,
        chat_session_id: session.id,
        type: type,
        content: content,
        metadata: metadata || {}
      }])
      .select('id, message_id, type, content, metadata, timestamp')
      .single();
    
    if (insertError) {
      console.error('Error inserting message:', insertError);
      return Response.json({ error: 'Failed to save message' }, { status: 500 });
    }
    
    // Update session updated_at timestamp
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', session.id);
    
    return Response.json({ 
      message: 'Message saved successfully',
      data: message
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error saving message:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { sessionId } = params;
    
    if (!sessionId) {
      return Response.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    // First, verify that the session exists and belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();
    
    if (sessionError || !session) {
      return Response.json({ error: 'Session not found or unauthorized' }, { status: 404 });
    }
    
    // Get all messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, message_id, type, content, metadata, timestamp')
      .eq('chat_session_id', session.id)
      .order('timestamp', { ascending: true });
    
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
    
    return Response.json({ 
      messages: messages || []
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}