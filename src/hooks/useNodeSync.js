import { useEffect, useRef, useCallback } from 'react';
import { nodeLocalStorage } from '@/services/nodeLocalStorage';

/**
 * Hook for periodic syncing of node positions/dimensions from localStorage to database
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Sync interval in milliseconds (default: 10000)
 * @param {Function} options.updateNode - Function to update node in database
 * @param {string} options.projectId - Current project ID
 * @param {string} options.userId - Current user ID
 * @param {boolean} options.enabled - Whether syncing is enabled
 */
export const useNodeSync = ({ 
  interval = 10000, // 10 seconds default
  updateNode, 
  projectId, 
  userId,
  enabled = true 
}) => {
  const syncIntervalRef = useRef(null);
  const lastSyncRef = useRef(Date.now());

  /**
   * Perform sync operation for a specific project
   */
  const syncProjectNodes = useCallback(async (targetProjectId) => {
    if (!updateNode || !targetProjectId || !userId) {
      return { success: false, reason: 'Missing required parameters' };
    }

    try {
      const projectNodes = nodeLocalStorage.getProjectNodes(targetProjectId);
      const nodeIds = Object.keys(projectNodes);
      
      if (nodeIds.length === 0) {
        return { success: true, reason: 'No nodes to sync', synced: 0 };
      }

      let syncedCount = 0;
      const errors = [];

      // Sync each node
      for (const nodeId of nodeIds) {
        const nodeData = projectNodes[nodeId];
        
        try {
          // Prepare the update data
          const updateData = {};
          
          if (nodeData.position) {
            updateData.position = nodeData.position;
          }
          
          if (nodeData.style) {
            updateData.style = nodeData.style;
          }

          // Only sync if we have data to update
          if (Object.keys(updateData).length > 0) {
            await updateNode(nodeId, updateData, true); // immediate = true for sync
            syncedCount++;
          }
        } catch (error) {
          console.error(`Error syncing node ${nodeId}:`, error);
          errors.push({ nodeId, error: error.message });
        }
      }

      // Clear the change flag only if all nodes synced successfully
      if (errors.length === 0) {
        nodeLocalStorage.clearChanges(targetProjectId);
      }

      return {
        success: errors.length === 0,
        synced: syncedCount,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Error during node sync:', error);
      return { success: false, reason: error.message };
    }
  }, [updateNode, userId]);

  /**
   * Sync all projects with changes
   */
  const syncAllChangedProjects = useCallback(async () => {
    const changedProjects = nodeLocalStorage.getProjectsWithChanges();
    
    if (changedProjects.length === 0) {
      return { totalProjects: 0, results: [] };
    }

    const results = [];
    
    for (const projectId of changedProjects) {
      const result = await syncProjectNodes(projectId);
      results.push({
        projectId,
        ...result
      });
    }

    const successCount = results.filter(r => r.success).length;
    
    // Update last sync time
    lastSyncRef.current = Date.now();

    return {
      totalProjects: changedProjects.length,
      successCount,
      results
    };
  }, [syncProjectNodes]);

  /**
   * Force sync for current project
   */
  const forceSyncCurrentProject = useCallback(() => {
    if (projectId && nodeLocalStorage.hasChanges(projectId)) {
      return syncProjectNodes(projectId);
    }
    return Promise.resolve({ success: true, reason: 'No changes to sync' });
  }, [projectId, syncProjectNodes]);

  /**
   * Start the periodic sync
   */
  const startSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = setInterval(async () => {
      if (!enabled) return;

      try {
        const result = await syncAllChangedProjects();
        
        // Log sync results (only if there were changes)
        if (result.totalProjects > 0) {
          console.log(`Node sync completed: ${result.successCount}/${result.totalProjects} projects synced`);
          
          // Log any errors
          const failedResults = result.results.filter(r => !r.success);
          if (failedResults.length > 0) {
            console.warn('Some projects failed to sync:', failedResults);
          }
        }
      } catch (error) {
        console.error('Error during periodic sync:', error);
      }
    }, interval);
  }, [enabled, interval, syncAllChangedProjects]);

  /**
   * Stop the periodic sync
   */
  const stopSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  // Start/stop sync based on enabled state
  useEffect(() => {
    if (enabled && updateNode && userId) {
      startSync();
    } else {
      stopSync();
    }

    return stopSync;
  }, [enabled, updateNode, userId, startSync, stopSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSync();
    };
  }, [stopSync]);

  return {
    syncProjectNodes,
    syncAllChangedProjects,
    forceSyncCurrentProject,
    startSync,
    stopSync,
    isEnabled: enabled,
    lastSync: lastSyncRef.current
  };
};

export default useNodeSync;