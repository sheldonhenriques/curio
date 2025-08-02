'use client';

import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook for sandbox status WebSocket connection
 * @param {string} projectId - The project ID to listen for status updates
 * @param {function} onStatusUpdate - Callback for status updates { status, previewUrl, error }
 */
export const useSandboxWebSocket = (projectId, onStatusUpdate) => {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (!projectId || socketRef.current?.connected) return;

    console.log(`🔌 Connecting to sandbox WebSocket for project ${projectId}`);

    const socket = io({
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      forceNew: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`✅ Sandbox WebSocket connected for project ${projectId}`);
      isConnectedRef.current = true;
      
      // Join the project room to receive sandbox status updates
      socket.emit('join', { projectId });
      
      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    // Listen for sandbox status updates
    socket.on('sandbox-status', (message) => {
      console.log('📡 Received sandbox status update:', message);
      if (message.projectId === projectId && onStatusUpdate) {
        onStatusUpdate({
          status: message.status,
          previewUrl: message.previewUrl,
          error: message.error
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Sandbox WebSocket disconnected for project ${projectId}:`, reason);
      isConnectedRef.current = false;
      
      // Attempt to reconnect after 3 seconds
      if (reason !== 'io client disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`🔄 Reconnecting sandbox WebSocket for project ${projectId}...`);
          connect();
        }, 3000);
      }
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ Sandbox WebSocket connection error for project ${projectId}:`, error);
      isConnectedRef.current = false;
    });

  }, [projectId, onStatusUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      console.log(`🔌 Disconnecting sandbox WebSocket for project ${projectId}`);
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    }
  }, [projectId]);

  // Connect when projectId changes
  useEffect(() => {
    if (projectId) {
      connect();
    }

    return disconnect;
  }, [projectId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return disconnect;
  }, [disconnect]);

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect
  };
};