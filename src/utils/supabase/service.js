import { createClient } from '@supabase/supabase-js'

// Service client for server-to-server operations (bypasses RLS)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Get project by ID using service role (for internal server operations)
export async function getProjectByIdInternal(projectId) {
  const supabase = createServiceClient();
  
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', parseInt(projectId))
    .single();

  if (error || !project) {
    throw new Error('Project not found');
  }

  // Transform the data to match expected format
  return {
    ...project,
    totalTasks: project.total_tasks || 0,
    sandboxId: project.sandbox_id,
    sandboxStatus: project.sandbox_status,
    sandboxError: project.sandbox_error,
    updated_at: project.updated_at
  };
}

// Get chat session by node ID using service role (for internal server operations)
export async function getChatSessionByNodeIdInternal(nodeId, projectId = null) {
  const supabase = createServiceClient();
  
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
    .eq('node_id', nodeId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1);
  
  if (projectId) {
    query = query.eq('project_id', parseInt(projectId));
  }
  
  const { data: sessions, error } = await query;
  
  if (error) {
    throw new Error('Failed to fetch chat session');
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
  
  return { session };
}