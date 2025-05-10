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
exports.sendPasswordResetEmail = exports.initializeEmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// En un entorno de producción, usarías credenciales reales
// Para desarrollo, usamos una cuenta de prueba de ethereal
let transporter;
// Configurar el transporter de forma asíncrona
const initializeEmailService = () => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.NODE_ENV === 'production') {
        // Configuración para producción (ejemplo con Gmail)
        transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || '',
                pass: process.env.EMAIL_PASS || '',
            },
        });
    }
    else {
        // Para entorno de desarrollo, usamos ethereal.email (fake SMTP service)
        const testAccount = yield nodemailer_1.default.createTestAccount();
        transporter = nodemailer_1.default.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log('Cuenta de prueba Ethereal creada:', {
            user: testAccount.user,
            pass: testAccount.pass,
        });
    }
});
exports.initializeEmailService = initializeEmailService;
/**
 * Envía un correo electrónico para recuperación de contraseña
 */
const sendPasswordResetEmail = (email, resetToken, username) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!transporter) {
            yield (0, exports.initializeEmailService)();
        }
        // La URL del frontend donde el usuario puede restablecer su contraseña
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}`;
        // Configuración del correo electrónico
        const mailOptions = {
            from: `"SketchRival" <${process.env.EMAIL_FROM || 'noreply@sketchrival.com'}>`,
            to: email,
            subject: 'Restablecimiento de Contraseña - SketchRival',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hola ${username || 'usuario'}!</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el enlace de abajo para crear una nueva contraseña:</p>
          <p style="margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
              Restablecer contraseña
            </a>
          </p>
          <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.</p>
          <p>Este enlace es válido por 10 minutos.</p>
          <p>Saludos,<br>El equipo de SketchRival</p>
        </div>
      `,
        };
        const info = yield transporter.sendMail(mailOptions);
        // En desarrollo, muestra la URL para ver el correo en Ethereal
        if (process.env.NODE_ENV !== 'production') {
            console.log('URL de vista previa del correo:', nodemailer_1.default.getTestMessageUrl(info));
        }
        return true;
    }
    catch (error) {
        console.error('Error al enviar correo de recuperación:', error);
        return false;
    }
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
