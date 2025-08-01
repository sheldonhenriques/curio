import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, projectId, sandboxId, eventType, filePath, routeInfo, timestamp } = body;

    // Validate required fields
    if (type !== 'file-change' || !projectId || !sandboxId || !eventType || !routeInfo) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    console.log('📥 Received file change webhook:', {
      projectId,
      sandboxId,
      eventType,
      route: routeInfo.route,
      filePath
    });

    // Use service role key for webhook access (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get project details to verify it exists and get user_id
    // During initial scan, be more lenient - only check project exists
    // For other events, require exact sandbox_id match
    let project;
    let projectError;
    
    if (eventType === 'scan') {
      // During scan, just check if project exists - sandbox_id might still be updating
      console.log(`🔍 Looking for project ${projectId} in database...`);
      const result = await supabase
        .from('projects')
        .select('id, user_id, sandbox_id, created_at, updated_at')
        .eq('id', projectId)
        .single();
      project = result.data;
      projectError = result.error;
      
      console.log(`🔍 Database query result:`, { project, projectError });
      
      // If no project found, let's see what projects exist
      if (!project) {
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, sandbox_id, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        console.log(`🔍 Recent projects in database:`, allProjects);
      }
      
      // If project found but sandbox_id doesn't match, it might be updating - allow it
      if (project && project.sandbox_id && project.sandbox_id !== sandboxId) {
        console.warn(`⚠️ Sandbox ID mismatch during scan for project ${projectId}: expected ${sandboxId}, got ${project.sandbox_id}`);
      }
    } else {
      // For non-scan events, require exact match
      const result = await supabase
        .from('projects')
        .select('id, user_id, sandbox_id')
        .eq('id', projectId)
        .eq('sandbox_id', sandboxId)
        .single();
      project = result.data;
      projectError = result.error;
    }

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found or sandbox mismatch' },
        { status: 404 }
      );
    }

    // Process 'add' and 'scan' events for new/existing pages/components
    if (eventType === 'add' || eventType === 'scan') {
      await handleNewPageComponent(supabase, project, routeInfo, filePath, eventType === 'scan');
    } else if (eventType === 'unlink') {
      await handleDeletedPageComponent(supabase, project, routeInfo);
    }

    return NextResponse.json({
      success: true,
      message: `File change processed: ${eventType} ${routeInfo.route}`,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('File change webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleNewPageComponent(supabase, project, routeInfo, filePath, isInitialScan = false) {
  const { route, type, isAppRouter, relativePath } = routeInfo;

  // Skip if it's not a page component (layout, loading, error components)
  if (type !== 'page' && !['page', 'index'].includes(type)) {
    console.log('⏭️  Skipping non-page component:', type);
    return;
  }

  // Check if a webserver node already exists for this route or file path
  const { data: existingNodes } = await supabase
    .from('project_nodes')
    .select('id, data')
    .eq('project_id', project.id)
    .eq('type', 'webserverNode')
    .eq('user_id', project.user_id);

  // Check for any existing node with matching route or file path
  const duplicateExists = existingNodes?.some(node => {
    const nodeRoute = node.data?.route;
    const nodePath = node.data?.path;
    const nodeFilePath = node.data?.filePath;
    
    // Check for exact route match
    if (nodeRoute === route || nodePath === route) {
      return true;
    }
    
    // Check for exact file path match (especially important for scans)
    if (nodeFilePath === relativePath) {
      return true;
    }
    
    return false;
  });

  if (duplicateExists) {
    console.log(`⏭️  Webserver node already exists for route '${route}' or file '${relativePath}'`);
    return;
  }

  // Generate a unique node ID
  const nodeId = crypto.randomUUID();

  // Get preview URL from project's sandbox
  let previewUrl = '';
  try {
    // Construct preview URL (this would need to be adapted based on your sandbox service)
    const baseUrl = `https://3000-${project.sandbox_id}.proxy.daytona.work`;
    previewUrl = baseUrl + route;
  } catch (error) {
    console.warn('Could not construct preview URL:', error);
  }

  // Create webserver node data
  const nodeData = {
    node_id: nodeId,
    project_id: project.id,
    user_id: project.user_id,
    type: 'webserverNode',
    position: {
      x: Math.random() * 400 + 100, // Random position to avoid overlap
      y: Math.random() * 400 + 100
    },
    data: {
      title: `Page: ${route}`,
      url: previewUrl,
      route: route,
      filePath: relativePath,
      isAppRouter: isAppRouter,
      autoGenerated: true,
      generatedAt: new Date().toISOString(),
      source: isInitialScan ? 'initial_scan' : 'file_watcher',
      deviceType: 'desktop'
    },
    style: {
      width: 1200,
      height: 800
    }
  };

  // Insert the new webserver node
  const { data: newNode, error: insertError } = await supabase
    .from('project_nodes')
    .insert([nodeData])
    .select()
    .single();

  if (insertError) {
    console.error('❌ Failed to create webserver node:', insertError);
    return;
  }

  const logMessage = isInitialScan 
    ? `✅ Created webserver node for existing route: ${route}`
    : `✅ Created webserver node for new route: ${route}`;
  console.log(logMessage);

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
    
    broadcastNodeCreated(project.id, project.user_id, frontendNode);
  } catch (error) {
    console.error('❌ Failed to broadcast node creation:', error);
    // Don't fail the webhook if broadcast fails
  }

  return newNode;
}

async function handleDeletedPageComponent(supabase, project, routeInfo) {
  const { route } = routeInfo;

  // Find and delete webserver nodes for this route
  const { data: nodesToDelete } = await supabase
    .from('project_nodes')
    .select('id, node_id, data')
    .eq('project_id', project.id)
    .eq('type', 'webserverNode')
    .eq('user_id', project.user_id);

  const matchingNodes = nodesToDelete?.filter(node => 
    node.data?.route === route && node.data?.autoGenerated === true
  );

  if (matchingNodes && matchingNodes.length > 0) {
    const nodeIds = matchingNodes.map(node => node.id);
    
    const { error: deleteError } = await supabase
      .from('project_nodes')
      .delete()
      .in('id', nodeIds);

    if (deleteError) {
      console.error('❌ Failed to delete webserver nodes:', deleteError);
      return;
    }

    console.log('🗑️  Deleted webserver nodes for route:', route);
  }
}