import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

class SessionCleanupService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.cleanupIntervalHours = 5;
    this.sessionMaxAgeHours = 5;
    this.supabase = null;
  }

  getSupabaseClient() {
    if (!this.supabase && supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
    return this.supabase;
  }

  async cleanupOldSessions() {
    try {
      const supabase = this.getSupabaseClient();
      
      if (!supabase) {
        throw new Error('Supabase client not available - check environment variables');
      }
      
      // Delete chat sessions older than the specified hours
      const cutoffTime = new Date(Date.now() - this.sessionMaxAgeHours * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .delete()
        .lt('created_at', cutoffTime.toISOString())
        .select('id');
      
      if (error) {
        throw error;
      }
      
      const deletedCount = data?.length || 0;
      
      
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
      return;
    }
    
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
      return;
    }
    
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