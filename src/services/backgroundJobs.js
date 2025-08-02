import { createSandboxWithId, startFileWatcher } from './sandboxService.js';
import { createClient } from '@supabase/supabase-js';

// Unified function to broadcast to both WebSocket systems
function broadcastToAllSystems(projectId, status, userId, previewUrl = null, error = null) {
  try {
    // 1. Broadcast to project rooms (for project pages)
    if (global.broadcastSandboxStatus) {
      global.broadcastSandboxStatus(projectId, status, previewUrl, error);
    } else {
      console.warn('⚠️ Project WebSocket broadcast function not available');
    }

    // 2. Broadcast to user rooms (for dashboard)
    if (global.socketIO && userId) {
      const room = `user-${userId}`;
      global.socketIO.to(room).emit('project_status_update', {
        type: 'project_status_update',
        projectId: parseInt(projectId),
        status,
        previewUrl,
        timestamp: Date.now()
      });
      
      const clientsInRoom = global.socketIO.sockets.adapter.rooms.get(room);
      const broadcastCount = clientsInRoom ? clientsInRoom.size : 0;
      console.log(`📡 Dashboard broadcast sent to ${broadcastCount} clients for project ${projectId}`);
    } else {
      console.warn('⚠️ Dashboard WebSocket broadcast not available (no socketIO or userId)');
    }
  } catch (error) {
    console.error('❌ Error broadcasting to WebSocket systems:', error);
    // Don't throw - broadcast failure shouldn't break sandbox creation
  }
}

