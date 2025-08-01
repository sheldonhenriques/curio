import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Simple in-memory cache to prevent duplicate calls within 5 seconds
const recentRequests = new Map();
const DUPLICATE_PREVENTION_WINDOW = 5000; // 5 seconds

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
        return NextResponse.json({
          success: true,
          message: 'Request deduplicated - too soon after previous request',
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
      .select('id, sandbox_id, user_id, title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if AI chat node already exists
    const { data: existingNodes } = await supabase
      .from('project_nodes')
      .select('id')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .eq('type', 'aichatNode');

    if (existingNodes && existingNodes.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'AI chat node already exists',
        existed: true
      });
    }

    // Create AI chat node
    const nodeId = crypto.randomUUID();
    const nodeData = {
      node_id: nodeId,
      project_id: project.id,
      user_id: user.id,
      type: 'aichatNode',
      position: { x: 450, y: 400 },
      data: {
        label: 'AI Chat',
        deviceType: 'normal',
        projectId: project.id,
        projectName: project.title,
        sandboxId: project.sandbox_id
      },
      style: { width: 480, height: 600, zIndex: 9999 }
    };

    const { data: newNode, error: insertError } = await supabase
      .from('project_nodes')
      .insert([nodeData])
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create AI chat node:', insertError);
      return NextResponse.json(
        { error: 'Failed to create AI chat node' },
        { status: 500 }
      );
    }

    // Broadcast node creation to WebSocket clients
    try {
      const { broadcastNodeCreated } = await import('@/services/backgroundJobs.js');
      
      // Transform the node data to match frontend format
      const frontendNode = {
        id: newNode.node_id,
        type: newNode.type,
        position: newNode.position,
        data: newNode.data,
        style: newNode.style,
        _dbId: newNode.id,
        _userId: newNode.user_id,
        _projectId: newNode.project_id
      };
      
      broadcastNodeCreated(project.id, user.id, frontendNode);
    } catch (error) {
      console.error('❌ Failed to broadcast AI chat node creation:', error);
      // Don't fail the API if broadcast fails
    }

    return NextResponse.json({
      success: true,
      message: 'AI chat node created successfully',
      node: newNode,
      existed: false
    });

  } catch (error) {
    console.error('Error ensuring AI chat node:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}