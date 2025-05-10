import { useAuth } from '../auth/AuthContext';

// Obtener el token para solicitudes fuera de componentes React
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

// Función para realizar peticiones autenticadas
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  
  const config = {
    ...options,
    headers
  };
  
  const response = await fetch(url, config);
  
  // Manejar respuesta 401 (no autorizado)
  if (response.status === 401) {
    // Opcionalmente redirigir a login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
  }
  
  return response;
};

// Hook para usar en componentes React
export const useApi = () => {
  const { getAuthToken } = useAuth();
  
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    const config = {
      ...options,
      headers
    };
    
    const response = await fetch(url, config);
    
    return response;
  };
  
  return { fetchWithAuth };
}; 