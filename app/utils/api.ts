import { useAuth } from '../auth/AuthContext';

// Tipos para respuestas API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

// Obtener el token para solicitudes fuera de componentes React
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

// Función para realizar peticiones autenticadas
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
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

// Métodos HTTP simplificados
export const get = async <T = any>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  try {
    const response = await fetchWithAuth(url, {
      ...options,
      method: 'GET'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
      return {
        success: false,
        message: errorData.message || `Error ${response.status}`,
        error: errorData
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
      message: data.message
    };
  } catch (error) {
    console.error('API error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      error
    };
  }
};

export const post = async <T = any>(url: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  try {
    const response = await fetchWithAuth(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
      return {
        success: false,
        message: errorData.message || `Error ${response.status}`,
        error: errorData
      };
    }
    
    const responseData = await response.json();
    return {
      success: true,
      data: responseData.data || responseData,
      message: responseData.message
    };
  } catch (error) {
    console.error('API error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      error
    };
  }
};

export const put = async <T = any>(url: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  try {
    const response = await fetchWithAuth(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
      return {
        success: false,
        message: errorData.message || `Error ${response.status}`,
        error: errorData
      };
    }
    
    const responseData = await response.json();
    return {
      success: true,
      data: responseData.data || responseData,
      message: responseData.message
    };
  } catch (error) {
    console.error('API error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      error
    };
  }
};

export const del = async <T = any>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  try {
    const response = await fetchWithAuth(url, {
      ...options,
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
      return {
        success: false,
        message: errorData.message || `Error ${response.status}`,
        error: errorData
      };
    }
    
    const responseData = await response.json();
    return {
      success: true,
      data: responseData.data || responseData,
      message: responseData.message
    };
  } catch (error) {
    console.error('API error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      error
    };
  }
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
    
    return fetch(url, config);
  };
  
  const api = {
    get: async <T = any>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
      try {
        const response = await fetchWithAuth(url, {
          ...options,
          method: 'GET'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
          return {
            success: false,
            message: errorData.message || `Error ${response.status}`,
            error: errorData
          };
        }
        
        const data = await response.json();
        return {
          success: true,
          data: data.data || data,
          message: data.message
        };
      } catch (error) {
        console.error('API error:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Error desconocido',
          error
        };
      }
    },
    
    post: async <T = any>(url: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> => {
      try {
        const response = await fetchWithAuth(url, {
          ...options,
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
          return {
            success: false,
            message: errorData.message || `Error ${response.status}`,
            error: errorData
          };
        }
        
        const responseData = await response.json();
        return {
          success: true,
          data: responseData.data || responseData,
          message: responseData.message
        };
      } catch (error) {
        console.error('API error:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Error desconocido',
          error
        };
      }
    },
    
    put: async <T = any>(url: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> => {
      try {
        const response = await fetchWithAuth(url, {
          ...options,
          method: 'PUT',
          body: data ? JSON.stringify(data) : undefined
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
          return {
            success: false,
            message: errorData.message || `Error ${response.status}`,
            error: errorData
          };
        }
        
        const responseData = await response.json();
        return {
          success: true,
          data: responseData.data || responseData,
          message: responseData.message
        };
      } catch (error) {
        console.error('API error:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Error desconocido',
          error
        };
      }
    },
    
    delete: async <T = any>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
      try {
        const response = await fetchWithAuth(url, {
          ...options,
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
          return {
            success: false,
            message: errorData.message || `Error ${response.status}`,
            error: errorData
          };
        }
        
        const responseData = await response.json();
        return {
          success: true,
          data: responseData.data || responseData,
          message: responseData.message
        };
      } catch (error) {
        console.error('API error:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Error desconocido',
          error
        };
      }
    }
  };
  
  return api;
}; 