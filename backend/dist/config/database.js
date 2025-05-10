"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_CALLBACK_URL = exports.GOOGLE_CLIENT_SECRET = exports.GOOGLE_CLIENT_ID = exports.REFRESH_TOKEN_EXPIRES_IN = exports.ACCESS_TOKEN_EXPIRES_IN = exports.JWT_SECRET = exports.DB_NAME = exports.MONGODB_URI = void 0;
exports.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sketchrival";
exports.DB_NAME = "sketchrival";
exports.JWT_SECRET = process.env.JWT_SECRET || "supersecretkeydontusethisinprod";
exports.ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
exports.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
// Google OAuth Credentials
exports.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
exports.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "YOUR_GOOGLE_CLIENT_SECRET";
exports.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback";
