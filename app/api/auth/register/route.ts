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

    // Détecter l'URL publique de l'application
    const reqOrigin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/$/, '');
    const reqHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const reqProto = request.headers.get('x-forwarded-proto') || 'https';
    
    let derivedAppUrl = process.env.NEXT_PUBLIC_APP_URL || reqOrigin;
    if (!derivedAppUrl && reqHost) {
      derivedAppUrl = `${reqProto}://${reqHost}`;
    }
    const appUrl = (derivedAppUrl || 'https://election.mouhadev.com').replace(/\/$/, '');

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

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[API Register] Generate link error:', linkError);
      return NextResponse.json({ error: linkError?.message || 'Erreur lors de la création du lien de confirmation' }, { status: 500 });
    }

    let confirmationLink = linkData.properties.action_link;
    if (appUrl.includes('mouhadev.com')) {
      confirmationLink = confirmationLink
        .replace('http://localhost:3000', appUrl)
        .replace('http://localhost:3001', appUrl);
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
