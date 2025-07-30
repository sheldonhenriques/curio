import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const messageCallbacksRef = useRef(new Map());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const { user } = useAuth();

  const connect = useCallback(() => {
    console.log('🔌 useSocket connect called, user:', user?.id);
    // Connect even without user ID, will join room when user loads
    console.log('🔌 Attempting to connect Socket.IO');
    try {
      // Close existing connection
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Create new Socket.IO connection with Codespace-optimized config
      socketRef.current = io({
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        // Force polling only for GitHub Codespaces stability
        transports: ['polling'],
        // Disable WebSocket upgrade to prevent connection failures
        upgrade: false,
        // Add forceNew to prevent connection reuse issues
        forceNew: true
      });

      socketRef.current.on('connect', () => {
        console.log('🔌 Socket.IO connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Join user-specific room for targeted updates
        if (user?.id) {
          socketRef.current.emit('join', { userId: user.id });
          console.log('🔌 Joined room for user:', user.id);
        } else {
          console.log('🔌 Connected but no user ID yet, will join room when user loads');
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO disconnected:', reason);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('🔌 Socket.IO connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      // Handle project status updates
      socketRef.current.on('project_status_update', (data) => {
        console.log('📡 Socket.IO project update received:', data);
        
        // Call all registered message callbacks
        messageCallbacksRef.current.forEach((callback) => {
          try {
            callback(data.projectId, data.status, data);
          } catch (callbackError) {
            console.error('Error in Socket.IO message callback:', callbackError);
          }
        });
      });

    } catch (error) {
      console.error('Failed to create Socket.IO connection:', error);
      setConnectionError(error.message);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  }, [isConnected]);

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  // Register callback for project updates
  const onProjectUpdate = useCallback((callback) => {
    const callbackId = Date.now().toString();
    messageCallbacksRef.current.set(callbackId, callback);
    
    return () => {
      messageCallbacksRef.current.delete(callbackId);
    };
  }, [user]);

  // Effect to connect Socket.IO
  useEffect(() => {
    connect();
    
    return disconnect;
  }, [connect, disconnect]);

  // Effect to join user room when user ID becomes available
  useEffect(() => {
    if (socketRef.current && isConnected && user?.id) {
      console.log('🔌 User ID available, joining room for user:', user.id);
      socketRef.current.emit('join', { userId: user.id });
    }
  }, [user?.id, isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    connect,
    disconnect,
    emit,
    on,
    off,
    onProjectUpdate
  };
}