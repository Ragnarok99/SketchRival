import { NextRequest, NextResponse } from 'next/server';

const presets = {
  quick: {
    maxPlayers: 4,
    timeLimit: 20,
    categories: ['general'],
    difficulty: 'easy',
    gameMode: 'casual',
    scoringSystem: 'standard',
    visualTheme: 'default',
    roundsCount: 2,
    allowSpectators: true,
    useAdaptiveTime: false,
    enableVotingSystem: false,
    wordChoiceCount: 2
  },
  standard: {
    maxPlayers: 6,
    timeLimit: 30,
    categories: ['general', 'entretenimiento'],
    difficulty: 'medium',
    gameMode: 'standard',
    scoringSystem: 'standard',
    visualTheme: 'default',
    roundsCount: 3,
    allowSpectators: true,
    useAdaptiveTime: false,
    enableVotingSystem: false,
    wordChoiceCount: 3
  },
  extended: {
    maxPlayers: 8,
    timeLimit: 45,
    categories: ['general', 'ciencia', 'deportes', 'entretenimiento', 'historia'],
    difficulty: 'medium',
    gameMode: 'standard',
    scoringSystem: 'progressive',
    visualTheme: 'default',
    roundsCount: 5,
    allowSpectators: true,
    useAdaptiveTime: true,
    enableVotingSystem: true,
    wordChoiceCount: 3
  },
  competitive: {
    maxPlayers: 6,
    timeLimit: 30,
    categories: ['general', 'ciencia', 'historia'],
    difficulty: 'hard',
    gameMode: 'competitive',
    scoringSystem: 'achievement',
    visualTheme: 'minimal',
    roundsCount: 5,
    allowSpectators: false,
    useAdaptiveTime: false,
    enableVotingSystem: false,
    wordChoiceCount: 1
  },
  teams: {
    maxPlayers: 8,
    timeLimit: 40,
    categories: ['general', 'deportes', 'entretenimiento'],
    difficulty: 'medium',
    gameMode: 'teams',
    scoringSystem: 'standard',
    visualTheme: 'colorful',
    roundsCount: 4,
    allowSpectators: true,
    useAdaptiveTime: true,
    enableVotingSystem: false,
    wordChoiceCount: 2
  },
  party: {
    maxPlayers: 12,
    timeLimit: 25,
    categories: ['entretenimiento', 'general'],
    difficulty: 'easy',
    gameMode: 'party',
    scoringSystem: 'custom',
    visualTheme: 'colorful',
    roundsCount: 7,
    allowSpectators: true,
    useAdaptiveTime: true,
    enableVotingSystem: true,
    wordChoiceCount: 4
  },
  casual: {
    maxPlayers: 6,
    timeLimit: 35,
    categories: ['general'],
    difficulty: 'easy',
    gameMode: 'casual',
    scoringSystem: 'standard',
    visualTheme: 'light',
    roundsCount: 3,
    allowSpectators: true,
    useAdaptiveTime: true,
    enableVotingSystem: true,
    wordChoiceCount: 3
  }
};

export async function GET(req: NextRequest, { params }: { params: { preset: string }}) {
  try {
    const { preset } = params;
    
    if (!preset || !presets[preset as keyof typeof presets]) {
      return NextResponse.json(
        { message: 'Preset not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      preset: presets[preset as keyof typeof presets]
    });
  } catch (error) {
    console.error(`Error in /api/configs/presets/${params.preset}:`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 