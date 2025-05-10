import { NextRequest, NextResponse } from 'next/server';

// URL base del backend (usada como respaldo si no existe la variable de entorno)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Not authorized, no token' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    const body = await req.json();
    
    try {
      // Hacer una petición al backend para crear la sala
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return NextResponse.json(
          { message: data.message || 'Error creating room' },
          { status: response.status }
        );
      }
      
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('Error fetching to create room:', fetchError);
      
      // Para entorno de desarrollo, simular la respuesta
      if (process.env.NODE_ENV === 'development') {
        console.log('Devolviendo respuesta simulada de creación de sala');
        return NextResponse.json({
          message: 'Sala creada exitosamente',
          room: {
            _id: 'room_' + Date.now(),
            name: body.name,
            type: body.type,
            configuration: body.configuration,
            hostId: '12345',
            players: ['12345'],
            status: 'waiting',
            createdAt: new Date().toISOString(),
          }
        });
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error in /api/rooms:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Las salas públicas no necesitan autenticación para verlas
    // Pero si hay un token lo pasamos para posibles filtros personalizados
    const authHeader = req.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      headers['Authorization'] = authHeader;
    }
    
    // Extraer parámetros de consulta
    const url = new URL(req.url);
    const queryParams = url.searchParams.toString();
    
    try {
      // Hacer una petición al backend para listar las salas
      const response = await fetch(`${API_BASE_URL}/rooms?${queryParams}`, {
        method: 'GET',
        headers
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return NextResponse.json(
          { message: data.message || 'Error fetching rooms' },
          { status: response.status }
        );
      }
      
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('Error fetching rooms:', fetchError);
      
      // Para entorno de desarrollo, simular la respuesta
      if (process.env.NODE_ENV === 'development') {
        console.log('Devolviendo respuesta simulada de listado de salas');
        return NextResponse.json({
          rooms: [
            {
              _id: 'room_1',
              name: 'Sala Simulada 1',
              type: 'public',
              hostId: '12345',
              players: ['12345'],
              status: 'waiting',
              createdAt: new Date().toISOString(),
            },
            {
              _id: 'room_2',
              name: 'Sala Simulada 2',
              type: 'public',
              hostId: '67890',
              players: ['67890'],
              status: 'waiting',
              createdAt: new Date().toISOString(),
            }
          ]
        });
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error in /api/rooms GET:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 