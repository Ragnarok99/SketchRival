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

export default function ChatBox({ roomId }: ChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Conectar al socket cuando el componente se monta
  useEffect(() => {
    if (!user) return;
    
    // Inicializar el socket
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        userId: user.userId,
        username: user.username
      }
    });
    
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
    socketInstance.on('chat:message', (data) => {
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