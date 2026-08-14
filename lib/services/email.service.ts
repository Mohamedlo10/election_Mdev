import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
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
    const emailAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;

    // Format: "Nom Instance" <email@example.com> pour afficher le nom dans la boîte de réception
    const from = options.fromName
      ? `"${options.fromName}" <${emailAddress}>`
      : emailAddress;

    await transporter.sendMail({
      from,
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
    fromName: instanceName,
  });
}

// Template email pour invitation admin/observateur
export function getAccountInviteTemplate(
  email: string,
  password: string,
  role: 'admin' | 'observer',
  instanceName?: string
): string {
  const roleLabel = role === 'admin' ? 'Administrateur' : 'Observateur';
  const roleColor = role === 'admin' ? '#3b82f6' : '#eab308';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Votre compte MDev_Election</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MDev_Election</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Système de Gestion d'Élections</p>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <div style="background: ${roleColor}15; border-left: 4px solid ${roleColor}; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: ${roleColor}; font-weight: bold; font-size: 16px;">
            Compte ${roleLabel}
          </p>
          ${instanceName ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Instance: ${instanceName}</p>` : ''}
        </div>

        <h2 style="color: #1f2937; margin-top: 0;">Bienvenue !</h2>

        <p>Votre compte ${roleLabel.toLowerCase()} a été créé. Voici vos identifiants de connexion :</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Email</td>
              <td style="padding: 10px 0; font-weight: bold; color: #1f2937;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Mot de passe</td>
              <td style="padding: 10px 0; border-top: 1px solid #e5e7eb; font-weight: bold; color: #22c55e; font-size: 18px; letter-spacing: 2px;">${password}</td>
            </tr>
          </table>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Important :</strong> Conservez ce mot de passe en lieu sûr. Vous pourrez le modifier après votre première connexion.
          </p>
        </div>

        ${role === 'admin' && !instanceName ? `
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>Prochaine étape :</strong> Connectez-vous pour créer votre instance d'élection.
          </p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://election.mouhadev.com'}"
             style="display: inline-block; background: #22c55e; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Se connecter
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MDev_Election - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;
}

// Envoyer invitation admin/observateur
export async function sendAccountInviteEmail(
  to: string,
  password: string,
  role: 'admin' | 'observer',
  instanceName?: string
): Promise<{ success: boolean; error?: string }> {
  const roleLabel = role === 'admin' ? 'Administrateur' : 'Observateur';
  const html = getAccountInviteTemplate(to, password, role, instanceName);

  return sendEmail({
    to,
    subject: `Votre compte ${roleLabel} - MDev_Election${instanceName ? ` - ${instanceName}` : ''}`,
    html,
    fromName: instanceName || 'MDev_Election',
  });
}

// Notification pour un utilisateur existant ajouté à une équipe
export async function sendTeamAdditionEmail(
  to: string,
  role: string,
  instanceName: string
): Promise<{ success: boolean; error?: string }> {
  const roleLabel = role === 'admin' ? 'Administrateur' : role === 'manager' ? 'Gestionnaire' : 'Observateur';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://election.mouhadev.com';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Nouvel accès élection</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MDev_Election</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">${instanceName}</p>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; margin-top: 0;">Bonjour,</h2>

        <p>Vous avez été ajouté à l'équipe de l'élection <strong>${instanceName}</strong> avec le rôle de <strong>${roleLabel}</strong>.</p>

        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #166534; font-size: 14px;">
            Cet espace est désormais disponible sur votre tableau de bord. Connectez-vous avec vos identifiants habituels pour y accéder.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${appUrl}/login"
             style="display: inline-block; background: #22c55e; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Accéder à Mon Espace
          </a>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Nouvel accès élection - ${instanceName}`,
    html,
    fromName: instanceName,
  });
}

// Template email pour reinitialisation de mot de passe admin/observateur
export function getPasswordResetTemplate(
  email: string,
  newPassword: string,
  role: 'admin' | 'observer',
  instanceName?: string
): string {
  const roleLabel = role === 'admin' ? 'Administrateur' : 'Observateur';
  const roleColor = role === 'admin' ? '#3b82f6' : '#eab308';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nouveau mot de passe MDev_Election</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MDev_Election</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Reinitialisation de mot de passe</p>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <div style="background: ${roleColor}15; border-left: 4px solid ${roleColor}; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: ${roleColor}; font-weight: bold; font-size: 16px;">
            Compte ${roleLabel}
          </p>
          ${instanceName ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Instance: ${instanceName}</p>` : ''}
        </div>

        <h2 style="color: #1f2937; margin-top: 0;">Mot de passe reinitialise</h2>

        <p>Votre mot de passe a ete reinitialise par un administrateur. Voici vos nouveaux identifiants de connexion :</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Email</td>
              <td style="padding: 10px 0; font-weight: bold; color: #1f2937;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Nouveau mot de passe</td>
              <td style="padding: 10px 0; border-top: 1px solid #e5e7eb; font-weight: bold; color: #22c55e; font-size: 18px; letter-spacing: 2px;">${newPassword}</td>
            </tr>
          </table>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Important :</strong> Ce code a 6 chiffres est votre nouveau mot de passe. Conservez-le en lieu sur.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://election.mouhadev.com'}"
             style="display: inline-block; background: #22c55e; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Se connecter
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Si vous n'avez pas demande cette reinitialisation, veuillez contacter immediatement votre administrateur.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MDev_Election - Tous droits reserves</p>
      </div>
    </body>
    </html>
  `;
}

// Envoyer email de reinitialisation de mot de passe
export async function sendPasswordResetEmail(
  to: string,
  newPassword: string,
  role: 'admin' | 'observer',
  instanceName?: string
): Promise<{ success: boolean; error?: string }> {
  const roleLabel = role === 'admin' ? 'Administrateur' : 'Observateur';
  const html = getPasswordResetTemplate(to, newPassword, role, instanceName);

  return sendEmail({
    to,
    subject: `Nouveau mot de passe ${roleLabel} - MDev_Election${instanceName ? ` - ${instanceName}` : ''}`,
    html,
    fromName: instanceName || 'MDev_Election',
  });
}



// Envoyer le lien de réinitialisation/définition de mot de passe (Mot de passe oublié)
export async function sendPasswordResetLinkEmail(
  to: string,
  resetLink: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Réinitialisation de mot de passe</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MDev_Election</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Réinitialisation de votre mot de passe</p>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; margin-top: 0;">Bonjour,</h2>
        <p>Vous avez demandé la réinitialisation (ou la définition) de votre mot de passe pour accéder à votre espace MDev_Election.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}"
             style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Définir / Réinitialiser mon mot de passe
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MDev_Election - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Réinitialisation de votre mot de passe - MDev_Election',
    html,
    fromName: 'MDev_Election',
  });
}

// Envoyer email de bienvenue à la création de compte
export async function sendRegistrationWelcomeEmail(
  to: string
): Promise<{ success: boolean; error?: string }> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://election.mouhadev.com'}/login`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bienvenue sur MDev_Election</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Bienvenue sur MDev_Election</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; margin-top: 0;">Votre compte a été créé avec succès !</h2>
        <p>Vous pouvez maintenant vous connecter à votre espace personnel et accéder à vos différentes élections ou créer votre premier scrutin.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}"
             style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Accéder à Mon Espace
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MDev_Election - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Bienvenue sur MDev_Election - Compte créé avec succès',
    html,
    fromName: 'MDev_Election',
  });
}

// Envoyer email de confirmation à l'inscription avec lien d'activation
export async function sendEmailConfirmationLink(
  to: string,
  confirmationLink: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Confirmez votre adresse email - MDev_Election</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MDev_Election</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Confirmation d'adresse email</p>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; margin-top: 0;">Bienvenue !</h2>
        <p>Merci de vous être inscrit sur MDev_Election. Veuillez valider votre adresse email pour activer votre compte et accéder à votre espace.</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${confirmationLink}"
             style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.3);">
            Confirmer mon compte & accéder à mon espace
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
          Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email en toute sécurité.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MDev_Election - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Confirmez votre adresse email - MDev_Election',
    html,
    fromName: 'MDev_Election',
  });
}

