import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (userId) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Always connect, even for guest users
    if (!userId) return;

    const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected:', newSocket.id);
      
      // Check if user is guest
      const isGuest = userId.startsWith('guest_');
      const token = localStorage.getItem('token');
      
      if (token && !isGuest) {
        newSocket.emit('authenticate', token);
      } else if (isGuest) {
        // For guest users, emit guest authentication
        newSocket.emit('authenticate_guest', {
          userId: userId,
          username: 'Guest'
        });
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
    });

    newSocket.on('guest_authenticated', (data) => {
      console.log('Guest authenticated:', data);
    });

    newSocket.on('auth_error', (error) => {
      console.error('Socket auth error:', error);
    });

    // Handle connection errors
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.connect();
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [userId]);

  return { socket, isConnected };
};