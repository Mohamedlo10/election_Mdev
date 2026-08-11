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
 * Inscription d'un nouvel utilisateur (ou activation d'un utilisateur pré-invité).
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

    // 1. Vérifier si l'utilisateur existe déjà dans Supabase Auth (ex: pré-invité dans une équipe ou votant)
    const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      // Mettre à jour le mot de passe du compte existant (Auto-Réconciliation)
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        {
          password: password,
          email_confirm: true,
        }
      );

      if (updateError) {
        console.error('[API Register] Auth update error:', updateError);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour du mot de passe' }, { status: 500 });
      }

      // Envoyer un email de bienvenue
      await sendRegistrationWelcomeEmail(normalizedEmail);

      return NextResponse.json({
        success: true,
        message: 'Compte activé avec succès !',
        credentials: {
          email: normalizedEmail,
          password: password,
        },
      });
    }

    // 2. Créer un nouveau compte d'authentification s'il n'existe pas encore
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
    });

    if (createError) {
      console.error('[API Register] Auth create error:', createError);
      return NextResponse.json({ error: createError.message || 'Erreur lors de la création du compte' }, { status: 500 });
    }

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
