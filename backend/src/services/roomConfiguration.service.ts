import { GameRoomModel, GameRoomConfig } from '../models';
import { GameMode, ScoringSystem, VisualTheme } from '../models/GameRoom.model';

// Versión actual del esquema de configuración
export const CURRENT_CONFIG_VERSION = '2.0';

// Configuraciones preestablecidas
export enum ConfigPreset {
  QUICK = 'quick', // Partida rápida
  STANDARD = 'standard', // Configuración estándar
  EXTENDED = 'extended', // Partida larga
  COMPETITIVE = 'competitive', // Modo competitivo
  TEAMS = 'teams', // Modo equipos
  CASUAL = 'casual', // Modo casual relajado
  EXPERT = 'expert', // Para jugadores experimentados
  PARTY = 'party', // Para muchos jugadores
  CUSTOM = 'custom', // Personalizado
}

// Interfaz para configuración extendida con versionado
export interface VersionedConfig extends GameRoomConfig {
  version?: string;
  preset?: ConfigPreset;
}

// Presets de configuración
const CONFIG_PRESETS: Record<ConfigPreset, Omit<VersionedConfig, 'preset'>> = {
  [ConfigPreset.QUICK]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 4,
    roundTime: 45,
    totalRounds: 2,
    drawingCategories: ['animales', 'objetos', 'comida'],
    allowCustomWords: false,
    difficulty: 'easy',
    gameMode: GameMode.CASUAL,
    adaptiveTime: false,
    scoreMultiplier: 1,
    scoringSystem: ScoringSystem.STANDARD,
    bonusRounds: false,
    teamMode: false,
    allowVoting: true,
    votingThreshold: 75,
    allowHints: true,
    hintsCount: 1,
    visualTheme: VisualTheme.DEFAULT,
    showTimer: true,
    allowSpectators: true,
    minPlayersToStart: 2,
    autoStart: true,
    hideWords: true,
    roundBuffer: 3,
  },
  [ConfigPreset.STANDARD]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 6,
    roundTime: 90,
    totalRounds: 4,
    drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países'],
    allowCustomWords: false,
    difficulty: 'medium',
    gameMode: GameMode.STANDARD,
    adaptiveTime: false,
    scoreMultiplier: 1,
    scoringSystem: ScoringSystem.STANDARD,
    bonusRounds: false,
    teamMode: false,
    allowVoting: true,
    votingThreshold: 60,
    allowHints: true,
    hintsCount: 1,
    visualTheme: VisualTheme.DEFAULT,
    showTimer: true,
    allowSpectators: true,
    minPlayersToStart: 2,
    autoStart: false,
    hideWords: true,
    roundBuffer: 5,
  },
  [ConfigPreset.EXTENDED]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 8,
    roundTime: 120,
    totalRounds: 6,
    drawingCategories: [
      'animales',
      'objetos',
      'comida',
      'deportes',
      'países',
      'profesiones',
      'películas',
      'personajes',
    ],
    allowCustomWords: true,
    difficulty: 'hard',
    gameMode: GameMode.STANDARD,
    adaptiveTime: true,
    timeFactor: 1.2,
    scoreMultiplier: 1.5,
    scoringSystem: ScoringSystem.PROGRESSIVE,
    bonusRounds: true,
    teamMode: false,
    allowVoting: true,
    votingThreshold: 65,
    allowHints: true,
    hintsCount: 2,
    visualTheme: VisualTheme.DEFAULT,
    showTimer: true,
    allowSpectators: true,
    minPlayersToStart: 3,
    autoStart: false,
    hideWords: true,
    roundBuffer: 8,
  },
  [ConfigPreset.COMPETITIVE]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 6,
    roundTime: 60,
    totalRounds: 5,
    drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países', 'profesiones'],
    allowCustomWords: false,
    difficulty: 'hard',
    gameMode: GameMode.COMPETITIVE,
    adaptiveTime: false,
    scoreMultiplier: 2,
    scoringSystem: ScoringSystem.TIMED,
    bonusRounds: true,
    teamMode: false,
    allowVoting: false,
    votingThreshold: 85,
    allowHints: false,
    hintsCount: 0,
    visualTheme: VisualTheme.MINIMAL,
    showTimer: true,
    allowSpectators: true,
    minPlayersToStart: 4,
    autoStart: false,
    hideWords: true,
    roundBuffer: 5,
  },
  [ConfigPreset.TEAMS]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 8,
    roundTime: 75,
    totalRounds: 6,
    drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países', 'profesiones'],
    allowCustomWords: false,
    difficulty: 'medium',
    gameMode: GameMode.TEAM,
    adaptiveTime: true,
    timeFactor: 1.2,
    scoreMultiplier: 1,
    scoringSystem: ScoringSystem.STANDARD,
    bonusRounds: false,
    teamMode: true,
    teamsCount: 2,
    allowVoting: true,
    votingThreshold: 60,
    allowHints: true,
    hintsCount: 1,
    visualTheme: VisualTheme.COLORFUL,
    showTimer: true,
    allowSpectators: true,
    minPlayersToStart: 4,
    autoStart: false,
    hideWords: true,
    roundBuffer: 5,
  },
  [ConfigPreset.CASUAL]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 10,
    roundTime: 120,
    totalRounds: 3,
    drawingCategories: ['animales', 'objetos', 'comida', 'deportes'],
    allowCustomWords: true,
    difficulty: 'easy',
    gameMode: GameMode.CASUAL,
    adaptiveTime: true,
    timeFactor: 1.5,
    scoreMultiplier: 1,
    scoringSystem: ScoringSystem.STANDARD,
    bonusRounds: false,
    teamMode: false,
    allowVoting: true,
    votingThreshold: 50,
    allowHints: true,
    hintsCount: 3,
    visualTheme: VisualTheme.COLORFUL,
    showTimer: false,
    allowSpectators: true,
    minPlayersToStart: 2,
    autoStart: true,
    hideWords: true,
    roundBuffer: 10,
  },
  [ConfigPreset.EXPERT]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 6,
    roundTime: 45,
    totalRounds: 8,
    drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países', 'profesiones', 'películas'],
    allowCustomWords: false,
    difficulty: 'hard',
    gameMode: GameMode.COMPETITIVE,
    adaptiveTime: false,
    scoreMultiplier: 3,
    scoringSystem: ScoringSystem.COMBO,
    bonusRounds: true,
    teamMode: false,
    allowVoting: false,
    votingThreshold: 90,
    allowHints: false,
    hintsCount: 0,
    visualTheme: VisualTheme.MINIMAL,
    showTimer: true,
    allowSpectators: true,
    minPlayersToStart: 3,
    autoStart: false,
    hideWords: true,
    roundBuffer: 3,
  },
  [ConfigPreset.PARTY]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 10,
    roundTime: 60,
    totalRounds: 10,
    drawingCategories: [
      'animales',
      'objetos',
      'comida',
      'deportes',
      'países',
      'profesiones',
      'películas',
      'personajes',
    ],
    allowCustomWords: true,
    difficulty: 'medium',
    gameMode: GameMode.STANDARD,
    adaptiveTime: true,
    timeFactor: 0.8,
    scoreMultiplier: 1,
    scoringSystem: ScoringSystem.PROGRESSIVE,
    bonusRounds: true,
    teamMode: false,
    allowVoting: true,
    votingThreshold: 60,
    allowHints: true,
    hintsCount: 1,
    visualTheme: VisualTheme.COLORFUL,
    showTimer: true,
    allowSpectators: true,
    minPlayersToStart: 5,
    autoStart: true,
    hideWords: true,
    roundBuffer: 5,
  },
  [ConfigPreset.CUSTOM]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 6,
    roundTime: 90,
    totalRounds: 3,
    drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países'],
    allowCustomWords: false,
    difficulty: 'medium',
    gameMode: GameMode.CUSTOM,
    adaptiveTime: false,
    scoreMultiplier: 1,
    scoringSystem: ScoringSystem.STANDARD,
    bonusRounds: false,
    teamMode: false,
    allowVoting: true,
    votingThreshold: 60,
    allowHints: true,
    hintsCount: 1,
    visualTheme: VisualTheme.DEFAULT,
    showTimer: true,
    allowSpectators: true,
    minPlayersToStart: 2,
    autoStart: false,
    hideWords: true,
    roundBuffer: 5,
  },
};

