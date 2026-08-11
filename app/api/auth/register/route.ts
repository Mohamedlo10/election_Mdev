import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendRegistrationWelcomeEmail } from '@/lib/services/email.service';

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
 * Inscription d'un nouvel utilisateur (administrateur potentiel)
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

    // 1. Vérifier si l'utilisateur existe déjà dans auth
    const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      return NextResponse.json({
        error: 'Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.'
      }, { status: 400 });
    }

    // 2. Créer le compte d'authentification
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
    });

    if (createError) {
      console.error('[API Register] Auth create error:', createError);
      return NextResponse.json({ error: createError.message || 'Erreur lors de la création du compte' }, { status: 500 });
    }

    const userId = authData.user.id;

    // 3. Envoyer un email de bienvenue / confirmation via Nodemailer SMTP
    await sendRegistrationWelcomeEmail(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès !',
      credentials: {
        email: normalizedEmail,
        password: password,
      },
    });

  } catch (error) {
    console.error('[API Register] Error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
