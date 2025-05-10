// Servicio básico para obtener configuración de salas

const defaultConfig = {
  maxPlayers: 8,
  roundTime: 90,
  totalRounds: 3,
  wordCategories: ['animales', 'objetos', 'comida', 'deportes', 'países'],
  difficulty: 'medium',
  allowCustomWords: false,
  customWords: [],
};

export const getRoomConfig = async (configId: string) => {
  // En una implementación real, buscaría en la base de datos
  return defaultConfig;
};
