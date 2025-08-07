import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const useSocket = (userId) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      
      const isGuestUser = userId.startsWith('guest_');
      const authToken = localStorage.getItem('token');
      
      if (authToken && !isGuestUser) {
        newSocket.emit('authenticate', authToken);
      } else if (isGuestUser) {
        newSocket.emit('authenticate_guest', {
          userId: userId,
          username: 'Guest'
        });
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('authenticated', () => {
      // Authentication successful for registered users
    });

    newSocket.on('guest_authenticated', () => {
      // Authentication successful for guest users
    });

    newSocket.on('auth_error', () => {
      // Authentication failed
    });

    newSocket.on('connect_error', () => {
      // Connection failed
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

export default useSocket;
