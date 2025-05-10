import nodemailer from 'nodemailer';

// En un entorno de producción, usarías credenciales reales
// Para desarrollo, usamos una cuenta de prueba de ethereal
let transporter: nodemailer.Transporter;

// Configurar el transporter de forma asíncrona
export const initializeEmailService = async () => {
  if (process.env.NODE_ENV === 'production') {
    // Configuración para producción (ejemplo con Gmail)
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
    });
  } else {
    // Para entorno de desarrollo, usamos ethereal.email (fake SMTP service)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
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
};

/**
 * Envía un correo electrónico para recuperación de contraseña
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string, username: string): Promise<boolean> => {
  try {
    if (!transporter) {
      await initializeEmailService();
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

    const info = await transporter.sendMail(mailOptions);

    // En desarrollo, muestra la URL para ver el correo en Ethereal
    if (process.env.NODE_ENV !== 'production') {
      console.log('URL de vista previa del correo:', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('Error al enviar correo de recuperación:', error);
    return false;
  }
};
