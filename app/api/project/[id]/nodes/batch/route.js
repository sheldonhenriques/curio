import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// PUT /api/project/[id]/nodes/batch - Batch update multiple nodes
export async function PUT(request, { params }) {
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

    // Validate request body
    const { nodeUpdates } = body;
    if (!Array.isArray(nodeUpdates) || nodeUpdates.length === 0) {
      return NextResponse.json(
        { error: 'nodeUpdates array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate each update
    const validUpdates = [];
    const allowedFields = ['position', 'data', 'style'];

    for (const update of nodeUpdates) {
      if (!update.nodeId) {
        continue; // Skip invalid updates
      }

      const updateData = {};
      allowedFields.forEach(field => {
        if (update[field] !== undefined) {
          updateData[field] = update[field];
        }
      });

      if (Object.keys(updateData).length > 0) {
        validUpdates.push({
          nodeId: update.nodeId,
          updateData
        });
      }
    }

    if (validUpdates.length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // Execute batch updates using Promise.all
    // Note: Supabase doesn't have native batch update, so we use multiple queries
    const updatePromises = validUpdates.map(({ nodeId, updateData }) =>
      supabase
        .from('project_nodes')
        .update(updateData)
        .eq('node_id', nodeId)
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .select()
        .single()
    );

    const results = await Promise.allSettled(updatePromises);

    // Process results
    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      const { nodeId } = validUpdates[index];
      
      if (result.status === 'fulfilled' && result.value.data) {
        const updatedNode = result.value.data;
        successful.push({
          id: updatedNode.node_id,
          type: updatedNode.type,
          position: updatedNode.position,
          data: updatedNode.data,
          style: updatedNode.style,
          _dbId: updatedNode.id,
          _createdAt: updatedNode.created_at,
          _updatedAt: updatedNode.updated_at
        });
      } else {
        failed.push({
          nodeId,
          error: result.reason?.message || 'Update failed'
        });
      }
    });

    // Return results
    const response = {
      successful,
      failed,
      summary: {
        total: validUpdates.length,
        successful: successful.length,
        failed: failed.length
      }
    };

    // Return appropriate status code
    const statusCode = failed.length === 0 ? 200 : 
                      successful.length === 0 ? 500 : 207; // 207 = Multi-Status

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('Error in PUT /api/project/[id]/nodes/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/project/[id]/nodes/batch - Batch create multiple nodes
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

    // Validate request body
    const { nodes } = body;
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json(
        { error: 'nodes array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Prepare nodes for insertion
    const nodesToInsert = nodes.map(node => {
      if (!node.type) {
        throw new Error('Each node must have a type');
      }

      return {
        node_id: crypto.randomUUID(),
        project_id: projectId,
        user_id: user.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        data: node.data || {},
        style: node.style || {}
      };
    });

    // Insert nodes
    const { data: insertedNodes, error: insertError } = await supabase
      .from('project_nodes')
      .insert(nodesToInsert)
      .select();

    if (insertError) {
      console.error('Error batch creating nodes:', insertError);
      return NextResponse.json(
        { error: 'Failed to create nodes' },
        { status: 500 }
      );
    }

    // Transform nodes for response
    const transformedNodes = insertedNodes.map(dbNode => ({
      id: dbNode.node_id,
      type: dbNode.type,
      position: dbNode.position,
      data: dbNode.data,
      style: dbNode.style,
      _dbId: dbNode.id,
      _createdAt: dbNode.created_at,
      _updatedAt: dbNode.updated_at
    }));

    return NextResponse.json({
      nodes: transformedNodes,
      count: transformedNodes.length
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/project/[id]/nodes/batch:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}