// Categorías de dibujo disponibles
export const AVAILABLE_CATEGORIES = [
  'animales',
  'objetos',
  'comida',
  'deportes',
  'países',
  'profesiones',
  'películas',
  'personajes',
  'lugares',
  'marcas',
  'vehículos',
  'instrumentos',
  'celebridades',
];

// Interfaz para opciones de configuración
export interface ConfigOptions {
  preset?: ConfigPreset;
  overrides?: Partial<GameRoomConfig>;
}

/**
 * Obtiene una configuración preestablecida
 */
export function getConfigPreset(preset: ConfigPreset): VersionedConfig {
  const config = CONFIG_PRESETS[preset] || CONFIG_PRESETS[ConfigPreset.STANDARD];
  return { ...config, preset };
}

/**
 * Crea una configuración de sala basada en un preset y overrides opcionales
 */
export function createRoomConfig(options: ConfigOptions = {}): VersionedConfig {
  const { preset = ConfigPreset.STANDARD, overrides = {} } = options;

  // Obtener la configuración base del preset
  const baseConfig = getConfigPreset(preset);

  // Aplicar overrides
  const config: VersionedConfig = {
    ...baseConfig,
    ...overrides,
    // Asegurar que sigue siendo el preset seleccionado o marcar como custom si hay overrides
    preset: Object.keys(overrides).length > 0 ? ConfigPreset.CUSTOM : preset,
    // Asegurar que la versión se mantiene
    version: CURRENT_CONFIG_VERSION,
  };

  // Validar la configuración final
  validateConfig(config);

  return config;
}

