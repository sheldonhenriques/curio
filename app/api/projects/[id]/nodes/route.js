import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/projects/[id]/nodes - Fetch all nodes for a project
export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const projectId = parseInt(params.id);

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch nodes for this project
    const { data: nodes, error: nodesError } = await supabase
      .from('project_nodes')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
      return NextResponse.json(
        { error: 'Failed to fetch nodes' },
        { status: 500 }
      );
    }

    // Transform nodes for ReactFlow
    const transformedNodes = nodes.map(dbNode => ({
      id: dbNode.node_id,
      type: dbNode.type,
      position: dbNode.position,
      data: dbNode.data,
      style: dbNode.style,
      // Include metadata for updates
      _dbId: dbNode.id,
      _createdAt: dbNode.created_at,
      _updatedAt: dbNode.updated_at
    }));

    return NextResponse.json(transformedNodes);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/nodes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/nodes - Create a new node
export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const projectId = parseInt(params.id);
    const body = await request.json();

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Validate required fields
    const { type, position, data, style } = body;
    if (!type) {
      return NextResponse.json(
        { error: 'Node type is required' },
        { status: 400 }
      );
    }

    // Generate UUID for node
    const nodeId = crypto.randomUUID();

    // Create node data
    const nodeData = {
      node_id: nodeId,
      project_id: projectId,
      user_id: user.id,
      type,
      position: position || { x: 0, y: 0 },
      data: data || {},
      style: style || {}
    };

    // Insert node
    const { data: newNode, error: insertError } = await supabase
      .from('project_nodes')
      .insert([nodeData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating node:', insertError);
      return NextResponse.json(
        { error: 'Failed to create node' },
        { status: 500 }
      );
    }

    // Return transformed node
    const transformedNode = {
      id: newNode.node_id,
      type: newNode.type,
      position: newNode.position,
      data: newNode.data,
      style: newNode.style,
      _dbId: newNode.id,
      _createdAt: newNode.created_at,
      _updatedAt: newNode.updated_at
    };

    return NextResponse.json(transformedNode, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[id]/nodes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}