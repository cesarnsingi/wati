import { useEffect, useRef } from 'react';
import { io, Socket }        from 'socket.io-client';
import { useAuthStore }      from '../store/auth.store';

let socket: Socket | null = null;

export function useSocket() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token || socket?.connected) return;

    socket = io(
      (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace('/api/v1', '') + '/ws',
      { auth: { token }, transports: ['websocket'] },
    );

    socket.on('connect',          () => console.log('[WS] connected'));
    socket.on('disconnect',       () => console.log('[WS] disconnected'));
    socket.on('connect_error',    (e) => console.error('[WS] error:', e.message));

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token]);

  return socket;
}
