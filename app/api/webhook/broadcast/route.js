import { NextResponse } from 'next/server';

// Function to broadcast to Socket.IO connections
function broadcastToSocket(userId, data) {
  try {
    // Access the global Socket.IO instance
    const io = global.socketIO;
    if (!io) {
      console.warn('Socket.IO instance not available');
      return 0;
    }

    // Broadcast to user-specific room
    const room = `user-${userId}`;
    io.to(room).emit('project_status_update', data);
    
    // Get count of clients in the room
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    const broadcastCount = clientsInRoom ? clientsInRoom.size : 0;
    
    return broadcastCount;
  } catch (error) {
    console.error('Socket.IO broadcast error:', error);
    return 0;
  }
}

export async function POST(request) {
  try {
    const webhookPayload = await request.json();
    const { type, projectId, status, userId, timestamp, previewUrl } = webhookPayload;

    if (type !== 'project_status_update') {
      return NextResponse.json(
        { error: 'Invalid webhook type' },
        { status: 400 }
      );
    }

    // Broadcast to Socket.IO connections
    const broadcastCount = broadcastToSocket(userId, {
      type: 'project_status_update',
      projectId,
      status,
      previewUrl,
      timestamp: timestamp || Date.now()
    });

    console.log(`📡 Broadcasted project ${projectId} status update to ${broadcastCount} Socket.IO clients`);

    return NextResponse.json({
      success: true,
      broadcastCount,
      message: `Update sent to ${broadcastCount} dashboard clients`
    });

  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}