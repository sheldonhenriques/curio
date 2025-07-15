'use client';

import { Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const SandboxOfflineOverlay = ({ onRestart, isRestarting = false }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
        <div className="mb-6">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sandbox Offline
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
            You were idle for too long
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            Your development environment has been stopped to save resources.
          </p>
        </div>
        
        <Button 
          onClick={onRestart}
          disabled={isRestarting}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 text-lg
                   bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 
                   disabled:cursor-not-allowed rounded-lg font-medium"
        >
          <Play className="w-5 h-5" />
          {isRestarting ? 'Restarting Sandbox...' : 'Restart Sandbox'}
        </Button>
      </div>
    </div>
  );
};