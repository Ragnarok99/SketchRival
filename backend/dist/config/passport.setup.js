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
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_model_1 = require("../models/User.model");
const database_1 = require("./database"); // Usamos el mismo archivo de config por simplicidad
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: database_1.GOOGLE_CLIENT_ID,
    clientSecret: database_1.GOOGLE_CLIENT_SECRET,
    callbackURL: database_1.GOOGLE_CALLBACK_URL,
    scope: ["profile", "email"], // Pedimos perfil y email
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        let user = yield User_model_1.UserModel.findOne({ googleId: profile.id });
        if (user) {
            return done(null, user);
        }
        // Si el usuario no existe, buscar por email para vincular o crear nuevo
        user = yield User_model_1.UserModel.findOne({ email: (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value });
        if (user) {
            // Vincular cuenta existente (si es de otro proveedor o local sin providerId)
            user.authProvider = "google";
            user.providerId = profile.id;
            user.avatarUrl = ((_d = (_c = profile.photos) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) || user.avatarUrl;
            yield user.save();
            return done(null, user);
        }
        // Crear nuevo usuario si no se encuentra por ID de Google ni por email
        const newUser = new User_model_1.UserModel({
            username: profile.displayName ||
                ((_f = (_e = profile.emails) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value.split("@")[0]) ||
                `user${Date.now()}`,
            email: (_h = (_g = profile.emails) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.value,
            authProvider: "google",
            providerId: profile.id,
            avatarUrl: (_k = (_j = profile.photos) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.value,
            // No se establece passwordHash para usuarios OAuth
        });
        yield newUser.save();
        return done(null, newUser);
    }
    catch (error) {
        return done(error, false);
    }
})));
// Serialización y deserialización de usuario para sesiones (opcional si solo usas JWT)
// passport.serializeUser((user: any, done) => {
//   done(null, user.id);
// });
// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await UserModel.findById(id);
//     done(null, user);
//   } catch (error) {
//     done(error, false);
//   }
// });
exports.default = passport_1.default;
