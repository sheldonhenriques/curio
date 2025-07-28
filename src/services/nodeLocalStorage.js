/**
 * Local storage service for managing node positions and dimensions
 * Provides browser-based temporary storage with change tracking
 */

class NodeLocalStorageService {
  constructor() {
    this.storageKey = 'curio_node_positions';
    this.changeTracker = new Set(); // Track which projects have changes
    this.listeners = new Map(); // Project-specific change listeners
  }

  /**
   * Get stored node data for a project
   * @param {string} projectId - Project ID
   * @returns {Object} Node data object
   */
  getProjectNodes(projectId) {
    if (!projectId) return {};
    
    try {
      const allData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      return allData[projectId] || {};
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  }

  /**
   * Store node position/dimensions for a project
   * @param {string} projectId - Project ID
   * @param {string} nodeId - Node ID
   * @param {Object} nodeData - Node position/dimension data
   */
  setNodeData(projectId, nodeId, nodeData) {
    if (!projectId || !nodeId) return;

    try {
      const allData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      
      if (!allData[projectId]) {
        allData[projectId] = {};
      }

      // Merge with existing data
      allData[projectId][nodeId] = {
        ...allData[projectId][nodeId],
        ...nodeData,
        lastModified: Date.now()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(allData));
      
      // Mark project as having changes
      this.markProjectChanged(projectId);
      
      // Notify listeners
      this.notifyListeners(projectId);
      
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  /**
   * Get specific node data
   * @param {string} projectId - Project ID
   * @param {string} nodeId - Node ID
   * @returns {Object|null} Node data or null if not found
   */
  getNodeData(projectId, nodeId) {
    const projectNodes = this.getProjectNodes(projectId);
    return projectNodes[nodeId] || null;
  }

  /**
   * Mark a project as having changes
   * @param {string} projectId - Project ID
   */
  markProjectChanged(projectId) {
    this.changeTracker.add(projectId);
  }

  /**
   * Check if a project has unsaved changes
   * @param {string} projectId - Project ID
   * @returns {boolean} True if project has changes
   */
  hasChanges(projectId) {
    return this.changeTracker.has(projectId);
  }

  /**
   * Clear change flag for a project (after successful sync)
   * @param {string} projectId - Project ID
   */
  clearChanges(projectId) {
    this.changeTracker.delete(projectId);
  }

  /**
   * Get all projects with unsaved changes
   * @returns {Array} Array of project IDs with changes
   */
  getProjectsWithChanges() {
    return Array.from(this.changeTracker);
  }

  /**
   * Clear stored data for a project (useful for cleanup)
   * @param {string} projectId - Project ID
   */
  clearProjectData(projectId) {
    try {
      const allData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      delete allData[projectId];
      localStorage.setItem(this.storageKey, JSON.stringify(allData));
      this.clearChanges(projectId);
    } catch (error) {
      console.error('Error clearing project data:', error);
    }
  }

  /**
   * Add a change listener for a project
   * @param {string} projectId - Project ID
   * @param {Function} callback - Callback function
   */
  addChangeListener(projectId, callback) {
    if (!this.listeners.has(projectId)) {
      this.listeners.set(projectId, new Set());
    }
    this.listeners.get(projectId).add(callback);
  }

  /**
   * Remove a change listener
   * @param {string} projectId - Project ID
   * @param {Function} callback - Callback function
   */
  removeChangeListener(projectId, callback) {
    if (this.listeners.has(projectId)) {
      this.listeners.get(projectId).delete(callback);
    }
  }

  /**
   * Notify all listeners for a project
   * @param {string} projectId - Project ID
   */
  notifyListeners(projectId) {
    if (this.listeners.has(projectId)) {
      const callbacks = this.listeners.get(projectId);
      callbacks.forEach(callback => {
        try {
          callback(projectId);
        } catch (error) {
          console.error('Error in change listener:', error);
        }
      });
    }
  }

  /**
   * Get storage statistics
   * @returns {Object} Storage stats
   */
  getStats() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return {
        totalProjects: Object.keys(JSON.parse(data || '{}')).length,
        changedProjects: this.changeTracker.size,
        storageSize: data ? data.length : 0
      };
    } catch (error) {
      return { totalProjects: 0, changedProjects: 0, storageSize: 0 };
    }
  }
}

// Export singleton instance
export const nodeLocalStorage = new NodeLocalStorageService();
export default nodeLocalStorage;