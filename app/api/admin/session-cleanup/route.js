import sessionCleanupService from '@/lib/sessionCleanup';

export async function GET(request) {
  try {
    const status = sessionCleanupService.getStatus();
    
    return Response.json({
      status: 'success',
      data: status
    });
    
  } catch (error) {
    console.error('Error getting cleanup status:', error);
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'start':
        sessionCleanupService.start();
        return Response.json({
          status: 'success',
          message: 'Cleanup service started'
        });
      
      case 'stop':
        sessionCleanupService.stop();
        return Response.json({
          status: 'success',
          message: 'Cleanup service stopped'
        });
      
      case 'run':
        const result = await sessionCleanupService.runCleanup();
        return Response.json({
          status: 'success',
          message: 'Manual cleanup completed',
          data: result
        });
      
      default:
        return Response.json({
          status: 'error',
          error: 'Invalid action. Use: start, stop, or run'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error handling cleanup action:', error);
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}