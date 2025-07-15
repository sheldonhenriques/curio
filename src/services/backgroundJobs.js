import { createSandbox } from './sandboxService.js';
import connectToDatabase from '@/lib/mongodb';
import Project from '@/models/Project';

/**
 * Background job to create sandbox for a project
 * @param {number} projectId - The project ID
 * @param {string} projectTitle - The project title
 */
export const createSandboxJob = async (projectId, projectTitle) => {
  console.log(`🔄 Starting background sandbox creation for project ${projectId}: ${projectTitle}`);
  
  try {
    await connectToDatabase();
    
    // Update project status to 'creating'
    await Project.findOneAndUpdate(
      { id: projectId },
      { 
        sandboxStatus: 'creating',
        sandboxError: null,
        updatedAt: 'just now',
        updatedAtTimestamp: new Date()
      }
    );
    
    // Create the sandbox
    const sandboxData = await createSandbox(projectTitle);
    console.log(`✅ Sandbox created successfully for project ${projectId}: ${sandboxData.sandboxId}`);
    
    // Update project with sandbox data
    await Project.findOneAndUpdate(
      { id: projectId },
      {
        sandboxId: sandboxData.sandboxId,
        sandboxStatus: 'created',
        sandboxError: null,
        updatedAt: 'just now',
        updatedAtTimestamp: new Date()
      }
    );
    
    console.log(`✅ Project ${projectId} updated with sandbox information`);
    
    return {
      success: true,
      sandboxId: sandboxData.sandboxId,
      previewUrl: sandboxData.previewUrl
    };
    
  } catch (error) {
    console.error(`❌ Error creating sandbox for project ${projectId}:`, error);
    
    // Update project with error status
    try {
      await connectToDatabase();
      await Project.findOneAndUpdate(
        { id: projectId },
        {
          sandboxStatus: 'failed',
          sandboxError: error.message,
          updatedAt: 'just now',
          updatedAtTimestamp: new Date()
        }
      );
    } catch (updateError) {
      console.error(`❌ Error updating project ${projectId} with error status:`, updateError);
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
 */
export const scheduleSandboxCreation = (projectId, projectTitle) => {
  const job = () => createSandboxJob(projectId, projectTitle);
  
  // Add job to queue
  jobQueue.push(job);
  
  // Process queue on next tick to avoid blocking the response
  process.nextTick(processQueue);
  
  console.log(`📅 Scheduled sandbox creation for project ${projectId}: ${projectTitle}`);
};