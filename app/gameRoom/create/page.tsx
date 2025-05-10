'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../utils/api';

// Definir tipos
type RoomType = 'public' | 'private';
type GameDifficulty = 'easy' | 'medium' | 'hard';
type GameMode = 'casual' | 'standard' | 'competitive' | 'teams' | 'party';
type ScoringSystem = 'standard' | 'progressive' | 'achievement' | 'custom';
type VisualTheme = 'default' | 'dark' | 'light' | 'colorful' | 'minimal';

interface RoomConfig {
  maxPlayers: number;
  timeLimit?: number;
  categories: string[];
  difficulty: GameDifficulty;
  gameMode: GameMode;
  scoringSystem: ScoringSystem;
  visualTheme: VisualTheme;
  roundsCount: number;
  allowSpectators: boolean;
  useAdaptiveTime: boolean;
  enableVotingSystem: boolean;
  wordChoiceCount: number;
}

interface FormData {
  name: string;
  type: RoomType;
  config: RoomConfig;
  accessCode?: string;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { fetchWithAuth } = useApi();
  
  // Estado inicial del formulario
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'public',
    config: {
      maxPlayers: 4,
      timeLimit: 30,
      categories: [],
      difficulty: 'medium',
      gameMode: 'standard',
      scoringSystem: 'standard',
      visualTheme: 'default',
      roundsCount: 3,
      allowSpectators: true,
      useAdaptiveTime: false,
      enableVotingSystem: false,
      wordChoiceCount: 3
    }
  });
  
  // Estado de carga y errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePresets, setAvailablePresets] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  
  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, router]);
  
  // Cargar categorías y presets disponibles
  useEffect(() => {
    const fetchConfigurations = async () => {
      try {
        // Verificar si fetchWithAuth está disponible
        if (!fetchWithAuth) {
          console.error('Error: fetchWithAuth no está disponible');
          setAvailableCategories(['general', 'ciencia', 'deportes', 'entretenimiento', 'historia']);
          setAvailablePresets(['quick', 'standard', 'extended', 'competitive', 'teams', 'casual']);
          return;
        }

        const response = await fetchWithAuth('/api/configs');
        if (!response.ok) {
          throw new Error('Error al cargar configuraciones');
        }
        
        const data = await response.json();
        if (data.categories) {
          setAvailableCategories(data.categories);
        }
        if (data.presets) {
          setAvailablePresets(data.presets);
        }
      } catch (err) {
        console.error('Error al cargar configuraciones:', err);
        // Datos de respaldo en caso de error
        setAvailableCategories(['general', 'ciencia', 'deportes', 'entretenimiento', 'historia']);
        setAvailablePresets(['quick', 'standard', 'extended', 'competitive', 'teams', 'casual']);
      }
    };
    
    fetchConfigurations();
  }, [fetchWithAuth]);
  
  // Manejar cambios en los campos del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    if (name.startsWith('config.')) {
      const configField = name.split('.')[1];
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          [configField]: type === 'checkbox' ? checked : value,
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // Si cambia el tipo a privado y no hay código, generar uno
    if (name === 'type' && value === 'private' && !formData.accessCode) {
      handleGenerateAccessCode();
    }
    
    // Limpiar mensajes de error
    if (error) setError(null);
  };
  
  // Manejar cambios en las categorías seleccionadas
  const handleCategoryChange = (category: string) => {
    const currentCategories = [...formData.config.categories];
    
    if (currentCategories.includes(category)) {
      // Quitar categoría
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          categories: currentCategories.filter(cat => cat !== category),
        }
      });
    } else {
      // Añadir categoría
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          categories: [...currentCategories, category],
        }
      });
    }
  };

  // Cargar un preset de configuración
  const loadPreset = async (presetName: string) => {
    try {
      setLoading(true);
      
      // Verificar si fetchWithAuth está disponible
      if (!fetchWithAuth) {
        console.error('Error: fetchWithAuth no está disponible');
        setLoading(false);
        setError('No se pudo cargar el servicio de API');
        return;
      }
      
      const response = await fetchWithAuth(`/api/configs/presets/${presetName}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar el preset');
      }
      
      const data = await response.json();
      
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          ...data.preset
        }
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar preset:', err);
      setError('No se pudo cargar la configuración preestablecida');
      setLoading(false);
    }
  };

  // Generar código de acceso
  const handleGenerateAccessCode = async () => {
    if (formData.type !== 'private') return;
    
    try {
      setIsGeneratingCode(true);
      
      // Verificar si fetchWithAuth está disponible
      if (!fetchWithAuth) {
        console.error('Error: fetchWithAuth no está disponible');
        setIsGeneratingCode(false);
        setError('No se pudo cargar el servicio de API');
        return;
      }
      
      const response = await fetchWithAuth('/api/rooms/generate-code');
      
      if (!response.ok) {
        throw new Error('Error al generar código de acceso');
      }
      
      const data = await response.json();
      
      setFormData({
        ...formData,
        accessCode: data.accessCode
      });
      
      setIsGeneratingCode(false);
    } catch (err) {
      console.error('Error al generar código:', err);
      setError('No se pudo generar un código de acceso');
      setIsGeneratingCode(false);
    }
  };
  
  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('El nombre de la sala es obligatorio');
      return;
    }

    // Validar que una sala privada tenga código de acceso
    if (formData.type === 'private' && !formData.accessCode) {
      setError('Las salas privadas requieren un código de acceso');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Verificar si fetchWithAuth está disponible
      if (!fetchWithAuth) {
        console.error('Error: fetchWithAuth no está disponible');
        setLoading(false);
        setError('No se pudo cargar el servicio de API');
        return;
      }
      
      const response = await fetchWithAuth('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          accessCode: formData.type === 'private' ? formData.accessCode : undefined,
          configuration: {
            maxPlayers: parseInt(formData.config.maxPlayers.toString()),
            timeLimit: formData.config.timeLimit ? parseInt(formData.config.timeLimit.toString()) : undefined,
            categories: formData.config.categories,
            difficulty: formData.config.difficulty,
            gameMode: formData.config.gameMode,
            scoringSystem: formData.config.scoringSystem,
            visualTheme: formData.config.visualTheme,
            roundsCount: parseInt(formData.config.roundsCount.toString()),
            allowSpectators: formData.config.allowSpectators,
            useAdaptiveTime: formData.config.useAdaptiveTime,
            enableVotingSystem: formData.config.enableVotingSystem,
            wordChoiceCount: parseInt(formData.config.wordChoiceCount.toString())
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la sala');
      }
      
      const data = await response.json();
      
      // Redirigir a la sala creada
      router.push(`/gameRoom/${data.room._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la sala');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen">Redirigiendo al login...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center">
          <button 
            onClick={() => router.push('/gameRoom')}
            className="text-blue-600 hover:text-blue-800 mr-4"
          >
            &larr; Volver
          </button>
          <h1 className="text-3xl font-bold">Crear Nueva Sala</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Sala *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingresa un nombre para tu sala"
              maxLength={50}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Sala
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="public"
                  checked={formData.type === 'public'}
                  onChange={handleChange}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2">Pública</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="private"
                  checked={formData.type === 'private'}
                  onChange={handleChange}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2">Privada (con código de acceso)</span>
              </label>
            </div>
          </div>
          
          {formData.type === 'private' && (
            <div className="mb-6">
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1">
                Código de Acceso
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="accessCode"
                  name="accessCode"
                  value={formData.accessCode || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Código de 6 caracteres"
                  maxLength={6}
                  disabled={isGeneratingCode}
                />
                <button
                  type="button"
                  onClick={handleGenerateAccessCode}
                  className="px-4 py-2 bg-gray-200 rounded-r-lg hover:bg-gray-300 focus:outline-none"
                  disabled={isGeneratingCode}
                >
                  {isGeneratingCode ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-gray-800 rounded-full"></span>
                    </span>
                  ) : 'Generar'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Los jugadores necesitarán este código para unirse a tu sala privada.
              </p>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Configuración de la Sala</h3>
            
            {availablePresets.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => loadPreset(preset)}
                      className="px-3 py-1 bg-gray-200 rounded-full text-sm hover:bg-gray-300 focus:outline-none"
                    >
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="config.maxPlayers" className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo de Jugadores
                </label>
                <select
                  id="config.maxPlayers"
                  name="config.maxPlayers"
                  value={formData.config.maxPlayers}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                    <option key={num} value={num}>{num} jugadores</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="config.difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Dificultad
                </label>
                <select
                  id="config.difficulty"
                  name="config.difficulty"
                  value={formData.config.difficulty}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="easy">Fácil</option>
                  <option value="medium">Media</option>
                  <option value="hard">Difícil</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="config.timeLimit" className="block text-sm font-medium text-gray-700 mb-1">
                  Tiempo por Ronda (segundos)
                </label>
                <input
                  type="number"
                  id="config.timeLimit"
                  name="config.timeLimit"
                  value={formData.config.timeLimit}
                  onChange={handleChange}
                  min="10"
                  max="300"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label htmlFor="config.roundsCount" className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Rondas
                </label>
                <input
                  type="number"
                  id="config.roundsCount"
                  name="config.roundsCount"
                  value={formData.config.roundsCount}
                  onChange={handleChange}
                  min="1"
                  max="20"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label htmlFor="config.gameMode" className="block text-sm font-medium text-gray-700 mb-1">
                  Modo de Juego
                </label>
                <select
                  id="config.gameMode"
                  name="config.gameMode"
                  value={formData.config.gameMode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="casual">Casual</option>
                  <option value="standard">Estándar</option>
                  <option value="competitive">Competitivo</option>
                  <option value="teams">Equipos</option>
                  <option value="party">Fiesta</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="config.scoringSystem" className="block text-sm font-medium text-gray-700 mb-1">
                  Sistema de Puntuación
                </label>
                <select
                  id="config.scoringSystem"
                  name="config.scoringSystem"
                  value={formData.config.scoringSystem}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="standard">Estándar</option>
                  <option value="progressive">Progresivo</option>
                  <option value="achievement">Por Logros</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categorías
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryChange(category)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      formData.config.categories.includes(category)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {formData.config.categories.length === 0 && (
                <p className="mt-1 text-xs text-red-500">
                  Selecciona al menos una categoría
                </p>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              {showAdvancedOptions ? '▼' : '▶'} Opciones avanzadas
            </button>
            
            {showAdvancedOptions && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label htmlFor="config.visualTheme" className="block text-sm font-medium text-gray-700 mb-1">
                      Tema Visual
                    </label>
                    <select
                      id="config.visualTheme"
                      name="config.visualTheme"
                      value={formData.config.visualTheme}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="default">Predeterminado</option>
                      <option value="dark">Oscuro</option>
                      <option value="light">Claro</option>
                      <option value="colorful">Colorido</option>
                      <option value="minimal">Minimalista</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="config.wordChoiceCount" className="block text-sm font-medium text-gray-700 mb-1">
                      Opciones de Palabras
                    </label>
                    <select
                      id="config.wordChoiceCount"
                      name="config.wordChoiceCount"
                      value={formData.config.wordChoiceCount}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="1">1 palabra (sin elección)</option>
                      <option value="2">2 palabras</option>
                      <option value="3">3 palabras</option>
                      <option value="4">4 palabras</option>
                      <option value="5">5 palabras</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="config.allowSpectators"
                      checked={formData.config.allowSpectators}
                      onChange={handleChange}
                      className="form-checkbox rounded text-blue-600"
                    />
                    <span className="ml-2 text-sm">Permitir espectadores</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="config.useAdaptiveTime"
                      checked={formData.config.useAdaptiveTime}
                      onChange={handleChange}
                      className="form-checkbox rounded text-blue-600"
                    />
                    <span className="ml-2 text-sm">Usar tiempo adaptativo según número de jugadores</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="config.enableVotingSystem"
                      checked={formData.config.enableVotingSystem}
                      onChange={handleChange}
                      className="form-checkbox rounded text-blue-600"
                    />
                    <span className="ml-2 text-sm">Habilitar sistema de votación</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || formData.config.categories.length === 0}
              className={`px-6 py-2 rounded-lg ${
                loading || formData.config.categories.length === 0
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                  Creando...
                </span>
              ) : (
                'Crear Sala'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 