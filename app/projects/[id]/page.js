'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import Canvas from '@/components/flow/Canvas';
import { Button } from '@/components/ui/Button';
import { SandboxOfflineOverlay } from '@/components/project/SandboxOfflineOverlay';
import { Loader2, AlertCircle, Play } from 'lucide-react';
// Constants for sandbox startup steps
const SANDBOX_STARTUP_STEPS = [
  { id: 'starting', label: 'Starting sandbox...' },
  { id: 'server', label: 'Starting development server...' },
  { id: 'complete', label: 'Sandbox ready!' }
];
import { useSandboxTimeout } from '@/hooks/useSandboxTimeout';
import { useSandboxWebSocket } from '@/hooks/useSandboxWebSocket';

export default function ProductPage({ params }) {
  const [id, setId] = useState(null);
  
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    getParams();
  }, [params]);
  const [project, setProject] = useState(null);
  const [sandboxStatus, setSandboxStatus] = useState('checking');
  const [startupProgress, setStartupProgress] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingSandbox, setIsStartingSandbox] = useState(false);
  const statusPollingIntervalRef = useRef(null);

  // Set up inactivity timeout for sandbox
  const { resetTimeout, clearTimeout } = useSandboxTimeout(id, sandboxStatus);

  // WebSocket status update handler
  const handleSandboxStatusUpdate = useCallback(async (update) => {
    console.log('📡 Received sandbox status update:', update);
    setSandboxStatus(update.status);
    if (update.previewUrl) {
      setPreviewUrl(update.previewUrl);
    }
    if (update.error) {
      setError(update.error);
    }
    
    // Trigger route discovery when sandbox becomes ready via WebSocket
    if (update.status === 'started' && id) {
      try {
        await fetch(`/api/projects/${id}/scan-routes`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to trigger route discovery via WebSocket update:', error);
      }
    }
  }, [id]);

  // Set up WebSocket connection for real-time sandbox status updates
  useSandboxWebSocket(id, handleSandboxStatusUpdate);

  // Listen for sandbox stopped event
  useEffect(() => {
    const handleSandboxStopped = (event) => {
      if (event.detail.projectId === id) {
        setSandboxStatus('stopped');
        setPreviewUrl(null);
      }
    };

    window.addEventListener('sandboxStopped', handleSandboxStopped);
    return () => {
      window.removeEventListener('sandboxStopped', handleSandboxStopped);
    };
  }, [id]);

  // Start sandbox function
  const startSandbox = useCallback(async () => {
    try {
      setIsStartingSandbox(true);
      setStartupProgress({ currentStep: 0, steps: SANDBOX_STARTUP_STEPS });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setStartupProgress(prev => {
          if (prev && prev.currentStep < SANDBOX_STARTUP_STEPS.length - 1) {
            return { ...prev, currentStep: prev.currentStep + 1 };
          }
          return prev;
        });
      }, 2000);

      const response = await fetch(`/api/projects/${id}/sandbox/start`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to start sandbox');
      }

      const data = await response.json();
      clearInterval(progressInterval);
      setStartupProgress({ currentStep: SANDBOX_STARTUP_STEPS.length - 1, steps: SANDBOX_STARTUP_STEPS });
      setSandboxStatus('started');
      setPreviewUrl(data.previewUrl);
      setError(null);
      
      // Trigger route discovery when sandbox starts successfully
      try {
        await fetch(`/api/projects/${id}/scan-routes`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to trigger route discovery after sandbox start:', error);
      }
      
      setTimeout(() => {
        setStartupProgress(null);
      }, 1000);
    } catch (err) {
      setError(err.message);
      setSandboxStatus('error');
      setStartupProgress(null);
    } finally {
      setIsStartingSandbox(false);
    }
  }, [id]);

  // Load project data and check sandbox status
  useEffect(() => {
    if (!id) return; // Wait for id to be available
    
    const loadProject = async () => {
      try {
        setIsLoading(true);
        
        // Load project data
        const projectResponse = await fetch(`/api/projects/${id}`, {
          credentials: 'include'
        });
        if (!projectResponse.ok) {
          throw new Error('Failed to load project');
        }
        const projectData = await projectResponse.json();
        setProject(projectData);

        // Check sandbox status
        if (projectData.sandboxId) {
          const statusResponse = await fetch(`/api/projects/${id}/sandbox/status`, {
            credentials: 'include'
          });
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            setSandboxStatus(statusData.status);
            if (statusData.previewUrl) {
              setPreviewUrl(statusData.previewUrl);
            }
            
            // Auto-start sandbox if it's not running and not still being created
            if (statusData.status !== 'starting' && statusData.status !== 'creating') {
              await startSandbox();
            }
            
            // Trigger route discovery if sandbox is ready
            if (statusData.status === 'started') {
              try {
                await fetch(`/api/projects/${id}/scan-routes`, {
                  method: 'POST',
                  credentials: 'include'
                });
              } catch (error) {
                console.error('Failed to trigger route discovery:', error);
              }
            }
          } else {
            setSandboxStatus('error');
          }
        } else {
          setSandboxStatus('no_sandbox');
        }
      } catch (err) {
        setError(err.message);
        setSandboxStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [id, startSandbox]);

  // Fallback polling for initial status check (reduced frequency since WebSocket handles real-time updates)
  useEffect(() => {
    if (!id || !project) return;
    
    // Only poll during transitional states as a fallback
    const hasTransitionalStatus = sandboxStatus === 'creating' || sandboxStatus === 'starting' || isStartingSandbox;
    
    if (hasTransitionalStatus) {
      if (!statusPollingIntervalRef.current) {
        statusPollingIntervalRef.current = setInterval(async () => {
          try {
            // Light polling as fallback - only check project data
            const projectResponse = await fetch(`/api/projects/${id}`, {
              credentials: 'include'
            });
            
            if (projectResponse.ok) {
              const projectData = await projectResponse.json();
              setProject(projectData);
              
              // Update sandbox status from project data if WebSocket missed it
              if (projectData.sandboxStatus && projectData.sandboxStatus !== sandboxStatus) {
                setSandboxStatus(projectData.sandboxStatus);
              }
            }
          } catch (error) {
            console.error('Error polling sandbox status (fallback):', error);
          }
        }, 60000); // Reduced to 60 seconds since WebSocket handles real-time updates
      }
    } else {
      // Stop polling if not needed
      if (statusPollingIntervalRef.current) {
        clearInterval(statusPollingIntervalRef.current);
        statusPollingIntervalRef.current = null;
      }
    }
  }, [id, project, sandboxStatus, isStartingSandbox]);

  // Cleanup effect for polling
  useEffect(() => {
    return () => {
      if (statusPollingIntervalRef.current) {
        clearInterval(statusPollingIntervalRef.current);
        statusPollingIntervalRef.current = null;
      }
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && sandboxStatus === 'error') {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to open project
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Sidebar />
      
      {/* Sandbox Offline Overlay */}
      {sandboxStatus === 'stopped' && (
        <SandboxOfflineOverlay 
          onRestart={startSandbox}
          isRestarting={isStartingSandbox}
        />
      )}
      
      {/* Main content area */}
      <div className="ml-16 transition-all duration-300 px-6 py-4 flex flex-col h-screen">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {project?.title || 'Loading Project...'}
            </h1>
            {sandboxStatus === 'started' && (
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full text-xs font-medium">
                Sandbox Running
              </span>
            )}
            {sandboxStatus === 'stopped' && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 rounded-full text-xs font-medium">
                Sandbox Stopped
              </span>
            )}
            {sandboxStatus === 'creating' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs font-medium">
                Setting Up Sandbox...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {(sandboxStatus === 'stopped' || sandboxStatus === 'created') && (
              <Button 
                onClick={startSandbox}
                disabled={isStartingSandbox}
                className="flex items-center gap-2 px-4 py-2 rounded-lg 
                 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 
                 disabled:cursor-not-allowed"
              >
                {isStartingSandbox ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isStartingSandbox ? 'Starting...' : 'Start Sandbox'}
              </Button>
            )}
            {sandboxStatus === 'creating' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Setting up sandbox...</span>
              </div>
            )}
            <Button className="flex items-center gap-2 px-4 py-2 rounded-lg 
             bg-black-600 text-white hover:bg-black-700 
             dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Details
            </Button>
            <Button className="flex items-center gap-2 px-4 py-2 rounded-lg 
             bg-black-600 text-white hover:bg-black-700 
             dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Share
            </Button>
            <Button className="flex items-center gap-2 px-4 py-2 rounded-lg 
             bg-black-600 text-white hover:bg-black-700 
             dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Add Card
            </Button>
            <Button className="flex items-center gap-2 px-4 py-2 rounded-lg 
             bg-black-600 text-white hover:bg-black-700 
             dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Arrange Cards
            </Button>
          </div>
        </div>

        {/* Startup Progress */}
        {startupProgress && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
              Starting development environment...
            </h3>
            <div className="space-y-2">
              {startupProgress.steps.map((step, index) => {
                const isCompleted = index < startupProgress.currentStep;
                const isCurrent = index === startupProgress.currentStep;
                const isUpcoming = index > startupProgress.currentStep;
                
                return (
                  <div key={step.id} className="flex items-center space-x-2">
                    {isCompleted && (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {isCurrent && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                    )}
                    {isUpcoming && (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0" />
                    )}
                    <span className={`text-sm ${
                      isCompleted ? 'text-green-700 dark:text-green-300' :
                      isCurrent ? 'text-blue-700 dark:text-blue-300' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <Canvas project={project} previewUrl={previewUrl} sandboxStatus={sandboxStatus} />
        </div>
      </div>
    </div>
  );
}
