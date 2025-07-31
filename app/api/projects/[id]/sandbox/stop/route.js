import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stopSandbox } from '@/services/sandboxService';

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
    
    const project = await findProjectWithSandbox(supabase, id, user.id);
    const result = await stopSandbox(project.sandbox_id);
    
    // Broadcast to both WebSocket systems
    try {
      // 1. Broadcast to project rooms (for project pages)
      if (global.broadcastSandboxStatus && result.status === 'stopped') {
        global.broadcastSandboxStatus(id, result.status);
      }

      // 2. Broadcast to user rooms (for dashboard)
      if (global.socketIO && user.id) {
        const room = `user-${user.id}`;
        global.socketIO.to(room).emit('project_status_update', {
          type: 'project_status_update',
          projectId: parseInt(id),
          status: result.status,
          timestamp: Date.now()
        });
        
        const clientsInRoom = global.socketIO.sockets.adapter.rooms.get(room);
        const broadcastCount = clientsInRoom ? clientsInRoom.size : 0;
        console.log(`📡 Dashboard broadcast sent to ${broadcastCount} clients for project ${id}`);
      }
    } catch (broadcastError) {
      console.warn('WebSocket broadcast error:', broadcastError);
    }
    
    return NextResponse.json({
      success: true,
      sandboxId: project.sandbox_id,
      ...result
    });
    
  } catch (error) {
    console.error('Error stopping sandbox:', error);
    
    if (error.message === 'Project not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === 'No sandbox associated with this project') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Failed to stop sandbox' },
      { status: 500 }
    );
  }
}