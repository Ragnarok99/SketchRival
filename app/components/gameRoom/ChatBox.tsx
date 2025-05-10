'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { io, Socket } from 'socket.io-client';

interface Message {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

interface ChatBoxProps {
  roomId: string;
}

// Mock para simular los eventos de socket en modo desarrollo
const createMockChatSocket = (user: any, roomId: string) => {
  // Crear un objeto que simule un socket
  const mockSocket: any = {
    emit: (event: string, data: any, callback?: (error?: string, data?: any) => void) => {
      console.log(`[MOCK CHAT] Emitido evento ${event}:`, data);
      
      // Simular comportamiento para room:join
      if (event === 'room:join') {
        setTimeout(() => {
          if (callback) callback();
        }, 300);
      }
      
      // Simular comportamiento para chat:send
      if (event === 'chat:send') {
        setTimeout(() => {
          // Emitir evento de mensaje recibido
          const chatMessageHandlers = mockSocket.handlers['chat:message'] || [];
          chatMessageHandlers.forEach((handler: any) => {
            handler({
              senderId: user.userId,
              senderName: user.username,
              text: data.text,
              timestamp: Date.now()
            });
          });
          
          if (callback) callback();
        }, 300);
      }
    },
    on: (event: string, handler: any) => {
      if (!mockSocket.handlers[event]) {
        mockSocket.handlers[event] = [];
      }
      mockSocket.handlers[event].push(handler);
      return mockSocket;
    },
    off: (event: string) => {
      delete mockSocket.handlers[event];
      return mockSocket;
    },
    disconnect: () => {
      console.log('[MOCK CHAT] Desconectado');
      mockSocket.handlers = {};
    },
    // Almacenar handlers para simular eventos
    handlers: {} as Record<string, any[]>
  };
  
  // Simular mensaje de bienvenida
  setTimeout(() => {
    const chatMessageHandlers = mockSocket.handlers['chat:message'] || [];
    chatMessageHandlers.forEach((handler: any) => {
      handler({
        senderId: 'system',
        senderName: 'Sistema',
        text: '¡Bienvenido a la sala de chat!',
        timestamp: Date.now()
      });
    });
    
    // Simular otro mensaje después de 2 segundos
    setTimeout(() => {
      const chatMessageHandlers = mockSocket.handlers['chat:message'] || [];
      chatMessageHandlers.forEach((handler: any) => {
        handler({
          senderId: 'mock-player1',
          senderName: 'Jugador 1',
          text: '¡Hola a todos! ¿Listos para jugar?',
          timestamp: Date.now()
        });
      });
    }, 2000);
    
    // Simular un mensaje del sistema después de 4 segundos
    setTimeout(() => {
      const chatMessageHandlers = mockSocket.handlers['chat:message'] || [];
      chatMessageHandlers.forEach((handler: any) => {
        handler({
          senderId: 'system',
          senderName: 'Sistema',
          text: 'El anfitrión puede comenzar el juego cuando todos estén listos.',
          timestamp: Date.now()
        });
      });
    }, 4000);
  }, 1000);
  
  return mockSocket;
};

export default function ChatBox({ roomId }: ChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Conectar al socket cuando el componente se monta
  useEffect(() => {
    if (!user) return;
    
    let socketInstance: Socket | any;
    
    // Intenta conectar a un socket real o usar el mock simulado si está en desarrollo
    try {
      // Intentar conectar con un socket real
      if (process.env.NEXT_PUBLIC_SOCKET_URL) {
        socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
          auth: {
            userId: user.userId,
            username: user.username
          }
        });
      } else {
        throw new Error('No socket URL available');
      }
    } catch (error) {
      console.log('[MOCK] Usando socket simulado para el chat');
      socketInstance = createMockChatSocket(user, roomId);
    }
    
    setSocket(socketInstance);
    
    // Unirse a la sala
    socketInstance.emit('room:join', {
      roomId,
      userId: user.userId,
      accessCode: '' // No necesario si ya estamos en la sala
    }, (error?: string) => {
      if (error) {
        console.error('Error al unirse al chat:', error);
      }
    });
    
    // Escuchar mensajes entrantes
    socketInstance.on('chat:message', (data: any) => {
      const isSystem = data.senderId === 'system';
      
      setMessages(prev => [...prev, {
        ...data,
        isSystem
      }]);
    });
    
    // Limpiar al desmontar
    return () => {
      socketInstance.off('chat:message');
      socketInstance.disconnect();
    };
  }, [user, roomId]);
  
  // Hacer scroll automático cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Enviar un mensaje nuevo
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !user) return;
    
    socket.emit('chat:send', {
      roomId,
      userId: user.userId,
      text: newMessage.trim()
    }, (error?: string) => {
      if (error) {
        console.error('Error al enviar mensaje:', error);
      } else {
        setNewMessage('');
      }
    });
  };
  
  // Formatear timestamp a hora local
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="flex flex-col h-64 sm:h-80 bg-white rounded-lg border border-gray-200 shadow">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold">Chat de la sala</h3>
      </div>
      
      {/* Mensajes */}
      <div className="flex-1 p-3 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center text-sm">Sin mensajes aún</p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.isSystem ? 'justify-center' : msg.senderId === user?.userId ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    msg.isSystem 
                      ? 'bg-gray-100 text-gray-600 italic text-xs' 
                      : msg.senderId === user?.userId 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {!msg.isSystem && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-xs">
                        {msg.senderId === user?.userId ? 'Tú' : msg.senderName}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Formulario de envío */}
      <form onSubmit={handleSendMessage} className="p-2 border-t border-gray-200 flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-blue-500 text-white px-4 rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300"
        >
          Enviar
        </button>
      </form>
    </div>
  );
} 