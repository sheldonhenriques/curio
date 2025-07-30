import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSandboxStatus } from '@/services/sandboxService';
import { getProjectsInternal } from '@/utils/supabase/service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    // Handle ping request
    if (type === 'ping') {
      return NextResponse.json({
        success: true,
        message: 'pong',
        timestamp: Date.now()
      });
    }
    
    // Handle batch sandbox status request
    if (type === 'batch-status') {
      const supabase = await createClient();
      
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Get all projects for the user using internal service
      const projects = await getProjectsInternal(user.id);
      
      // Filter projects that have sandbox IDs
      const projectsWithSandboxes = projects.filter(project => project.sandboxId);
      
      if (projectsWithSandboxes.length === 0) {
        return NextResponse.json({
          success: true,
          statuses: {},
          message: 'No projects with sandboxes found'
        });
      }
      
      // Get status for all sandboxes in parallel
      const statusPromises = projectsWithSandboxes.map(async (project) => {
        try {
          const status = await getSandboxStatus(project.sandboxId);
          return {
            projectId: project.id,
            sandboxId: project.sandboxId,
            ...status
          };
        } catch (error) {
          console.error(`Error getting status for sandbox ${project.sandboxId}:`, error);
          return {
            projectId: project.id,
            sandboxId: project.sandboxId,
            status: 'error',
            error: error.message
          };
        }
      });
      
      const statuses = await Promise.all(statusPromises);
      
      // Convert to object with projectId as key
      const statusesMap = {};
      statuses.forEach(status => {
        statusesMap[status.projectId] = {
          sandboxId: status.sandboxId,
          status: status.status,
          previewUrl: status.previewUrl,
          error: status.error,
          lastUpdated: Date.now()
        };
      });
      
      return NextResponse.json({
        success: true,
        statuses: statusesMap,
        totalProjects: projectsWithSandboxes.length,
        timestamp: Date.now()
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid type parameter. Use "ping" or "batch-status"' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, projectIds } = body;
    
    // Handle selective batch status request
    if (type === 'selective-batch-status' && projectIds && Array.isArray(projectIds)) {
      const supabase = await createClient();
      
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Get specific projects for the user
      const projects = await getProjectsInternal(user.id);
      const requestedProjects = projects.filter(project => 
        projectIds.includes(project.id) && project.sandboxId
      );
      
      if (requestedProjects.length === 0) {
        return NextResponse.json({
          success: true,
          statuses: {},
          message: 'No valid projects with sandboxes found'
        });
      }
      
      // Get status for specific sandboxes in parallel
      const statusPromises = requestedProjects.map(async (project) => {
        try {
          const status = await getSandboxStatus(project.sandboxId);
          return {
            projectId: project.id,
            sandboxId: project.sandboxId,
            ...status
          };
        } catch (error) {
          console.error(`Error getting status for sandbox ${project.sandboxId}:`, error);
          return {
            projectId: project.id,
            sandboxId: project.sandboxId,
            status: 'error',
            error: error.message
          };
        }
      });
      
      const statuses = await Promise.all(statusPromises);
      
      // Convert to object with projectId as key
      const statusesMap = {};
      statuses.forEach(status => {
        statusesMap[status.projectId] = {
          sandboxId: status.sandboxId,
          status: status.status,
          previewUrl: status.previewUrl,
          error: status.error,
          lastUpdated: Date.now()
        };
      });
      
      return NextResponse.json({
        success: true,
        statuses: statusesMap,
        requestedProjects: projectIds.length,
        foundProjects: requestedProjects.length,
        timestamp: Date.now()
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid request body or type' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Webhook POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}