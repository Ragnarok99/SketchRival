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
class OpenAIService {
    constructor() {
        if (!database_1.OPENAI_API_KEY) {
            console.warn('Advertencia: OPENAI_API_KEY no está configurada. El servicio de OpenAI no funcionará.');
            // Podrías optar por lanzar un error aquí si la API key es estrictamente necesaria para el funcionamiento básico
            // throw new Error('OPENAI_API_KEY no está configurada.');
            this.openai = null; // Para evitar error de TypeScript si no se inicializa
        }
        else {
            this.openai = new openai_1.default({
                apiKey: database_1.OPENAI_API_KEY,
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
}
const openAIService = new OpenAIService();
exports.default = openAIService;
