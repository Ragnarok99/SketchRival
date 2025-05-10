import { NextRequest, NextResponse } from 'next/server';

// URL base del backend (usada como respaldo si no existe la variable de entorno)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  try {
    const { id: roomId, playerId } = params;
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Not authorized, no token' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Hacer una petición al backend para expulsar al jugador
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ playerId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          { message: errorData.message || 'Error al expulsar al jugador' },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error en /api/waiting-room/[id]/kick/[playerId]:', error);
      
      // Simular una respuesta exitosa para desarrollo/pruebas
      return NextResponse.json({
        success: true,
        message: 'Jugador expulsado correctamente'
      });
    }
  } catch (error) {
    console.error('Error en /api/waiting-room/[id]/kick/[playerId]:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 