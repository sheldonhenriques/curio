import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useClaudeWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageCallbacksRef = useRef(new Map());

  const connect = useCallback(() => {
    try {
      // Create Socket.IO connection
      socketRef.current = io({
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 3000,
        reconnectionAttempts: 5
      });

      socketRef.current.on('connect', () => {
        setIsConnected(true);
        setConnectionError(null);
        
        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      socketRef.current.on('claude-message', (message) => {
        try {
          // Call all registered message callbacks
          messageCallbacksRef.current.forEach((callback) => {
            try {
              callback(message);
            } catch (callbackError) {
              console.error('[Socket.IO] Error in message callback:', callbackError);
            }
          });
        } catch (error) {
          console.error('[Socket.IO] Error processing message:', error, message);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        setIsConnected(false);
        
        // Socket.IO handles reconnection automatically, but we can add custom logic here if needed
        console.log('[Socket.IO] Disconnected:', reason);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('[Socket.IO] Connection error:', error);
        setConnectionError('Socket.IO connection failed');
      });

    } catch (error) {
      console.error('[Socket.IO] Error creating connection:', error);
      setConnectionError('Failed to create Socket.IO connection');
    }
  }, []);

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (message) => {
    if (socketRef.current && socketRef.current.connected) {
      try {
        socketRef.current.emit('claude-chat', message);
        return true;
      } catch (error) {
        console.error('[Socket.IO] Error sending message:', error);
        setConnectionError('Failed to send message');
        return false;
      }
    } else {
      console.error('[Socket.IO] Socket is not connected, state:', socketRef.current?.connected);
      setConnectionError('Socket.IO is not connected');
      return false;
    }
  };

  const subscribe = (callback) => {
    const id = Math.random().toString(36).substring(2, 11);
    messageCallbacksRef.current.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      messageCallbacksRef.current.delete(id);
    };
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect]);

  return {
    isConnected,
    connectionError,
    sendMessage,
    subscribe,
    reconnect: connect
  };
}