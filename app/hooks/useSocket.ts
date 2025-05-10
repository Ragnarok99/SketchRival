'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';

// Tipos para el estado de conexión
export enum SocketConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

// Interfaces para eventos comunes
export interface MessageEvent {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomEvent {
  room: {
    id: string;
    players: {
      userId: string;
      username: string;
      isReady: boolean;
      role: string;
      avatarColor?: string;
    }[];
  };
}

export interface PlayerReadyEvent extends RoomEvent {
  playerId: string;
  isReady: boolean;
}

export interface PlayerJoinedEvent extends RoomEvent {
  playerId: string;
  playerName: string;
}

export interface PlayerLeftEvent extends RoomEvent {
  playerId: string;
}

export interface NotificationEvent {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface GameStartedEvent {
  roomId: string;
  startedById: string;
}

// Configuración del hook
interface UseSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  offlineQueue?: boolean;
}

// Hook principal
export default function useSocket(options: UseSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_SOCKET_URL,
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 3000,
    offlineQueue = true,
  } = options;

  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>(
    SocketConnectionState.DISCONNECTED
  );
  const [error, setError] = useState<Error | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const messageQueue = useRef<{ event: string; data: any; callback?: Function }[]>([]);

  // Función para conectar al socket
  const connect = useCallback(() => {
    if (!user || !url) {
      setConnectionState(SocketConnectionState.ERROR);
      setError(new Error('No user or socket URL available'));
      return;
    }

    try {
      setConnectionState(SocketConnectionState.CONNECTING);
      
      const socketInstance = io(url, {
        auth: {
          userId: user.userId,
          username: user.username,
          token: localStorage.getItem('accessToken'), // Usar token si está disponible
        },
        reconnection: false, // Manejamos reconexión manualmente
        timeout: 10000,
      });

      // Manejar eventos de conexión
      socketInstance.on('connect', () => {
        setConnectionState(SocketConnectionState.CONNECTED);
        setError(null);
        reconnectCount.current = 0;
        processQueue(socketInstance);
      });

      socketInstance.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setError(err);
        handleReconnect();
      });

      socketInstance.on('disconnect', (reason) => {
        console.warn('Socket disconnected:', reason);
        setConnectionState(SocketConnectionState.DISCONNECTED);
        handleReconnect();
      });

      socketInstance.on('error', (err) => {
        console.error('Socket error:', err);
        setError(typeof err === 'string' ? new Error(err) : err);
        setConnectionState(SocketConnectionState.ERROR);
      });

      setSocket(socketInstance);
      return socketInstance;
    } catch (err) {
      console.error('Error creating socket:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setConnectionState(SocketConnectionState.ERROR);
      handleReconnect();
      return null;
    }
  }, [user, url]);

  // Manejar reconexión automática
  const handleReconnect = useCallback(() => {
    if (reconnectCount.current >= reconnectionAttempts) {
      setConnectionState(SocketConnectionState.ERROR);
      setError(new Error(`Failed to reconnect after ${reconnectionAttempts} attempts`));
      return;
    }

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }

    reconnectTimer.current = setTimeout(() => {
      reconnectCount.current += 1;
      console.log(`Attempting reconnect: ${reconnectCount.current}/${reconnectionAttempts}`);
      connect();
    }, reconnectionDelay);
  }, [connect, reconnectionAttempts, reconnectionDelay]);

  // Inicializar conexión
  useEffect(() => {
    if (autoConnect) {
      const socketInstance = connect();
      
      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
        }
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
        }
      };
    }
  }, [autoConnect, connect]);

  // Función segura para emitir eventos
  const emit = useCallback(
    (event: string, data: any, callback?: Function) => {
      if (!socket || socket.disconnected) {
        console.warn('Socket not connected, adding to queue:', event);
        
        // Si la cola está habilitada, guardar mensaje para enviar después
        if (offlineQueue) {
          messageQueue.current.push({ event, data, callback });
        }
        
        return false;
      }

      socket.emit(event, data, callback);
      return true;
    },
    [socket, offlineQueue]
  );

  // Procesar cola de mensajes cuando reconectamos
  const processQueue = useCallback((socketInstance: Socket) => {
    if (!offlineQueue || messageQueue.current.length === 0) return;
    
    console.log(`Processing offline queue: ${messageQueue.current.length} messages`);
    
    // Procesar y vaciar la cola
    [...messageQueue.current].forEach(({ event, data, callback }) => {
      socketInstance.emit(event, data, callback);
    });
    
    messageQueue.current = [];
  }, [offlineQueue]);

  // Función para desconectar manualmente
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    setConnectionState(SocketConnectionState.DISCONNECTED);
  }, [socket]);

  // Función de subscripción tipada
  const on = useCallback(
    <T = any>(event: string, callback: (data: T) => void) => {
      if (!socket) return () => {};

      socket.on(event, callback);
      return () => {
        socket.off(event, callback);
      };
    },
    [socket]
  );

  // Función para unirse a una sala
  const joinRoom = useCallback(
    (roomId: string, accessCode: string = '', callback?: Function) => {
      return emit('room:join', { roomId, userId: user?.userId, accessCode }, callback);
    },
    [emit, user]
  );

  // Función para abandonar una sala
  const leaveRoom = useCallback(
    (roomId: string, callback?: Function) => {
      return emit('room:leave', { roomId, userId: user?.userId }, callback);
    },
    [emit, user]
  );

  // Función para enviar un mensaje al chat
  const sendChatMessage = useCallback(
    (roomId: string, text: string, callback?: Function) => {
      return emit('chat:send', { roomId, userId: user?.userId, text }, callback);
    },
    [emit, user]
  );

  // Función para cambiar estado de listo
  const setReady = useCallback(
    (roomId: string, isReady: boolean, callback?: Function) => {
      return emit('room:setReady', { roomId, userId: user?.userId, isReady }, callback);
    },
    [emit, user]
  );

  // Función para iniciar juego (solo anfitrión)
  const startGame = useCallback(
    (roomId: string, callback?: Function) => {
      return emit('game:start', { roomId, userId: user?.userId }, callback);
    },
    [emit, user]
  );

  return {
    socket,
    connectionState,
    error,
    isConnected: connectionState === SocketConnectionState.CONNECTED,
    connect,
    disconnect,
    emit,
    on,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    setReady,
    startGame,
  };
} 