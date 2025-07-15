import { useEffect, useRef, useCallback } from 'react';

export const useSandboxTimeout = (projectId, sandboxStatus, timeoutMinutes = 10) => {
  const timeoutRef = useRef(null);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const stopSandbox = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/sandbox/stop`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop sandbox');
      }
      
      window.dispatchEvent(new CustomEvent('sandboxStopped', { 
        detail: { projectId } 
      }));
      
    } catch (error) {
      console.error('Error stopping sandbox due to inactivity:', error);
    }
  }, [projectId]);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (sandboxStatus === 'started') {
      timeoutRef.current = setTimeout(stopSandbox, timeoutMs);
    }
  }, [sandboxStatus, stopSandbox, timeoutMs]);

  const clearTimeoutFn = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (sandboxStatus === 'started') {
      resetTimeout();
    } else {
      clearTimeoutFn();
    }
    
    return clearTimeoutFn;
  }, [sandboxStatus, resetTimeout, clearTimeoutFn]);

  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimeout();
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
    
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [resetTimeout]);

  return {
    resetTimeout,
    clearTimeout: clearTimeoutFn
  };
};