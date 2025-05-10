"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = __importDefault(require("openai"));
const database_1 = require("../config/database");
const crypto_1 = __importDefault(require("crypto")); // Importar crypto para hashing
class OpenAIService {
    constructor() {
        this.evaluationCache = new Map(); // Inicializar caché
        if (!database_1.OPENAI_API_KEY) {
            console.warn('Advertencia: OPENAI_API_KEY no está configurada. El servicio de OpenAI no funcionará.');
            // Podrías optar por lanzar un error aquí si la API key es estrictamente necesaria para el funcionamiento básico
            // throw new Error('OPENAI_API_KEY no está configurada.');
            this.openai = null; // Para evitar error de TypeScript si no se inicializa
        }
        else {
            this.openai = new openai_1.default({
                apiKey: database_1.OPENAI_API_KEY,
                timeout: 60 * 1000, // Timeout de 60 segundos para las solicitudes
                // maxRetries: se usa el default de la librería (2) a menos que se necesite cambiar
            });
        }
    }
    /**
     * Función de prueba para verificar la conexión y configuración de la API de OpenAI.
     * Intenta listar los modelos disponibles.
     */
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            catch (error) {
                console.error('Error al probar la conexión con OpenAI API:', error);
                return false;
            }
        });
    }
    /**
     * Prepara el prompt para enviar a OpenAI para la evaluación del dibujo.
     */
    createEvaluationPrompt(imageDataUrl, wordToGuess) {
        // Asegurarse de que la imageDataUrl es una Data URL válida
        // (Podría añadirse validación aquí si es necesario)
        return [
            {
                role: 'system',
                content: 'Eres un juez experto en el juego Pictionary. Tu tarea es evaluar si un dibujo representa una palabra o frase específica. Sé conciso y justo. Responde comenzando con "Respuesta: [Sí/No]" en la primera línea, y en la siguiente línea "Justificación: [Tu justificación concisa]".',
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
                            detail: 'high', // TODO: Considerar hacer configurable ('low' o 'high') o probar 'low' para optimizar costos.
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
    evaluateDrawingWithOpenAI(imageDataUrl, wordToGuess) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!this.openai) {
                console.error('Cliente OpenAI no inicializado.');
                return {
                    isCorrect: false,
                    justification: 'Error: El servicio de OpenAI no está inicializado.',
                    error: 'OpenAI client not initialized',
                };
            }
            // Generar clave de caché usando hash para la imagen
            const imageHash = crypto_1.default.createHash('sha256').update(imageDataUrl).digest('hex');
            const cacheKey = `${imageHash}::${wordToGuess}`;
            // Verificar caché
            if (this.evaluationCache.has(cacheKey)) {
                console.log(`Cache hit for key: ${cacheKey}`);
                return this.evaluationCache.get(cacheKey); // El ! es seguro por el .has()
            }
            console.log(`Cache miss for key: ${cacheKey}`);
            const messages = this.createEvaluationPrompt(imageDataUrl, wordToGuess);
            try {
                const completion = yield this.openai.chat.completions.create({
                    model: 'gpt-4o', // O el modelo específico de visión que se decida usar
                    messages: messages,
                    max_tokens: 100, // Ajustar según la longitud esperada de la justificación. 50-70 podrían ser suficientes.
                    temperature: 0.3, // Un valor bajo para respuestas más deterministas/factuales
                });
                // Loguear uso de tokens si está disponible
                if (completion.usage) {
                    console.log(`OpenAI API Usage: Prompt tokens: ${completion.usage.prompt_tokens}, Completion tokens: ${completion.usage.completion_tokens}, Total tokens: ${completion.usage.total_tokens}`);
                }
                const rawResponse = (_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim();
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
                    // Solo cachear resultados válidos
                    this.evaluationCache.set(cacheKey, parsedResult);
                }
                return parsedResult;
            }
            catch (error) {
                console.error('Error al evaluar el dibujo con OpenAI:', error === null || error === void 0 ? void 0 : error.message);
                let errorMessage = 'Error al contactar el servicio de OpenAI.';
                if (error instanceof openai_1.default.APIError) {
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
        });
    }
    /**
     * Parsea la respuesta de texto de OpenAI para extraer la evaluación y justificación.
     */
    parseEvaluationResponse(rawResponse) {
        const responseLines = rawResponse.split('\n');
        let isCorrect = false;
        let justification = 'Evaluación no concluyente.'; // Default más neutral
        let errorFromParsing = undefined;
        if (responseLines.length > 0) {
            const answerLine = responseLines[0].toLowerCase().trim();
            if (answerLine.startsWith('respuesta: sí') || answerLine.startsWith('respuesta:si')) {
                isCorrect = true;
            }
            else if (answerLine.startsWith('respuesta: no')) {
                isCorrect = false;
            }
            else {
                // Si no sigue el formato exacto, intentar una búsqueda más general como fallback
                // y registrar que el formato no fue el esperado.
                console.warn(`Respuesta de IA no sigue el formato esperado. Línea de respuesta: "${responseLines[0]}"`);
                errorFromParsing = 'Formato de respuesta inesperado de la IA.';
                // Fallback simple: si contiene "sí" y no "no", asumir sí. Podría ser más robusto.
                if (rawResponse.toLowerCase().includes('sí') && !rawResponse.toLowerCase().includes('no'))
                    isCorrect = true;
                // Si no, se mantiene el isCorrect = false por defecto
            }
        }
        else {
            errorFromParsing = 'Respuesta vacía de la IA después del trim.';
            justification = 'Respuesta vacía de la IA.';
            return { isCorrect, justification, error: errorFromParsing };
        }
        if (responseLines.length > 1) {
            const justificationLine = responseLines[1].toLowerCase().trim();
            if (justificationLine.startsWith('justificación:')) {
                justification = responseLines[1].substring('justificación:'.length).trim();
            }
            else {
                // Si la segunda línea no es la justificación esperada, tomar el resto de la respuesta
                justification = responseLines.slice(1).join(' \n').trim() || rawResponse;
                console.warn(`Línea de justificación no sigue el formato esperado. Usando fallback para justificación.`);
            }
        }
        else if (!isCorrect && responseLines.length === 1 && !responseLines[0].toLowerCase().startsWith('respuesta:')) {
            // Si solo hay una línea, no es la respuesta formateada, y se evaluó como incorrecto por fallback, tomarla como justificación.
            justification = responseLines[0].trim();
        }
        else if (responseLines.length <= 1) {
            // Si no hay segunda línea para la justificación pero la respuesta sí fue parseada
            justification = 'No se proporcionó justificación explícita.';
            if (!errorFromParsing)
                errorFromParsing = 'Falta justificación explícita.';
        }
        // Limitar la longitud de la justificación
        if (justification.length > 200) {
            justification = justification.substring(0, 197) + '...';
        }
        return { isCorrect, justification, error: errorFromParsing };
    }
}
const openAIService = new OpenAIService();
exports.default = openAIService;
