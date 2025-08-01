import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { triggerFileWatcherScan } from '@/services/sandboxService';

// Simple in-memory cache to prevent duplicate calls within 1 second
const recentRequests = new Map();
const DUPLICATE_PREVENTION_WINDOW = 1000; // 1 second

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for recent duplicate requests
    const requestKey = `${user.id}-${id}`;
    const now = Date.now();
    
    if (recentRequests.has(requestKey)) {
      const lastRequest = recentRequests.get(requestKey);
      if (now - lastRequest < DUPLICATE_PREVENTION_WINDOW) {
        console.log(`🔄 Route scan deduplicated for project ${id} - ${now - lastRequest}ms since last request`);
        return NextResponse.json({
          success: true,
          message: 'Route scan deduplicated - too soon after previous request',
          deduplicated: true
        });
      }
    }
    
    // Update request cache
    recentRequests.set(requestKey, now);
    
    // Clean up old requests to prevent memory leaks
    for (const [key, timestamp] of recentRequests.entries()) {
      if (now - timestamp > DUPLICATE_PREVENTION_WINDOW * 2) {
        recentRequests.delete(key);
      }
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, sandbox_id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.sandbox_id) {
      return NextResponse.json({ error: 'Project sandbox not ready' }, { status: 400 });
    }

    // Trigger the file watcher scan
    await triggerFileWatcherScan(project.sandbox_id);

    return NextResponse.json({
      success: true,
      message: 'Route scan triggered successfully'
    });

  } catch (error) {
    console.error('Error triggering route scan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}