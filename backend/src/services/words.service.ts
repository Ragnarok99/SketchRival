// Servicio para generar palabras aleatorias

// Diccionario básico de palabras por categorías
const wordDictionary: Record<string, string[]> = {
  animales: ['perro', 'gato', 'elefante', 'jirafa', 'león', 'tigre', 'oso', 'mono'],
  objetos: ['mesa', 'silla', 'teléfono', 'lámpara', 'reloj', 'libro', 'bolígrafo', 'televisor'],
  comida: ['pizza', 'hamburguesa', 'pasta', 'ensalada', 'helado', 'chocolate', 'taco', 'sushi'],
  deportes: ['fútbol', 'baloncesto', 'tenis', 'natación', 'atletismo', 'golf', 'béisbol', 'voleibol'],
  países: ['España', 'Francia', 'Italia', 'Alemania', 'Japón', 'Brasil', 'México', 'India'],
};

/**
 * Obtener palabras aleatorias de categorías específicas
 */
export const getRandomWords = (categories: string[] = ['animales', 'objetos'], count: number = 3): string[] => {
  // Crear una lista de todas las palabras en las categorías solicitadas
  const allWords: string[] = [];

  categories.forEach((category) => {
    if (wordDictionary[category]) {
      allWords.push(...wordDictionary[category]);
    }
  });

  if (allWords.length === 0) {
    return ['gato', 'perro', 'casa']; // Palabras por defecto
  }

  // Seleccionar palabras aleatorias
  const result: string[] = [];
  const maxWords = Math.min(count, allWords.length);

  while (result.length < maxWords) {
    const randomIndex = Math.floor(Math.random() * allWords.length);
    const word = allWords[randomIndex];

    if (!result.includes(word)) {
      result.push(word);
    }
  }

  return result;
};

/**
 * Generar palabras aleatorias para un juego
 */
export const generateRandomWords = async (gameId: string, categories: string[] = ['animales', 'objetos']) => {
  try {
    // Obtener palabras aleatorias
    const words = getRandomWords(categories, 10);

    // En una implementación real, guardaríamos estas palabras en la base de datos
    console.log(`Palabras generadas para el juego ${gameId}:`, words);

    return words;
  } catch (error) {
    console.error('Error generando palabras aleatorias:', error);
    throw error;
  }
};
