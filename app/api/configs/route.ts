import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simulamos las categorías y presets disponibles
    // En un escenario real, deberías obtener estos datos de tu backend
    
    const mockData = {
      categories: [
        'general', 
        'ciencia', 
        'deportes', 
        'entretenimiento', 
        'historia',
        'arte',
        'geografía',
        'tecnología',
        'música',
        'literatura'
      ],
      presets: [
        'quick',
        'standard',
        'extended',
        'competitive',
        'teams',
        'casual',
        'party'
      ]
    };
    
    return NextResponse.json(mockData);
  } catch (error) {
    console.error('Error in /api/configs:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 