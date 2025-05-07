import { GameRoomModel, GameRoomConfig } from '../models';

// Versión actual del esquema de configuración
export const CURRENT_CONFIG_VERSION = '1.0';

// Configuraciones preestablecidas
export enum ConfigPreset {
  QUICK = 'quick', // Partida rápida
  STANDARD = 'standard', // Configuración estándar
  EXTENDED = 'extended', // Partida larga
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
  },
  [ConfigPreset.STANDARD]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 6,
    roundTime: 90,
    totalRounds: 4,
    drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países'],
    allowCustomWords: false,
    difficulty: 'medium',
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
  },
  [ConfigPreset.CUSTOM]: {
    version: CURRENT_CONFIG_VERSION,
    maxPlayers: 6,
    roundTime: 90,
    totalRounds: 3,
    drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países'],
    allowCustomWords: false,
    difficulty: 'medium',
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

  // Validar compatibilidad entre opciones
  if (config.difficulty === 'hard' && config.roundTime !== undefined && config.roundTime < 60) {
    errors.push('Para dificultad "hard", el tiempo mínimo por ronda debe ser 60 segundos');
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
  };
}

/**
 * Migra una configuración antigua a la versión actual si es necesario
 */
export function migrateConfig(config: VersionedConfig): VersionedConfig {
  // Si no tiene versión o ya es la actual, devolver como está
  if (!config.version || config.version === CURRENT_CONFIG_VERSION) {
    return {
      ...config,
      version: CURRENT_CONFIG_VERSION,
    };
  }

  // Lógica de migración según versiones
  // Por ahora solo hay una versión, pero aquí se implementarían las migraciones
  // a medida que evoluciona el esquema de configuración

  return {
    ...config,
    version: CURRENT_CONFIG_VERSION,
  };
}
