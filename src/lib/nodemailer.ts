import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

/**
 * Transporter de Nodemailer para VirtuAbogado 📧
 * Configurado para usar Gmail SMTP con Contraseña de Aplicación.
 */
export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
    }
});

// Verificación de conexión opcional en logs de servidor
if (process.env.NODE_ENV === 'development') {
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ [Nodemailer] Error de conexión SMTP:', error);
        } else {
            
        }
    });
}
