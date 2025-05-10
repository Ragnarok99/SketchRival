"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
const config = {
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    jwt: {
        secret: database_1.JWT_SECRET,
    },
    // Añade otras propiedades globales de configuración aquí si es necesario
};
exports.default = config;
