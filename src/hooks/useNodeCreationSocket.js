import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useNodeCreationSocket(projectId, onNodeCreated) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!projectId || !onNodeCreated) return;

    // Create socket connection
    socketRef.current = io();

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Node creation socket connected:', socket.id);
      // Join the project room to receive node creation events
      socket.emit('join', { projectId: projectId });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Node creation socket disconnected');
    });

    // Listen for node creation events
    socket.on('node_created', (data) => {
      console.log('📡 Received node creation event:', data);
      if (data.projectId === parseInt(projectId)) {
        onNodeCreated(data.node);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Node creation socket connection error:', error);
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up node creation socket');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [projectId, onNodeCreated]);

  return socketRef.current;
}