/**
 * Sugiere una configuración basada en el número de jugadores y tipo de juego
 */
export function suggestConfiguration(
  playerCount: number,
  gameType: 'casual' | 'competitive' | 'teams' = 'casual',
): VersionedConfig {
  // Base del preset según tipo de juego
  let basePreset: ConfigPreset;

  if (gameType === 'competitive') {
    basePreset = ConfigPreset.COMPETITIVE;
  } else if (gameType === 'teams') {
    basePreset = ConfigPreset.TEAMS;
  } else {
    basePreset = ConfigPreset.CASUAL;
  }

  // Obtener configuración base
  const baseConfig = getConfigPreset(basePreset);

  // Ajustar según número de jugadores
  const overrides: Partial<GameRoomConfig> = {
    maxPlayers: Math.max(playerCount, 2),
    minPlayersToStart: Math.max(Math.ceil(playerCount * 0.7), 2),
  };

  // Ajustes según tamaño del grupo
  if (playerCount > 6) {
    // Para grupos grandes
    overrides.roundTime = gameType === 'competitive' ? 60 : 90;
    overrides.adaptiveTime = true;
    overrides.timeFactor = 0.8; // Menos tiempo por jugador en grupos grandes
  } else if (playerCount < 4) {
    // Para grupos pequeños
    overrides.roundTime = gameType === 'competitive' ? 75 : 100;
    overrides.totalRounds = gameType === 'competitive' ? 6 : 4;
  }

  // Ajustes específicos para equipos
  if (gameType === 'teams') {
    overrides.teamMode = true;
    overrides.teamsCount = playerCount >= 6 ? 3 : 2;
  }

  // Crear configuración con los ajustes
  return createRoomConfig({
    preset: basePreset,
    overrides,
  });
}

/**
 * Valida una configuración completa y arroja error si no es válida
 */
