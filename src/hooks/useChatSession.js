import { useState, useEffect, useCallback } from 'react';

export function useChatSession(nodeId, projectId) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load session for this node
  const loadSession = useCallback(async () => {
    if (!nodeId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/chat-sessions/${nodeId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load session');
      }
      
      const data = await response.json();
      setSession(data.session);
      
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  // Create a new session
  const createSession = useCallback(async (sessionId) => {
    if (!nodeId || !projectId || !sessionId) return null;
    
    try {
      setError(null);
      
      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          nodeId,
          projectId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }
      
      const data = await response.json();
      
      // Reload session to get updated data
      await loadSession();
      
      return data.session;
      
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err.message);
      return null;
    }
  }, [nodeId, projectId, loadSession]);

  // Update session with new message
  const updateSession = useCallback(async (sessionId, message) => {
    if (!nodeId || !sessionId) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/chat-sessions/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update session');
      }
      
      // Reload session to get updated data
      await loadSession();
      
    } catch (err) {
      console.error('Error updating session:', err);
      setError(err.message);
    }
  }, [nodeId, loadSession]);

  // Clear session for this node
  const clearSession = useCallback(async () => {
    if (!nodeId) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/chat-sessions/${nodeId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear session');
      }
      
      setSession(null);
      
    } catch (err) {
      console.error('Error clearing session:', err);
      setError(err.message);
    }
  }, [nodeId]);

  // Get session messages
  const getMessages = useCallback(() => {
    return session?.messages || [];
  }, [session]);

  // Get session ID
  const getSessionId = useCallback(() => {
    return session?.sessionId || null;
  }, [session]);

  // Check if session exists
  const hasSession = useCallback(() => {
    return session !== null;
  }, [session]);

  // Load session on component mount or when nodeId changes
  useEffect(() => {
    if (nodeId) {
      loadSession();
    }
  }, [loadSession, nodeId]);

  return {
    session,
    loading,
    error,
    loadSession,
    createSession,
    updateSession,
    clearSession,
    getMessages,
    getSessionId,
    hasSession
  };
}