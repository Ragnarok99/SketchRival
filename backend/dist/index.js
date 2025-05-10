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
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const passport_setup_1 = __importDefault(require("./config/passport.setup"));
const socket_service_1 = __importDefault(require("./services/socket.service"));
// Importar rutas
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const waitingRoom_routes_1 = __importDefault(require("./routes/waitingRoom.routes"));
const gameState_routes_1 = __importDefault(require("./routes/gameState.routes"));
const gameRooms_routes_1 = __importDefault(require("./routes/gameRooms.routes"));
const roomConfig_routes_1 = __importDefault(require("./routes/roomConfig.routes"));
const privateRooms_routes_1 = __importDefault(require("./routes/privateRooms.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const words_routes_1 = __importDefault(require("./routes/words.routes"));
// Importar servicios
const email_service_1 = require("./services/email.service");
// Cargar variables de entorno
dotenv_1.default.config();
// Crear aplicación Express
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middlewares
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(passport_setup_1.default.initialize());
// Ruta raíz
app.get('/', (req, res) => {
    res.send('SketchRival Backend API');
});
// Configurar rutas
app.use('/api/auth', auth_routes_1.default);
app.use('/api/game-state', gameState_routes_1.default);
app.use('/api/waiting-room', waitingRoom_routes_1.default);
app.use('/api/rooms', gameRooms_routes_1.default);
app.use('/api/configs', roomConfig_routes_1.default);
app.use('/api/private', privateRooms_routes_1.default);
app.use('/api/stats', stats_routes_1.default);
app.use('/api/words', words_routes_1.default);
// Crear servidor HTTP
const server = http_1.default.createServer(app);
// Inicializar Socket.IO
socket_service_1.default.initialize(server);
// Configurar conexión MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sketchrival';
// Función para iniciar el servidor
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Intento de conexión a MongoDB
        console.log('Connecting to MongoDB...');
        yield mongoose_1.default.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        // Inicializar servicio de email
        try {
            yield (0, email_service_1.initializeEmailService)();
            console.log('Email service initialized');
        }
        catch (err) {
            console.error('Error initializing email service:', err);
        }
        // Inicializar datos por defecto
        try {
            // Inicializar categorías de palabras y recompensas
            console.log('Initializing default data...');
        }
        catch (error) {
            console.error('Error initializing default data:', error);
        }
        // Iniciar el servidor
        server.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        // Si falla la conexión a MongoDB, iniciar en modo offline
        console.log('Starting server in offline mode (without database)...');
        // Iniciar el servidor de todos modos para que las rutas estén disponibles
        server.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT} in OFFLINE mode (no database)`);
        });
    }
});
// Iniciar el servidor
startServer();
exports.default = server;
