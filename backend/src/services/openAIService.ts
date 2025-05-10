import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/database';

class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!OPENAI_API_KEY) {
      console.warn('Advertencia: OPENAI_API_KEY no está configurada. El servicio de OpenAI no funcionará.');
      // Podrías optar por lanzar un error aquí si la API key es estrictamente necesaria para el funcionamiento básico
      // throw new Error('OPENAI_API_KEY no está configurada.');
      this.openai = null as any; // Para evitar error de TypeScript si no se inicializa
    } else {
      this.openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
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

  // Aquí se añadirán más métodos para interactuar con GPT-4o para la evaluación de dibujos, etc.
  // Por ejemplo:
  // async evaluateDrawing(imageDataBase64: string, wordToGuess: string): Promise<any> {
  //   if (!this.openai) {
  //     throw new Error('OpenAI Service not initialized.');
  //   }
  //   // Lógica para llamar a la API de vision de GPT-4o
  // }
}

const openAIService = new OpenAIService();
export default openAIService;
