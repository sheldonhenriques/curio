import connectToDatabase from '@/lib/mongodb';
import ChatSession from '@/models/ChatSession';

export async function GET(request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const projectId = searchParams.get('projectId');
    
    if (!nodeId) {
      return Response.json({ error: 'Node ID is required' }, { status: 400 });
    }
    
    let query = { nodeId, isActive: true };
    if (projectId) {
      query.projectId = projectId;
    }
    
    const sessions = await ChatSession.find(query)
      .sort({ updatedAt: -1 })
      .limit(10);
    
    return Response.json({ sessions });
    
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { sessionId, nodeId, projectId } = await request.json();
    
    if (!sessionId || !nodeId || !projectId) {
      return Response.json({ 
        error: 'Session ID, node ID, and project ID are required' 
      }, { status: 400 });
    }
    
    // Check if session already exists
    const existingSession = await ChatSession.findOne({ sessionId });
    if (existingSession) {
      // If session exists and is active, return it
      if (existingSession.isActive) {
        return Response.json({ 
          message: 'Session already exists',
          session: {
            sessionId: existingSession.sessionId,
            nodeId: existingSession.nodeId,
            projectId: existingSession.projectId,
            createdAt: existingSession.createdAt,
            updatedAt: existingSession.updatedAt,
            isActive: existingSession.isActive,
            messageCount: existingSession.messages.length
          }
        }, { status: 200 });
      } else {
        // Reactivate existing session
        existingSession.isActive = true;
        existingSession.updatedAt = new Date();
        await existingSession.save();
        
        return Response.json({ 
          message: 'Session reactivated',
          session: {
            sessionId: existingSession.sessionId,
            nodeId: existingSession.nodeId,
            projectId: existingSession.projectId,
            createdAt: existingSession.createdAt,
            updatedAt: existingSession.updatedAt,
            isActive: existingSession.isActive,
            messageCount: existingSession.messages.length
          }
        }, { status: 200 });
      }
    }
    
    // Create new session
    const session = new ChatSession({
      sessionId,
      nodeId,
      projectId,
      messages: [],
      isActive: true
    });
    
    await session.save();
    
    return Response.json({ 
      message: 'Session created successfully',
      session: {
        sessionId: session.sessionId,
        nodeId: session.nodeId,
        projectId: session.projectId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isActive: session.isActive,
        messageCount: session.messages.length
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating chat session:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    
    if (!nodeId) {
      return Response.json({ error: 'Node ID is required' }, { status: 400 });
    }
    
    // Deactivate all sessions for this node
    const result = await ChatSession.updateMany(
      { nodeId, isActive: true },
      { isActive: false, updatedAt: new Date() }
    );
    
    return Response.json({ 
      message: 'Sessions cleared successfully',
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Error clearing chat sessions:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}