import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Function to broadcast node position updates
function broadcastNodePositionUpdate(projectId, userId, nodeId, position, updatedAt) {
  try {
    // 1. Broadcast to project rooms (for project pages)
    if (global.socketIO) {
      const projectRoom = `project-${projectId}`;
      global.socketIO.to(projectRoom).emit('node_position_updated', {
        type: 'node_position_updated',
        projectId: parseInt(projectId),
        nodeId,
        position,
        updatedAt,
        timestamp: Date.now()
      });
      
      const projectClientsInRoom = global.socketIO.sockets.adapter.rooms.get(projectRoom);
      const projectBroadcastCount = projectClientsInRoom ? projectClientsInRoom.size : 0;
      console.log(`📡 Node position update broadcast sent to ${projectBroadcastCount} project clients for project ${projectId}`);
    }

    // 2. Broadcast to user rooms (for dashboard)
    if (global.socketIO && userId) {
      const userRoom = `user-${userId}`;
      global.socketIO.to(userRoom).emit('node_position_updated', {
        type: 'node_position_updated',
        projectId: parseInt(projectId),
        nodeId,
        position,
        updatedAt,
        timestamp: Date.now()
      });
      
      const userClientsInRoom = global.socketIO.sockets.adapter.rooms.get(userRoom);
      const userBroadcastCount = userClientsInRoom ? userClientsInRoom.size : 0;
      console.log(`📡 Node position update broadcast sent to ${userBroadcastCount} user clients for project ${projectId}`);
    }
  } catch (error) {
    console.error('❌ Error broadcasting node position update:', error);
    // Don't throw - broadcast failure shouldn't break the update
  }
}

// POST /api/webhook/node-position-update - Handle node position updates
export async function POST(request) {
  try {
    const body = await request.json();
    const { nodeId, projectId, position, userId } = body;

    // Validate required fields
    if (!nodeId || !projectId || !position || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: nodeId, projectId, position, userId' },
        { status: 400 }
      );
    }

    // Validate position structure
    if (typeof position !== 'object' || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return NextResponse.json(
        { error: 'Invalid position format. Expected {x: number, y: number}' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update node position in database
    const { data: updatedNode, error: updateError } = await supabase
      .from('project_nodes')
      .update({ position })
      .eq('node_id', nodeId)
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating node position:', updateError);
      return NextResponse.json(
        { error: 'Failed to update node position in database' },
        { status: 500 }
      );
    }

    if (!updatedNode) {
      return NextResponse.json(
        { error: 'Node not found or access denied' },
        { status: 404 }
      );
    }

    // Broadcast position update to connected clients
    try {
      broadcastNodePositionUpdate(userId, projectId, nodeId, position, updatedNode.updated_at);
    } catch (broadcastError) {
      console.error('Error broadcasting position update:', broadcastError);
      // Don't fail the request if broadcast fails, just log the error
    }

    // Transform node for response
    const transformedNode = {
      id: updatedNode.node_id,
      type: updatedNode.type,
      position: updatedNode.position,
      data: updatedNode.data,
      style: updatedNode.style,
      _dbId: updatedNode.id,
      _createdAt: updatedNode.created_at,
      _updatedAt: updatedNode.updated_at
    };

    return NextResponse.json({
      success: true,
      node: transformedNode,
      message: 'Node position updated successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/webhook/node-position-update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}