export function validateConfig(config: Partial<GameRoomConfig>): void {
  const errors: string[] = [];

  // Validar número de jugadores
  if (config.maxPlayers !== undefined) {
    if (config.maxPlayers < 2) {
      errors.push('El número mínimo de jugadores debe ser 2');
    } else if (config.maxPlayers > 10) {
      errors.push('El número máximo de jugadores debe ser 10');
    }
  }

  // Validar tiempo por ronda
  if (config.roundTime !== undefined) {
    if (config.roundTime < 30) {
      errors.push('El tiempo mínimo por ronda debe ser 30 segundos');
    } else if (config.roundTime > 300) {
      errors.push('El tiempo máximo por ronda debe ser 300 segundos (5 minutos)');
    }
  }

  // Validar número de rondas
  if (config.totalRounds !== undefined) {
    if (config.totalRounds < 1) {
      errors.push('El juego debe tener al menos 1 ronda');
    } else if (config.totalRounds > 20) {
      errors.push('El juego no puede tener más de 20 rondas');
    }
  }

  // Validar categorías de dibujo
  if (config.drawingCategories !== undefined) {
    if (!Array.isArray(config.drawingCategories) || config.drawingCategories.length === 0) {
      errors.push('Debe seleccionar al menos una categoría de dibujo');
    } else {
      // Verificar que todas las categorías son válidas
      const invalidCategories = config.drawingCategories.filter((cat) => !AVAILABLE_CATEGORIES.includes(cat));

      if (invalidCategories.length > 0) {
        errors.push(`Las siguientes categorías no son válidas: ${invalidCategories.join(', ')}`);
      }
    }
  }

  // Validar palabras personalizadas
  if (config.allowCustomWords === true && config.customWords !== undefined) {
    if (!Array.isArray(config.customWords) || config.customWords.length === 0) {
      errors.push('Debe proporcionar al menos una palabra personalizada cuando allowCustomWords es true');
    }
  }

  // Validar dificultad
  if (config.difficulty !== undefined && !['easy', 'medium', 'hard'].includes(config.difficulty)) {
    errors.push('La dificultad debe ser easy, medium o hard');
  }

  // Validar modo de juego
  if (config.gameMode !== undefined && !Object.values(GameMode).includes(config.gameMode)) {
    errors.push('Modo de juego no válido');
  }

  // Validar sistema de puntuación
  if (config.scoringSystem !== undefined && !Object.values(ScoringSystem).includes(config.scoringSystem)) {
    errors.push('Sistema de puntuación no válido');
  }

  // Validar tema visual
  if (config.visualTheme !== undefined && !Object.values(VisualTheme).includes(config.visualTheme)) {
    errors.push('Tema visual no válido');
  }

  // Validar multiplicador de puntuación
  if (config.scoreMultiplier !== undefined) {
    if (config.scoreMultiplier < 1) {
      errors.push('El multiplicador de puntuación mínimo es 1');
    } else if (config.scoreMultiplier > 5) {
      errors.push('El multiplicador de puntuación máximo es 5');
    }
  }

  // Validar factor de tiempo
  if (config.adaptiveTime === true && config.timeFactor !== undefined) {
    if (config.timeFactor < 0.5) {
      errors.push('El factor de tiempo mínimo es 0.5');
    } else if (config.timeFactor > 2) {
      errors.push('El factor de tiempo máximo es 2');
    }
  }

  // Validar mínimo de jugadores para iniciar
  if (config.minPlayersToStart !== undefined) {
    if (config.minPlayersToStart < 2) {
      errors.push('El mínimo de jugadores para iniciar debe ser al menos 2');
    } else if (config.maxPlayers !== undefined && config.minPlayersToStart > config.maxPlayers) {
      errors.push('El mínimo de jugadores para iniciar no puede ser mayor que el máximo de jugadores');
    }
  }

  // Validar umbral de votación
  if (config.votingThreshold !== undefined) {
    if (config.votingThreshold < 50) {
      errors.push('El umbral de votación debe ser al menos 50%');
    } else if (config.votingThreshold > 90) {
      errors.push('El umbral de votación no puede ser mayor que 90%');
    }
  }

  // Validar número de pistas
  if (config.hintsCount !== undefined) {
    if (config.hintsCount < 0) {
      errors.push('El número de pistas no puede ser negativo');
    } else if (config.hintsCount > 3) {
      errors.push('El número máximo de pistas es 3');
    }
  }

  // Validar buffer entre rondas
  if (config.roundBuffer !== undefined) {
    if (config.roundBuffer < 3) {
      errors.push('El tiempo entre rondas debe ser al menos 3 segundos');
    } else if (config.roundBuffer > 20) {
      errors.push('El tiempo entre rondas no puede ser mayor que 20 segundos');
    }
  }

  // Validaciones de modo por equipos
  if (config.teamMode === true) {
    if (config.teamsCount !== undefined) {
      if (config.teamsCount < 2) {
        errors.push('El número mínimo de equipos es 2');
      } else if (config.teamsCount > 4) {
        errors.push('El número máximo de equipos es 4');
      }
    }

    // Verificar si hay suficientes jugadores para el modo equipos
    if (config.maxPlayers !== undefined && config.maxPlayers < 4) {
      errors.push('El modo por equipos requiere al menos 4 jugadores máximos');
    }

    if (config.minPlayersToStart !== undefined && config.minPlayersToStart < 4) {
      errors.push('El modo por equipos requiere al menos 4 jugadores para iniciar');
    }
  }

  // Validar compatibilidad entre opciones
  if (config.difficulty === 'hard' && config.roundTime !== undefined && config.roundTime < 60) {
    errors.push('Para dificultad "hard", el tiempo mínimo por ronda debe ser 60 segundos');
  }

  // Validar que las pistas están desactivadas si no se permiten
  if (config.allowHints === false && config.hintsCount !== undefined && config.hintsCount > 0) {
    errors.push('El número de pistas debe ser 0 cuando allowHints es false');
  }

  // Si el modo es competitivo, validar configuraciones adecuadas
  if (config.gameMode === GameMode.COMPETITIVE) {
    if (config.difficulty === 'easy') {
      errors.push('En modo competitivo, la dificultad mínima debe ser "medium"');
    }

    if (config.scoreMultiplier !== undefined && config.scoreMultiplier < 1.5) {
      errors.push('En modo competitivo, el multiplicador de puntuación debe ser al menos 1.5');
    }
  }

  // Si hay errores, lanzar excepción
  if (errors.length > 0) {
    throw new Error(`Configuración inválida: ${errors.join('. ')}`);
  }
}

/**
 * Actualiza la configuración de una sala existente
 */
