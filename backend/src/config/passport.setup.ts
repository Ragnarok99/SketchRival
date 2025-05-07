import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserModel, IUser } from "../models/User.model";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} from "./database"; // Usamos el mismo archivo de config por simplicidad

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"], // Pedimos perfil y email
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await UserModel.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }
        // Si el usuario no existe, buscar por email para vincular o crear nuevo
        user = await UserModel.findOne({ email: profile.emails?.[0]?.value });

        if (user) {
          // Vincular cuenta existente (si es de otro proveedor o local sin providerId)
          user.authProvider = "google";
          user.providerId = profile.id;
          user.avatarUrl = profile.photos?.[0]?.value || user.avatarUrl;
          await user.save();
          return done(null, user);
        }

        // Crear nuevo usuario si no se encuentra por ID de Google ni por email
        const newUser = new UserModel({
          username:
            profile.displayName ||
            profile.emails?.[0]?.value.split("@")[0] ||
            `user${Date.now()}`,
          email: profile.emails?.[0]?.value,
          authProvider: "google",
          providerId: profile.id,
          avatarUrl: profile.photos?.[0]?.value,
          // No se establece passwordHash para usuarios OAuth
        });

        await newUser.save();
        return done(null, newUser);
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

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

export default passport;
