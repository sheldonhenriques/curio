import { useEffect, useRef, useState } from 'react';

export function useClaudeWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageCallbacksRef = useRef(new Map());

  const connect = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/claude-ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WS] Connected to Claude WebSocket');
        setIsConnected(true);
        setConnectionError(null);
        
        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WS] Received message:', message.type);
          
          // Call all registered message callbacks
          messageCallbacksRef.current.forEach((callback) => {
            try {
              callback(message);
            } catch (callbackError) {
              console.error('[WS] Error in message callback:', callbackError);
            }
          });
        } catch (error) {
          console.error('[WS] Error parsing message:', error, event.data);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`[WS] Disconnected from Claude WebSocket: ${event.code} ${event.reason}`);
        setIsConnected(false);
        
        // Only attempt to reconnect if it wasn't a manual disconnect
        if (event.code !== 1000 && !reconnectTimeoutRef.current) {
          console.log('[WS] Attempting to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        setConnectionError('WebSocket connection failed');
      };

    } catch (error) {
      console.error('[WS] Error creating WebSocket:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        console.log('[WS] Sending message:', message.type);
        wsRef.current.send(messageStr);
        return true;
      } catch (error) {
        console.error('[WS] Error sending message:', error);
        setConnectionError('Failed to send message');
        return false;
      }
    } else {
      console.error('[WS] WebSocket is not connected, state:', wsRef.current?.readyState);
      setConnectionError('WebSocket is not connected');
      return false;
    }
  };

  const subscribe = (callback) => {
    const id = Math.random().toString(36).substr(2, 9);
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
  }, []);

  return {
    isConnected,
    connectionError,
    sendMessage,
    subscribe,
    reconnect: connect
  };
}