// This route has been deprecated in favor of the new chat-sessions API
// Use /api/chat-sessions instead

export async function GET() {
  return Response.json({ 
    error: 'This endpoint has been deprecated. Use /api/chat-sessions instead.' 
  }, { status: 410 });
}

export async function PUT() {
  return Response.json({ 
    error: 'This endpoint has been deprecated. Use /api/chat-sessions instead.' 
  }, { status: 410 });
}

export async function DELETE() {
  return Response.json({ 
    error: 'This endpoint has been deprecated. Use /api/chat-sessions instead.' 
  }, { status: 410 });
}