// Function to broadcast node creation events
export function broadcastNodeCreated(projectId, userId, nodeData) {
  try {
    // 1. Broadcast to project rooms (for project pages)
    if (global.socketIO) {
      const projectRoom = `project-${projectId}`;
      global.socketIO.to(projectRoom).emit('node_created', {
        type: 'node_created',
        projectId: parseInt(projectId),
        node: nodeData,
        timestamp: Date.now()
      });
      
      const projectClientsInRoom = global.socketIO.sockets.adapter.rooms.get(projectRoom);
      const projectBroadcastCount = projectClientsInRoom ? projectClientsInRoom.size : 0;
      console.log(`📡 Node created broadcast sent to ${projectBroadcastCount} project clients for project ${projectId}`);
    }

    // 2. Broadcast to user rooms (for dashboard)
    if (global.socketIO && userId) {
      const userRoom = `user-${userId}`;
      global.socketIO.to(userRoom).emit('node_created', {
        type: 'node_created',
        projectId: parseInt(projectId),
        node: nodeData,
        timestamp: Date.now()
      });
      
      const userClientsInRoom = global.socketIO.sockets.adapter.rooms.get(userRoom);
      const userBroadcastCount = userClientsInRoom ? userClientsInRoom.size : 0;
      console.log(`📡 Node created broadcast sent to ${userBroadcastCount} user clients for project ${projectId}`);
    }
  } catch (error) {
    console.error('❌ Error broadcasting node creation:', error);
    // Don't throw - broadcast failure shouldn't break node creation
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
}

/**
 * Background job to create sandbox for a project
 * @param {number} projectId - The project ID
 * @param {string} projectTitle - The project title
 * @param {string} userId - The user ID who owns the project
 */
export const createSandboxJob = async (projectId, projectTitle, userId) => {
  // Create Supabase client with service role key for server-side operations
  // Service role should bypass RLS automatically
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'X-Client-Info': 'background-job'
      }
    }
  });

  // Verify we're using the service role key (should start with 'eyJ')
  if (!supabaseServiceKey || !supabaseServiceKey.startsWith('eyJ')) {
    console.error('❌ Service role key appears to be invalid or missing');
    console.error('Key starts with:', supabaseServiceKey?.substring(0, 10));
    throw new Error('Invalid service role key - cannot bypass RLS');
  }
  
  
  try {
    
    // First, verify the project exists and get current data
    // Service role should bypass RLS, so we don't need user_id filter
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (fetchError) {
      console.error(`❌ Error fetching project ${projectId}:`, fetchError);
      throw new Error(`Project ${projectId} not found: ${fetchError.message}`);
    }
    

    // Update project status to 'creating'
    const { data: updateData1, error: updateError1 } = await supabase
      .from('projects')
      .update({ 
        sandbox_status: 'creating',
        sandbox_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select();

    if (updateError1) {
      console.error(`❌ Error updating project ${projectId} to creating status:`, updateError1);
      throw updateError1;
    }
    
    
    
    // Create status callback to update database during setup
    const statusCallback = async (status) => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .update({
            sandbox_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .select();
          
        if (error) {
          console.error(`❌ Error updating project ${projectId} status to ${status}:`, error);
        } else {
          // Broadcast to both WebSocket systems
          broadcastToAllSystems(projectId, status, userId);
        }
      } catch (err) {
        console.error(`❌ Exception updating project ${projectId} status:`, err);
      }
    };
    
    // Create the sandbox and get ID immediately
    const { sandboxId, setupPromise } = await createSandboxWithId(projectTitle, statusCallback);
    
    
    // Update project with sandbox ID immediately
    const { data: updateData2, error: updateError2 } = await supabase
      .from('projects')
      .update({
        sandbox_id: sandboxId,
        sandbox_status: 'created',
        sandbox_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select();

    if (updateError2) {
      console.error(`❌ Error updating project ${projectId} with sandbox ID:`, updateError2);
      console.error('Update error details:', updateError2);
      throw updateError2;
    }
    
    // Note: File watcher will be updated with project ID after setup completes
    
    // Continue setup in background without blocking
    setupPromise
      .then(async (setupResult) => {
        // Final update when setup is complete
        await supabase
          .from('projects')
          .update({
            sandbox_status: 'started',
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
          
        // Update file watcher with project ID now that setup is complete
        try {
          await startFileWatcher(sandboxId, projectId);
        } catch (watcherError) {
          console.warn('⚠️ Failed to update file watcher with project ID:', watcherError);
        }
        
        // Broadcast to both WebSocket systems
        broadcastToAllSystems(projectId, 'started', userId, setupResult.previewUrl);
      })
      .catch(async (setupError) => {
        console.error(`❌ Setup failed for sandbox ${sandboxId}:`, setupError);
        
        // Update with setup error but keep the sandbox ID
        await supabase
          .from('projects')
          .update({
            sandbox_status: 'failed',
            sandbox_error: `Setup failed: ${setupError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
          
        // Broadcast to both WebSocket systems
        broadcastToAllSystems(projectId, 'failed', userId, null, `Setup failed: ${setupError.message}`);
      });
    
    return {
      success: true,
      sandboxId: sandboxId,
      previewUrl: `https://3000-${sandboxId}.proxy.daytona.work`
    };
    
  } catch (error) {
    console.error(`❌ Error creating sandbox for project ${projectId}:`, error);
    
    // Update project with error status
    try {
      const { data: errorUpdateData, error: errorUpdateError } = await supabase
        .from('projects')
        .update({
          sandbox_status: 'failed',
          sandbox_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select();
      
      if (errorUpdateError) {
        console.error(`❌ Error updating project ${projectId} with error status:`, errorUpdateError);
      }
    } catch (updateError) {
      console.error(`❌ Exception updating project ${projectId} with error status:`, updateError);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Queue for background jobs
 */
const jobQueue = [];
let isProcessing = false;

/**
 * Process jobs in the queue
 */
const processQueue = async () => {
  if (isProcessing || jobQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  
  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    
    try {
      await job();
    } catch (error) {
      console.error('Error processing background job:', error);
    }
  }
  
  isProcessing = false;
};

/**
 * Schedule a sandbox creation job
 * @param {number} projectId - The project ID
 * @param {string} projectTitle - The project title
 * @param {string} userId - The user ID who owns the project
 */
export const scheduleSandboxCreation = (projectId, projectTitle, userId) => {
  const job = () => createSandboxJob(projectId, projectTitle, userId);
  
  // Add job to queue
  jobQueue.push(job);
  
  // Process queue with a small delay to ensure database transaction is committed
  setTimeout(processQueue, 100); // 100ms delay
};