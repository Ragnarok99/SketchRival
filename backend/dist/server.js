"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const game_routes_1 = __importDefault(require("./routes/game.routes"));
const waitingRoom_routes_1 = __importDefault(require("./routes/waitingRoom.routes"));
const gameState_routes_1 = __importDefault(require("./routes/gameState.routes"));
const socket_service_1 = __importDefault(require("./services/socket.service"));
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
// Rutas
app.use('/api/users', user_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/games', game_routes_1.default);
app.use('/api/waiting-rooms', waitingRoom_routes_1.default);
app.use('/api/game-state', gameState_routes_1.default);
// Ruta raíz
app.get('/', (req, res) => {
    res.send('API funcionando correctamente');
});
// Crear servidor HTTP
const server = http_1.default.createServer(app);
// Inicializar Socket.IO
socket_service_1.default.initialize(server);
// Conectar a la base de datos y arrancar el servidor
(0, db_1.default)()
    .then(() => {
    server.listen(PORT, () => {
        console.log(`Servidor ejecutándose en puerto ${PORT}`);
    });
})
    .catch((error) => {
    console.error('Error al conectar a la base de datos:', error);
    process.exit(1);
});
exports.default = server;
