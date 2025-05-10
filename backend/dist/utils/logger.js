"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Módulo básico de logging
const logger = {
    info: (message, ...args) => {
        console.info(`[INFO] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[ERROR] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[WARN] ${message}`, ...args);
    },
    debug: (message, ...args) => {
        console.debug(`[DEBUG] ${message}`, ...args);
    },
};
exports.default = logger;
