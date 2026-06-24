import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] });
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    setConnected(socketInstance.connected);

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
    };
  }, []);

  const on = (event, handler) => {
    if (!socketInstance) return;
    socketInstance.on(event, handler);
    return () => socketInstance.off(event, handler);
  };

  const emit = (event, data) => {
    if (socketInstance) socketInstance.emit(event, data);
  };

  return { connected, on, emit };
}
