import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/database';
import crypto from 'crypto'; // Importar crypto para hashing

interface EvaluationResult {
  isCorrect: boolean;
  justification: string;
  error?: string;
}

class OpenAIService {
  private openai: OpenAI;
  private evaluationCache: Map<string, EvaluationResult>; // Caché en memoria
  private maxCacheSize: number; // Límite de tamaño para el caché en memoria

  constructor() {
    this.evaluationCache = new Map(); // Inicializar caché
    this.maxCacheSize = 1000; // Límite de tamaño para el caché en memoria
    if (!OPENAI_API_KEY) {
      console.warn('Advertencia: OPENAI_API_KEY no está configurada. El servicio de OpenAI no funcionará.');
      // Podrías optar por lanzar un error aquí si la API key es estrictamente necesaria para el funcionamiento básico
      // throw new Error('OPENAI_API_KEY no está configurada.');
      this.openai = null as any; // Para evitar error de TypeScript si no se inicializa
    } else {
      this.openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
        timeout: 60 * 1000, // Timeout de 60 segundos para las solicitudes
        // maxRetries: se usa el default de la librería (2) a menos que se necesite cambiar
      });
    }
  }

  /**
   * Función de prueba para verificar la conexión y configuración de la API de OpenAI.
   * Intenta listar los modelos disponibles.
   */
  async testConnection(): Promise<boolean> {
    if (!this.openai) {
      console.error('Cliente OpenAI no inicializado debido a falta de API key.');
      return false;
    }
    try {
      // Una llamada simple para verificar la conexión, como listar algunos modelos
      // Este endpoint puede variar o necesitar permisos específicos.
      // Adaptar según la necesidad o usar una llamada más simple como un chat completion básico.
      // Por ahora, solo simularemos una llamada exitosa si el cliente está inicializado.
      console.log('Probando conexión con OpenAI API...');
      // Ejemplo: const models = await this.openai.models.list();
      // console.log('Modelos disponibles (ejemplo):', models.data.slice(0, 2));
      console.log('Conexión con OpenAI API configurada (simulación de prueba exitosa).');
      return true;
    } catch (error) {
      console.error('Error al probar la conexión con OpenAI API:', error);
      return false;
    }
  }

  /**
   * Valida y formatea una imagen en formato Data URL para enviarla a OpenAI.
   * La implementación actual simplemente valida el formato, pero podría extenderse
   * para optimizar la imagen (redimensionamiento, compresión) si fuera necesario.
   *
   * @param imageDataUrl La imagen en formato Data URL (típicamente generada por canvas.toDataURL)
   * @returns La imagen validada/optimizada lista para enviar a OpenAI, o null si es inválida
   */
  formatImageForOpenAI(imageDataUrl: string): string | null {
    // Verificar que sea una Data URL válida
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      console.error('Formato de imagen inválido: la URL de datos no es una cadena válida');
      return null;
    }

    // Verificar que tenga el formato correcto (debe empezar con "data:")
    if (!imageDataUrl.startsWith('data:')) {
      console.error('Formato de imagen inválido: la URL no comienza con "data:"');
      return null;
    }

    // Verificar que sea una imagen (data:image/)
    if (!imageDataUrl.startsWith('data:image/')) {
      console.error('Formato de imagen inválido: no es una imagen');
      return null;
    }

    // Por ahora, devolvemos la imagen tal como está.
    // En futuras optimizaciones, podríamos:
    // 1. Redimensionar la imagen si es demasiado grande (lado más corto ~768px, lado más largo ~2048px)
    // 2. Comprimir la imagen si es demasiado pesada
    // 3. Convertir a un formato más eficiente

    // Podemos añadir comentarios con recomendaciones para optimizaciones en el frontend
    const estimatedSize = Math.round(imageDataUrl.length * 0.75); // Aproximación del tamaño en bytes
    if (estimatedSize > 1000000) {
      // Si es mayor a ~1MB
      console.warn(
        `Imagen grande (aprox. ${Math.round(estimatedSize / 1024)}KB). Considerar redimensionar en el frontend.`,
      );
    }

    return imageDataUrl;
  }

  /**
   * Prepara el prompt para enviar a OpenAI para la evaluación del dibujo.
   */
  private createEvaluationPrompt(imageDataUrl: string, wordToGuess: string): OpenAI.Chat.ChatCompletionMessageParam[] {
    // Asegurarse de que la imageDataUrl es una Data URL válida
    // (Podría añadirse validación aquí si es necesario)

    return [
      {
        role: 'system',
        content:
          'Eres un juez experto en el juego Pictionary. Tu tarea es evaluar si un dibujo representa una palabra o frase específica. Sé conciso y justo. Responde comenzando con "Respuesta: [Sí/No]" en la primera línea, y en la siguiente línea "Justificación: [Tu justificación concisa]".',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analiza el siguiente dibujo. La palabra a adivinar era: "${wordToGuess}". ¿El dibujo representa claramente esta palabra?`,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl,
              detail: 'low', // Cambiado de 'high' a 'low' para prueba de optimización de costos
            },
          },
        ],
      },
    ];
  }

  /**
   * Evalúa un dibujo utilizando la API de OpenAI.
   * @param imageDataUrl La imagen del dibujo en formato Data URL.
   * @param wordToGuess La palabra que se intentaba dibujar.
   * @returns Un objeto EvaluationResult con el resultado de la evaluación.
   */
  async evaluateDrawingWithOpenAI(imageDataUrl: string, wordToGuess: string): Promise<EvaluationResult> {
    if (!this.openai) {
      console.error('Cliente OpenAI no inicializado.');
      return {
        isCorrect: false,
        justification: 'Error: El servicio de OpenAI no está inicializado.',
        error: 'OpenAI client not initialized',
      };
    }

    // Formatear y validar la imagen antes de procesarla
    const formattedImage = this.formatImageForOpenAI(imageDataUrl);
    if (!formattedImage) {
      return {
        isCorrect: false,
        justification: 'Error: El formato de la imagen no es válido.',
        error: 'Invalid image format',
      };
    }

    // Generar clave de caché usando hash para la imagen
    const imageHash = crypto.createHash('sha256').update(formattedImage).digest('hex');
    const cacheKey = `${imageHash}::${wordToGuess}`;

    // Verificar caché
    if (this.evaluationCache.has(cacheKey)) {
      console.log(`Cache hit for key: ${cacheKey}`);
      return this.evaluationCache.get(cacheKey)!; // El ! es seguro por el .has()
    }
    console.log(`Cache miss for key: ${cacheKey}`);

    const messages = this.createEvaluationPrompt(formattedImage, wordToGuess);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o', // O el modelo específico de visión que se decida usar
        messages: messages,
        max_tokens: 70, // Reducido de 100 a 70 para optimizar costos
        temperature: 0.3, // Un valor bajo para respuestas más deterministas/factuales
      });

      // Loguear uso de tokens si está disponible
      if (completion.usage) {
        console.log(
          `OpenAI API Usage: Prompt tokens: ${completion.usage.prompt_tokens}, Completion tokens: ${completion.usage.completion_tokens}, Total tokens: ${completion.usage.total_tokens}`,
        );
      }

      const rawResponse = completion.choices[0]?.message?.content?.trim();
      if (!rawResponse) {
        return {
          isCorrect: false,
          justification: 'No se recibió respuesta de la IA.',
          error: 'Empty response from AI',
        };
      }

      const parsedResult = this.parseEvaluationResponse(rawResponse);

      // Guardar en caché antes de retornar
      if (!parsedResult.error) {
        // Controlar tamaño del caché
        if (this.evaluationCache.size >= this.maxCacheSize) {
          console.warn(`Cache limit (${this.maxCacheSize}) reached. Clearing cache.`);
          this.evaluationCache.clear();
        }
        this.evaluationCache.set(cacheKey, parsedResult);
      }

      return parsedResult;
    } catch (error: any) {
      console.error('Error al evaluar el dibujo con OpenAI:', error?.message);
      let errorMessage = 'Error al contactar el servicio de OpenAI.';
      if (error instanceof OpenAI.APIError) {
        console.error(`OpenAI API Error: Status ${error.status}, Type: ${error.name}, Message: ${error.message}`);
        errorMessage = `Error de API OpenAI (${error.status}): ${error.message}`;
        // Podríamos personalizar el mensaje o la lógica basada en error.status aquí
        // Por ejemplo, para 429 (rate limit), podríamos querer un mensaje diferente
      }
      return {
        isCorrect: false,
        justification: errorMessage,
        error: error.message || 'Error desconocido de OpenAI',
      };
    }
  }

  /**
   * Parsea la respuesta de texto de OpenAI para extraer la evaluación y justificación.
   */
  private parseEvaluationResponse(rawResponse: string): EvaluationResult {
    const responseLines = rawResponse.split('\n');
    let isCorrect = false;
    let justification = 'Evaluación no concluyente.'; // Default más neutral
    let errorFromParsing: string | undefined = undefined;

    if (responseLines.length > 0) {
      const answerLine = responseLines[0].toLowerCase().trim();
      if (answerLine.startsWith('respuesta: sí') || answerLine.startsWith('respuesta:si')) {
        isCorrect = true;
      } else if (answerLine.startsWith('respuesta: no')) {
        isCorrect = false;
      } else {
        // Si no sigue el formato exacto, intentar una búsqueda más general como fallback
        // y registrar que el formato no fue el esperado.
        console.warn(`Respuesta de IA no sigue el formato esperado. Línea de respuesta: "${responseLines[0]}"`);
        errorFromParsing = 'Formato de respuesta inesperado de la IA.';
        // Fallback simple: si contiene "sí" y no "no", asumir sí. Podría ser más robusto.
        if (rawResponse.toLowerCase().includes('sí') && !rawResponse.toLowerCase().includes('no')) isCorrect = true;
        // Si no, se mantiene el isCorrect = false por defecto
      }
    } else {
      errorFromParsing = 'Respuesta vacía de la IA después del trim.';
      justification = 'Respuesta vacía de la IA.';
      return { isCorrect, justification, error: errorFromParsing };
    }

    if (responseLines.length > 1) {
      const justificationLine = responseLines[1].toLowerCase().trim();
      if (justificationLine.startsWith('justificación:')) {
        justification = responseLines[1].substring('justificación:'.length).trim();
      } else {
        // Si la segunda línea no es la justificación esperada, tomar el resto de la respuesta
        justification = responseLines.slice(1).join(' \n').trim() || rawResponse;
        console.warn(`Línea de justificación no sigue el formato esperado. Usando fallback para justificación.`);
      }
    } else if (!isCorrect && responseLines.length === 1 && !responseLines[0].toLowerCase().startsWith('respuesta:')) {
      // Si solo hay una línea, no es la respuesta formateada, y se evaluó como incorrecto por fallback, tomarla como justificación.
      justification = responseLines[0].trim();
    } else if (responseLines.length <= 1) {
      // Si no hay segunda línea para la justificación pero la respuesta sí fue parseada
      justification = 'No se proporcionó justificación explícita.';
      if (!errorFromParsing) errorFromParsing = 'Falta justificación explícita.';
    }

    // Limitar la longitud de la justificación
    if (justification.length > 200) {
      justification = justification.substring(0, 197) + '...';
    }

    // Sanitizar la justificación: reemplazar múltiples espacios/saltos de línea
    justification = justification
      .replace(/\s\s+/g, ' ')
      .replace(/(\r\n|\n|\r){2,}/g, '\n')
      .trim();

    return { isCorrect, justification, error: errorFromParsing };
  }
}

const openAIService = new OpenAIService();
export default openAIService;