export async function updateRoomConfig(roomId: string, config: Partial<GameRoomConfig>): Promise<GameRoomConfig> {
  // Validar configuración parcial
  validateConfig(config);

  // Obtener la sala
  const room = await GameRoomModel.findById(roomId);
  if (!room) {
    throw new Error('Sala no encontrada');
  }

  // Solo se puede modificar la configuración si la sala está en espera
  if (room.status !== 'waiting') {
    throw new Error('No se puede modificar la configuración de una sala que ya ha comenzado');
  }

  // Convertir la configuración actual a un objeto simple
  const currentConfig = room.configuration as Partial<GameRoomConfig>;

  // Actualizar configuración
  const updatedRoom = await GameRoomModel.findByIdAndUpdate(
    roomId,
    {
      $set: {
        configuration: {
          ...currentConfig,
          ...config,
          // Siempre que se modifica, se marca como preset custom
          preset: ConfigPreset.CUSTOM,
          // El modo de juego será custom si se hacen modificaciones
          gameMode: GameMode.CUSTOM,
          // Actualizar a versión actual
          version: CURRENT_CONFIG_VERSION,
        },
      },
    },
    { new: true },
  );

  if (!updatedRoom) {
    throw new Error('Error al actualizar la configuración');
  }

  return updatedRoom.configuration;
}

/**
 * Obtiene las configuraciones por defecto y disponibles
 */
export function getAvailableConfigs() {
  return {
    presets: CONFIG_PRESETS,
    categories: AVAILABLE_CATEGORIES,
    currentVersion: CURRENT_CONFIG_VERSION,
    gameModes: Object.values(GameMode),
    scoringSystems: Object.values(ScoringSystem),
    visualThemes: Object.values(VisualTheme),
  };
}

// Mantener para compatibilidad con versiones anteriores
export function migrateConfig(config: VersionedConfig): VersionedConfig {
  // Si no hay versión o es la actual, no es necesario migrar
  if (!config.version || config.version === CURRENT_CONFIG_VERSION) {
    return {
      ...config,
      version: CURRENT_CONFIG_VERSION,
    };
  }

  // Migración de versiones anteriores a la actual
  const migrated: VersionedConfig = { ...config, version: CURRENT_CONFIG_VERSION };

  // Versión 1.0 -> 2.0
  if (config.version === '1.0') {
    // Establecer valores por defecto para los nuevos campos
    migrated.gameMode = GameMode.STANDARD;
    migrated.adaptiveTime = false;
    migrated.scoreMultiplier = 1;
    migrated.scoringSystem = ScoringSystem.STANDARD;
    migrated.bonusRounds = false;
    migrated.teamMode = false;
    migrated.allowVoting = true;
    migrated.votingThreshold = 60;
    migrated.allowHints = true;
    migrated.hintsCount = 1;
    migrated.visualTheme = VisualTheme.DEFAULT;
    migrated.showTimer = true;
    migrated.allowSpectators = true;
    migrated.minPlayersToStart = 2;
    migrated.autoStart = false;
    migrated.hideWords = true;
    migrated.roundBuffer = 5;
  }

  return migrated;
}

// Nueva función para guardar configuración favorita de un usuario
export async function saveUserFavoriteConfig(
  userId: string,
  config: GameRoomConfig,
  name: string,
): Promise<{ id: string; name: string }> {
  // Validar la configuración
  validateConfig(config);

  // Aquí iría la lógica para almacenar la configuración en una colección
  // específica de configuraciones favoritas. Por ahora retornamos un mock.
  return {
    id: `favorite-${Date.now()}`,
    name,
  };
}

// Nueva función para obtener configuraciones favoritas de un usuario
export async function getUserFavoriteConfigs(
  userId: string,
): Promise<Array<{ id: string; name: string; config: GameRoomConfig }>> {
  // Aquí iría la lógica para recuperar configuraciones favoritas del usuario
  // Por ahora retornamos datos de ejemplo
  return [
    {
      id: 'favorite-1',
      name: 'Mi config favorita',
      config: CONFIG_PRESETS[ConfigPreset.STANDARD] as GameRoomConfig,
    },
  ];
}

// Nueva función para calcular tiempo por ronda basado en número de jugadores
export function calculateAdaptiveRoundTime(baseTime: number, playerCount: number, timeFactor: number = 1): number {
  // Fórmula simple: tiempo base + ajuste por cada jugador adicional más allá de 4
  const additionalTime = playerCount > 4 ? (playerCount - 4) * 10 * timeFactor : 0;

  // Limitar al rango permitido de 30-300 segundos
  return Math.max(30, Math.min(300, baseTime + additionalTime));
}
