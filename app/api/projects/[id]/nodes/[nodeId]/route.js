import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/projects/[id]/nodes/[nodeId] - Get specific node
export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const projectId = parseInt(params.id);
    const nodeId = params.nodeId;

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch node with project access verification
    const { data: node, error: nodeError } = await supabase
      .from('project_nodes')
      .select('*')
      .eq('node_id', nodeId)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (nodeError || !node) {
      return NextResponse.json(
        { error: 'Node not found or access denied' },
        { status: 404 }
      );
    }

    // Transform node for ReactFlow
    const transformedNode = {
      id: node.node_id,
      type: node.type,
      position: node.position,
      data: node.data,
      style: node.style,
      _dbId: node.id,
      _createdAt: node.created_at,
      _updatedAt: node.updated_at
    };

    return NextResponse.json(transformedNode);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/nodes/[nodeId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/nodes/[nodeId] - Update specific node
export async function PUT(request, { params }) {
  try {
    const supabase = await createClient();
    const projectId = parseInt(params.id);
    const nodeId = params.nodeId;
    const body = await request.json();

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify node exists and user has access
    const { data: existingNode, error: nodeError } = await supabase
      .from('project_nodes')
      .select('*')
      .eq('node_id', nodeId)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (nodeError || !existingNode) {
      return NextResponse.json(
        { error: 'Node not found or access denied' },
        { status: 404 }
      );
    }

    // Prepare update data (only allow specific fields)
    const updateData = {};
    const allowedFields = ['position', 'data', 'style'];
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // If no valid fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update node
    const { data: updatedNode, error: updateError } = await supabase
      .from('project_nodes')
      .update(updateData)
      .eq('node_id', nodeId)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating node:', updateError);
      return NextResponse.json(
        { error: 'Failed to update node' },
        { status: 500 }
      );
    }

    // Transform updated node
    const transformedNode = {
      id: updatedNode.node_id,
      type: updatedNode.type,
      position: updatedNode.position,
      data: updatedNode.data,
      style: updatedNode.style,
      _dbId: updatedNode.id,
      _createdAt: updatedNode.created_at,
      _updatedAt: updatedNode.updated_at
    };

    return NextResponse.json(transformedNode);
  } catch (error) {
    console.error('Error in PUT /api/projects/[id]/nodes/[nodeId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/nodes/[nodeId] - Delete specific node
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();
    const projectId = parseInt(params.id);
    const nodeId = params.nodeId;

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify node exists and user has access before deletion
    const { data: existingNode, error: nodeError } = await supabase
      .from('project_nodes')
      .select('id')
      .eq('node_id', nodeId)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (nodeError || !existingNode) {
      return NextResponse.json(
        { error: 'Node not found or access denied' },
        { status: 404 }
      );
    }

    // Delete node
    const { error: deleteError } = await supabase
      .from('project_nodes')
      .delete()
      .eq('node_id', nodeId)
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting node:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete node' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Node deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/nodes/[nodeId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}