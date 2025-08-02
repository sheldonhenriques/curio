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
      
      const url = projectId 
        ? `/api/chat-sessions/${encodeURIComponent(nodeId)}?projectId=${projectId}`
        : `/api/chat-sessions/${encodeURIComponent(nodeId)}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
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
  }, [nodeId, projectId]);

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
        }),
        credentials: 'include'
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

  // Save message to session
  const saveMessage = useCallback(async (sessionId, message) => {
    if (!nodeId || !sessionId || !message) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/messages/${encodeURIComponent(sessionId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: message.id.toString(),
          type: message.type,
          content: message.content,
          metadata: message.metadata || {}
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save message');
      }

      
    } catch (err) {
      console.error('Error saving message:', err);
      setError(err.message);
    }
  }, [nodeId]);

  // Update session with new message (deprecated - use saveMessage instead)
  const updateSession = useCallback(async (sessionId, message) => {
    console.warn('updateSession is deprecated, use saveMessage instead');
    return saveMessage(sessionId, message);
  }, [saveMessage]);

  // Clear session for this node
  const clearSession = useCallback(async () => {
    if (!nodeId) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/chat-sessions?nodeId=${encodeURIComponent(nodeId)}`, {
        method: 'DELETE',
        credentials: 'include'
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

  // Get session ID
  const getSessionId = useCallback(() => {
    return session?.sessionId || null;
  }, [session]);

  // Get session messages (from embedded messages in session - for backwards compatibility)
  const getMessages = useCallback(() => {
    return session?.messages || [];
  }, [session]);

  // Load messages for the current session
  const loadMessages = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) return [];
    
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(sessionId)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      
      const data = await response.json();
      return data.messages || [];
      
    } catch (err) {
      console.error('Error loading messages:', err);
      return [];
    }
  }, [getSessionId]);

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
    loadMessages,
    createSession,
    saveMessage,
    updateSession, // Deprecated - use saveMessage
    clearSession,
    getMessages,
    getSessionId,
    hasSession
  };
}