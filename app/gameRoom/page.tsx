'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GameRoomList from '../components/gameRoom/GameRoomList';
import RoomSearch from '../components/gameRoom/RoomSearch';
import JoinPrivateRoomForm from '../components/gameRoom/JoinPrivateRoomForm';
import CreateRoomButton from '../components/gameRoom/CreateRoomButton';
import { useAuth } from '../auth/AuthContext'; // Suponiendo que hay un contexto de autenticación

export default function GameRoomsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth(); // Suponiendo que hay un contexto de autenticación

  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'playing'>('waiting');

  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, router]);

  // Manejar la búsqueda
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  if (!isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen">Redirigiendo al login...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Salas de Juego</h1>
        <CreateRoomButton />
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
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
          
          <div className="flex space-x-3">
            <select
              className="px-3 py-2 border rounded-lg bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Todas</option>
              <option value="waiting">En espera</option>
              <option value="playing">En juego</option>
            </select>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <RoomSearch onSearch={handleSearch} />
          
          {activeTab === 'public' ? (
            <GameRoomList 
              type="public" 
              searchQuery={searchQuery}
              statusFilter={statusFilter}
            />
          ) : (
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Mis Salas Privadas</h2>
                <GameRoomList 
                  type="private" 
                  onlyMine={true} 
                  searchQuery={searchQuery}
                  statusFilter={statusFilter}
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-4">Unirse por Código</h2>
                <JoinPrivateRoomForm />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 