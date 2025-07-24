import { createSandbox, createSandboxWithId } from './sandboxService.js';
import { createClient } from '@supabase/supabase-js';

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