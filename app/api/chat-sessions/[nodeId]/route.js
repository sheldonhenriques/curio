import connectToDatabase from '@/lib/mongodb';
import ChatSession from '@/models/ChatSession';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { nodeId } = await params;
    
    if (!nodeId) {
      return Response.json({ error: 'Node ID is required' }, { status: 400 });
    }
    
    // Find the active session for this node
    const session = await ChatSession.findActiveByNodeId(nodeId);
    
    if (!session) {
      return Response.json({ session: null });
    }
    
    return Response.json({ 
      session: {
        sessionId: session.sessionId,
        nodeId: session.nodeId,
        projectId: session.projectId,
        messages: session.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isActive: session.isActive,
        messageCount: session.messages.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    
    const { nodeId } = await params;
    const { sessionId, message } = await request.json();
    
    if (!nodeId) {
      return Response.json({ error: 'Node ID is required' }, { status: 400 });
    }
    
    if (!sessionId) {
      return Response.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    // Find the session
    const session = await ChatSession.findOne({ sessionId, nodeId, isActive: true });
    
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Add message if provided
    if (message) {
      await session.addMessage(
        message.type, 
        message.content, 
        message.metadata || {}, 
        message.id, 
        message.timestamp ? new Date(message.timestamp) : null
      );
    }
    
    return Response.json({ 
      message: 'Session updated successfully',
      session: {
        sessionId: session.sessionId,
        nodeId: session.nodeId,
        projectId: session.projectId,
        messageCount: session.messages.length,
        updatedAt: session.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Error updating chat session:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    
    const { nodeId } = await params;
    
    if (!nodeId) {
      return Response.json({ error: 'Node ID is required' }, { status: 400 });
    }
    
    // Deactivate the active session for this node
    const session = await ChatSession.findActiveByNodeId(nodeId);
    
    if (!session) {
      return Response.json({ message: 'No active session found' });
    }
    
    await session.deactivate();
    
    return Response.json({ 
      message: 'Session cleared successfully',
      sessionId: session.sessionId
    });
    
  } catch (error) {
    console.error('Error clearing chat session:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}