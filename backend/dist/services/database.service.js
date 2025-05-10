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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = exports.connectToDatabase = void 0;
const mongodb_1 = require("mongodb");
const database_1 = require("../config/database");
let db;
const connectToDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    if (db) {
        return db;
    }
    try {
        const client = new mongodb_1.MongoClient(database_1.MONGODB_URI);
        yield client.connect();
        db = client.db(database_1.DB_NAME);
        console.log('Successfully connected to database');
        return db;
    }
    catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1);
    }
});
exports.connectToDatabase = connectToDatabase;
const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectToDatabase first.');
    }
    return db;
};
exports.getDb = getDb;
