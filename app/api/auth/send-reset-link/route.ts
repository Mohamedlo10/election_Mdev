import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetLinkEmail } from '@/lib/services/email.service';

// Client Supabase admin pour bypass RLS
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
 * POST /api/auth/send-reset-link
 *
 * Flux :
 * 1. Vérifie que l'email existe (dans voters ou users_roles)
 * 2. Si votant sans compte auth → crée le compte avec mot de passe fort aléatoire (jamais exposé)
 * 3. Appelle supabase.auth.resetPasswordForEmail() → envoie un lien expirable
 * 4. Retourne { success: true }
 *
 * Corps attendu : { email: string }
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminClient = createAdminClient();

    // -----------------------------------------------
    // 1. Vérifier l'existence de l'email dans le système
    // -----------------------------------------------

    // Vérifier dans users_roles (admin/manager/observer)
    const { data: adminCheck } = await adminClient
      .rpc('check_admin_email', { p_email: normalizedEmail });

    const isAdmin = adminCheck?.[0]?.is_admin === true;

    // Vérifier dans voters si non-admin
    let voterRow: { id: string; auth_uid: string | null; instance_id: string } | null = null;
    if (!isAdmin) {
      const { data: voterData } = await adminClient
        .from('voters')
        .select('id, auth_uid, instance_id')
        .eq('email', normalizedEmail)
        .maybeSingle();
      voterRow = voterData;
    }

    if (!isAdmin && !voterRow) {
      return NextResponse.json(
        { error: 'Aucun compte associé à cet email' },
        { status: 404 }
      );
    }

    // -----------------------------------------------
    // 2. Si votant sans compte auth, en créer un (mot de passe opaque, jamais exposé)
    // -----------------------------------------------
    if (voterRow && !voterRow.auth_uid) {
      // Générer un mot de passe fort aléatoire (non exposé, uniquement pour créer le compte)
      const opaquePassword = `${crypto.randomUUID()}-${crypto.randomUUID()}-${Date.now()}`;

      // Créer le compte auth
      const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: opaquePassword,
        email_confirm: true, // Pas besoin de confirmer l'email, on envoie le reset link
      });

      if (createError && createError.code !== 'email_exists') {
        console.error('[send-reset-link] Auth create error:', createError);
        return NextResponse.json(
          { error: 'Erreur lors de la création du compte. Réessayez.' },
          { status: 500 }
        );
      }

      const authUid = authData?.user?.id;

      // Si le compte existait déjà (email_exists), récupérer l'uid
      let finalAuthUid = authUid;
      if (!finalAuthUid) {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u: { email?: string }) => u.email === normalizedEmail
        );
        finalAuthUid = existingUser?.id;
      }

      if (finalAuthUid) {
        // Lier le compte auth au voter
        await adminClient
          .from('voters')
          .update({
            auth_uid: finalAuthUid,
            is_registered: true,
            registered_at: new Date().toISOString(),
          })
          .eq('id', voterRow.id);
      }
    }

    // -----------------------------------------------
    // 3. Générer et envoyer le lien de réinitialisation via Nodemailer
    // -----------------------------------------------
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${appUrl}/reset-password`;

    let resetLink: string | null = null;

    // 1. Tenter de générer le lien de récupération Supabase Admin
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: { redirectTo },
    });

    if (linkData?.properties?.action_link) {
      resetLink = linkData.properties.action_link;
    }

    if (!resetLink) {
      // Fallback vers la méthode classique si la génération directe n'a pas renvoyé le lien
      const { error: resetError } = await adminClient.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo }
      );

      if (resetError) {
        console.error('[send-reset-link] resetPasswordForEmail error:', resetError);
        return NextResponse.json(
          { error: 'Erreur lors de l\'envoi de l\'email. Réessayez dans quelques instants.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Lien de réinitialisation envoyé par email',
      });
    }

    // 2. Envoyer le lien par email via notre service Nodemailer SMTP
    const emailResult = await sendPasswordResetLinkEmail(normalizedEmail, resetLink);

    if (!emailResult.success) {
      console.error('[send-reset-link] Email send error:', emailResult.error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email via le serveur SMTP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lien de réinitialisation envoyé par email',
    });

  } catch (error) {
    console.error('[send-reset-link] Error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
