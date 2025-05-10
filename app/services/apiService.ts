const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Definición de tipos esperados de la API del leaderboard
export interface ApiLeaderboardEntry {
  _id: string; // Generalmente MongoDB IDs son strings
  userId: string; // O el tipo ObjectId de Mongoose si se expone así
  username: string;
  score: number;
  level?: number;
  rank?: number; 
  // No incluimos avatarColor aquí, ya que es más de la UI y podría asignarse en el frontend
}

export interface LeaderboardResponse {
  entries: ApiLeaderboardEntry[];
  totalEntries: number;
  currentPage: number;
  totalPages: number;
}

export interface PlayerRankResponse {
  rank: number | null;
  score: number | null;
  entry: ApiLeaderboardEntry | null;
}

// Tipos para Temporadas
export interface ApiSeasonReward {
  rankMin: number;
  rankMax: number;
  description: string;
}

export interface ApiSeason {
  _id: string;
  name: string;
  description?: string;
  startDate: string; // Las fechas vendrán como string ISO
  endDate: string;
  isActive: boolean;
  leaderboardCategoryKey: string;
  rewards?: ApiSeasonReward[];
  createdAt: string;
  updatedAt: string;
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // TODO: Añadir token de autorización si es necesario para la ruta
        // ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Error ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`API fetch error for endpoint ${endpoint}:`, error);
    throw error; // Re-lanzar para que el llamador lo maneje
  }
}

// Funciones específicas del API

export const getLeaderboard = async (category = 'global', page = 1, limit = 20): Promise<LeaderboardResponse> => {
  return fetchApi(`/leaderboard?category=${category}&page=${page}&limit=${limit}`);
};

export const getMyPlayerRank = async (category = 'global', authToken: string): Promise<PlayerRankResponse> => {
  // Asumiendo que esta ruta requiere autenticación
  return fetchApi(`/leaderboard/my-rank?category=${category}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
};

export const getPlayerRankById = async (userId: string, category = 'global'): Promise<PlayerRankResponse> => {
  return fetchApi(`/leaderboard/rank/${userId}?category=${category}`);
};

// --- Season API Functions ---
export const getActiveSeasons = async (): Promise<ApiSeason[]> => {
  // Asumimos que la respuesta directa es un array de temporadas
  const response = await fetchApi('/seasons/active');
  return response.data; // Suponiendo que la API envuelve los datos en una propiedad 'data'
};

export const getSeasonLeaderboard = async (leaderboardCategoryKey: string, page = 1, limit = 20): Promise<LeaderboardResponse> => {
  return getLeaderboard(leaderboardCategoryKey, page, limit); // Reutiliza la función getLeaderboard
};

// Aquí se podrían añadir más funciones de API para temporadas, etc. 