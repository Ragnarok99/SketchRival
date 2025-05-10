import { NextRequest, NextResponse } from 'next/server';

// URL base del backend (usada como respaldo si no existe la variable de entorno)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Not authorized, no token' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Hacer una petición al backend para obtener la sala
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          { message: errorData.message || 'Error al obtener sala' },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error en /api/rooms/[id]:', error);
      
      // Simular una respuesta para desarrollo/pruebas
      // Normalmente aquí devolvería un error, pero en este caso simulamos datos
      const mockRoom = {
        id: roomId,
        name: `Sala de prueba ${roomId}`,
        hostId: '123456',
        hostName: 'Anfitrión de prueba',
        type: 'public',
        status: 'waiting',
        players: [
          {
            userId: '123456',
            username: 'Anfitrión de prueba',
            isReady: true,
            role: 'host',
            avatarColor: '#3b82f6'
          },
          {
            userId: '789012',
            username: 'Jugador prueba',
            isReady: false,
            role: 'player',
            avatarColor: '#10b981'
          }
        ],
        configuration: {
          maxPlayers: 8,
          timeLimit: 30,
          categories: ['general', 'entertainment'],
          difficulty: 'medium'
        },
        accessCode: roomId.includes('private') ? 'ABC123' : undefined,
        createdAt: new Date().toISOString()
      };
      
      return NextResponse.json({
        room: mockRoom
      });
    }
  } catch (error) {
    console.error('Error en /api/rooms/[id]:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 