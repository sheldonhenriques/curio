import connectToDatabase from './mongodb.js';
import ChatSession from '../models/ChatSession.js';

class SessionCleanupService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.cleanupIntervalHours = 5;
    this.sessionMaxAgeHours = 5;
  }

  async cleanupOldSessions() {
    try {
      await connectToDatabase();
      
      const result = await ChatSession.cleanupOldSessions(this.sessionMaxAgeHours);
      
      const deletedCount = result.deletedCount || 0;
      
      if (deletedCount > 0) {
        console.log(`[SessionCleanup] Cleaned up ${deletedCount} old sessions`);
      }
      
      return {
        success: true,
        deletedCount,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('[SessionCleanup] Error during cleanup:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  start() {
    if (this.isRunning) {
      console.log('[SessionCleanup] Cleanup service is already running');
      return;
    }

    console.log(`[SessionCleanup] Starting cleanup service (interval: ${this.cleanupIntervalHours}h, max age: ${this.sessionMaxAgeHours}h)`);
    
    this.isRunning = true;
    
    // Run cleanup immediately
    this.cleanupOldSessions();
    
    // Schedule regular cleanup
    this.intervalId = setInterval(() => {
      this.cleanupOldSessions();
    }, this.cleanupIntervalHours * 60 * 60 * 1000); // Convert hours to milliseconds
  }

  stop() {
    if (!this.isRunning) {
      console.log('[SessionCleanup] Cleanup service is not running');
      return;
    }

    console.log('[SessionCleanup] Stopping cleanup service');
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      cleanupIntervalHours: this.cleanupIntervalHours,
      sessionMaxAgeHours: this.sessionMaxAgeHours,
      nextCleanup: this.isRunning ? new Date(Date.now() + this.cleanupIntervalHours * 60 * 60 * 1000) : null
    };
  }

  // Method to manually trigger cleanup (for testing or admin purposes)
  async runCleanup() {
    return await this.cleanupOldSessions();
  }
}

// Create singleton instance
const sessionCleanupService = new SessionCleanupService();

export default sessionCleanupService;

// Export the class for testing
export { SessionCleanupService };