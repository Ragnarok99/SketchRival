import express, { Request, Response } from "express";
import { connectToDatabase } from "./services/database.service";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes"; // Importar rutas de autenticación
import passport from "./config/passport.setup"; // Importar configuración de Passport
import { initializeEmailService } from "./services/email.service";

dotenv.config(); // Cargar variables de entorno

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json()); // Middleware para parsear JSON bodies
app.use(passport.initialize()); // Inicializar Passport

connectToDatabase()
  .then(() => {
    console.log("Connected to MongoDB");

    // Inicializar servicio de email
    initializeEmailService()
      .then(() => {
        console.log("Email service initialized");
      })
      .catch((err) => {
        console.error("Error initializing email service:", err);
      });

    app.get("/", (req: Request, res: Response) => {
      res.send("Hello from SketchRival Backend!");
    });

    app.use("/api/auth", authRoutes); // Usar rutas de autenticación

    app.listen(port, () => {
      console.log(`Backend server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error(
      "Failed to start server due to database connection error:",
      error,
    );
    process.exit(1);
  });
