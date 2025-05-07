'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GameRoomList from '../components/gameRoom/GameRoomList';
import JoinPrivateRoomForm from '../components/gameRoom/JoinPrivateRoomForm';
import CreateRoomButton from '../components/gameRoom/CreateRoomButton';
import { useAuth } from '../auth/AuthContext'; // Suponiendo que hay un contexto de autenticación

export default function GameRoomsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth(); // Suponiendo que hay un contexto de autenticación

  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');

  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen">Redirigiendo al login...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Salas de Juego</h1>
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'public' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setActiveTab('public')}
          >
            Salas Públicas
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'private' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setActiveTab('private')}
          >
            Salas Privadas
          </button>
        </div>
        
        <CreateRoomButton />
      </div>
      
      {activeTab === 'public' ? (
        <GameRoomList type="public" />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Mis Salas Privadas</h2>
            <GameRoomList type="private" onlyMine={true} />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Unirse a Sala Privada</h2>
            <JoinPrivateRoomForm />
          </div>
        </div>
      )}
    </div>
  );
} 