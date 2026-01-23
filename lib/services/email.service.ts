import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Créer le transporteur email
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

// Envoyer un email
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: 'Erreur lors de l\'envoi de l\'email' };
  }
}

// Template email pour le code de connexion
export function getCodeEmailTemplate(fullName: string, code: string, instanceName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Votre code de connexion</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MDev_Election - Système d'Élection</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${instanceName}</p>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${fullName},</h2>

        <p>Votre compte a été créé avec succès. Utilisez le code ci-dessous pour vous connecter et voter :</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Votre code de connexion</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22c55e; margin: 0;">${code}</p>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Important :</strong> Ce code est votre mot de passe. Ne le partagez avec personne.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MDev_Election - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;
}

// Envoyer le code de connexion
export async function sendCodeEmail(
  to: string,
  fullName: string,
  code: string,
  instanceName: string
): Promise<{ success: boolean; error?: string }> {
  const html = getCodeEmailTemplate(fullName, code, instanceName);

  return sendEmail({
    to,
    subject: `Votre code de connexion - ${instanceName}`,
    html,
  });
}
