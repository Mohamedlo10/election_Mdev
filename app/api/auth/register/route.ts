import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmailConfirmationLink } from '@/lib/services/email.service';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur avec envoi d'email de confirmation.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Adresse email requise' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminClient = createAdminClient();

    // Déterminer l'URL publique de l'application
    const hardcodedUrl = 'https://election.mouhadev.com';
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || hardcodedUrl).replace(/\/$/, '');

    // 1. Vérifier si l'utilisateur existe déjà dans Supabase Auth
    const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser && existingUser.email_confirmed_at) {
      return NextResponse.json({
        error: 'Un compte confirmé existe déjà avec cet email. Veuillez vous connecter.'
      }, { status: 400 });
    }

    // 2. Générer le lien de confirmation Supabase (crée l'utilisateur ou régénère le lien s'il n'est pas encore confirmé)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email: normalizedEmail,
      password: password,
      options: {
        redirectTo: `${appUrl}/auth/confirm`,
      },
    });

    if (linkError || !linkData?.properties) {
      console.error('[API Register] Generate link error:', linkError);
      return NextResponse.json({ error: linkError?.message || 'Erreur lors de la création du lien de confirmation' }, { status: 500 });
    }

    let confirmationLink: string;
    if (linkData.properties.hashed_token) {
      // Lien direct vers notre application : pointe directement sur https://election.mouhadev.com/auth/confirm
      confirmationLink = `${appUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=signup&next=/dashboard`;
    } else {
      let actionLink = linkData.properties.action_link || '';
      actionLink = actionLink
        .replace(/https?%3A%2F%2F(localhost|127\.0\.0\.1)(%3A\d+)?/gi, encodeURIComponent(appUrl))
        .replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi, appUrl);
      confirmationLink = actionLink;
    }

    // 3. Transmettre le lien dans un email SMTP personnalisé
    const emailResult = await sendEmailConfirmationLink(normalizedEmail, confirmationLink);

    if (!emailResult.success) {
      console.error('[API Register] Send email error:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      confirmation_required: true,
      email: normalizedEmail,
      message: 'Un email de confirmation vous a été envoyé. Veuillez cliquer sur le lien dans le mail pour activer votre compte.',
    });

  } catch (error) {
    console.error('[API Register] Error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
