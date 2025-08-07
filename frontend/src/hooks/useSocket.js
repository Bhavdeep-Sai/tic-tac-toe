import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const useSocket = (userId, onAuthError) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authError, setAuthError] = useState(null);

  const handleAuthError = useCallback((error) => {
    setAuthError(error);
    if (onAuthError) {
      onAuthError(error);
    }
  }, [onAuthError]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    
    const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setAuthError(null);
      
      const isGuestUser = userId.startsWith('guest_');
      const authToken = localStorage.getItem('token');
      
      console.log('Socket connecting for user:', { userId, isGuestUser, hasToken: !!authToken });
      
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
      setAuthError(null);
    });

    newSocket.on('guest_authenticated', () => {
      // Authentication successful for guest users
      console.log('Guest authentication successful');
      setAuthError(null);
    });

    newSocket.on('auth_error', (error) => {
      // Authentication failed
      console.error('Socket authentication error:', error);
      handleAuthError(error || 'Authentication failed');
    });

    newSocket.on('connect_error', (error) => {
      // Connection failed
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    newSocket.connect();
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setAuthError(null);
    };
  }, [userId, handleAuthError]);

  return { socket, isConnected, authError };
};

export default useSocket;
