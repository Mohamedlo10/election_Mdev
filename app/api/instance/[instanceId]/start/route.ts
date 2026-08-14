import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendPasswordResetLinkEmail } from '@/lib/services/email.service';

// Client admin pour bypass RLS
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
 * POST /api/instance/[instanceId]/start
 *
 * Lance une élection :
 * 1. Vérifie l'authentification (admin ou super_admin)
 * 2. Passe le statut à 'active' + enregistre started_at
 * 3. Pour chaque votant sans compte auth, crée un compte Supabase Auth
 * 4. Génère un lien de définition de mot de passe et l'envoie par email SMTP
 *
 * Retourne: { success, notified, already_registered, errors[] }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;

    if (!instanceId) {
      return NextResponse.json({ error: 'Instance ID requis' }, { status: 400 });
    }

    // --- Auth: vérifier l'utilisateur connecté ---
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Vérifier que l'utilisateur est admin de cette instance ou super_admin
    const { data: roleData } = await adminClient
      .from('users_roles')
      .select('role')
      .eq('user_id', user.id)
      .or(`instance_id.eq.${instanceId},role.eq.super_admin`)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    if (!roleData) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // --- 1. Récupérer l'instance et vérifier son statut ---
    const { data: instance, error: instanceError } = await adminClient
      .from('election_instances')
      .select('id, name, status')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      return NextResponse.json({ error: 'Instance introuvable' }, { status: 404 });
    }

    if (instance.status !== 'draft' && instance.status !== 'paused') {
      return NextResponse.json(
        { error: `Impossible de lancer une élection avec le statut "${instance.status}"` },
        { status: 400 }
      );
    }

    // --- 2. Passer le statut en 'active' ---
    const { error: updateError } = await adminClient
      .from('election_instances')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', instanceId);

    if (updateError) {
      console.error('[start] Update status error:', updateError);
      return NextResponse.json({ error: "Erreur lors du lancement de l'élection" }, { status: 500 });
    }

    // --- 3. Récupérer tous les votants de cette instance ---
    const { data: voters, error: votersError } = await adminClient
      .from('voters')
      .select('id, email, full_name, auth_uid')
      .eq('instance_id', instanceId);

    if (votersError) {
      console.error('[start] Voters fetch error:', votersError);
      // L'élection est déjà lancée, on retourne un succès partiel
      return NextResponse.json({
        success: true,
        notified: 0,
        already_registered: 0,
        errors: ["Erreur lors de la récupération des votants pour l'envoi des emails"],
        message: 'Élection lancée mais impossible d\'envoyer les invitations.',
      });
    }

    if (!voters || voters.length === 0) {
      return NextResponse.json({
        success: true,
        notified: 0,
        already_registered: 0,
        errors: [],
        message: 'Élection lancée. Aucun votant inscrit à notifier.',
      });
    }

    // --- 4. Déterminer l'URL de l'app ---
    const reqOrigin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/$/, '');
    const reqHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const reqProto = request.headers.get('x-forwarded-proto') || 'https';

    let derivedAppUrl = process.env.NEXT_PUBLIC_APP_URL || reqOrigin;
    if (!derivedAppUrl && reqHost) {
      derivedAppUrl = `${reqProto}://${reqHost}`;
    }
    const appUrl = (derivedAppUrl || 'https://election.mouhadev.com').replace(/\/$/, '');
    const redirectTo = `${appUrl}/reset-password`;

    // --- 5. Créer les comptes et envoyer les emails ---
    let notified = 0;
    let alreadyRegistered = 0;
    const errors: string[] = [];

    for (const voter of voters) {
      try {
        let authUid = voter.auth_uid;

        // Si le votant n'a pas encore de compte auth, en créer un
        if (!authUid) {
          // Mot de passe opaque aléatoire (jamais exposé — le votant définira le sien via le lien)
          const opaquePassword = `${crypto.randomUUID()}-${Date.now()}`;

          const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
            email: voter.email,
            password: opaquePassword,
            email_confirm: true, // Pas de confirmation d'email, on envoie le lien de reset
          });

          if (createError && createError.code !== 'email_exists') {
            console.error(`[start] Auth create error for ${voter.email}:`, createError);
            errors.push(`${voter.email}: Erreur création compte (${createError.message})`);
            continue;
          }

          authUid = authData?.user?.id ?? null;

          // Si le compte existait déjà, récupérer l'uid
          if (!authUid) {
            const { data: existingList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
            const existingUser = existingList?.users?.find(
              (u: { email?: string }) => u.email?.toLowerCase() === voter.email.toLowerCase()
            );
            authUid = existingUser?.id ?? null;
          }

          // Lier le compte auth au voter (le trigger trg_auto_link_user_on_signup peut déjà l'avoir fait)
          if (authUid) {
            await adminClient
              .from('voters')
              .update({
                auth_uid: authUid,
                is_registered: true,
                registered_at: new Date().toISOString(),
              })
              .eq('id', voter.id)
              .is('auth_uid', null); // Ne mettre à jour que si pas encore lié
          }
        } else {
          alreadyRegistered++;
        }

        // Générer le lien de définition de mot de passe
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email: voter.email,
          options: { redirectTo },
        });

        if (linkError || !linkData?.properties?.action_link) {
          console.error(`[start] Generate link error for ${voter.email}:`, linkError);
          errors.push(`${voter.email}: Erreur génération du lien`);
          continue;
        }

        // Remplacer localhost par l'URL réelle
        const resetLink = linkData.properties.action_link.replace(
          /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g,
          appUrl
        );

        // Envoyer l'email
        const emailResult = await sendPasswordResetLinkEmail(voter.email, resetLink);

        if (emailResult.success) {
          notified++;
        } else {
          console.error(`[start] Email send error for ${voter.email}:`, emailResult.error);
          errors.push(`${voter.email}: Erreur envoi email`);
        }
      } catch (voterError) {
        console.error(`[start] Unexpected error for voter ${voter.email}:`, voterError);
        errors.push(`${voter.email}: Erreur inattendue`);
      }
    }

    console.log(
      `[start] Élection "${instance.name}" lancée — ${notified} email(s) envoyé(s), ` +
      `${alreadyRegistered} déjà inscrit(s), ${errors.length} erreur(s)`
    );

    return NextResponse.json({
      success: true,
      notified,
      already_registered: alreadyRegistered,
      errors,
      message: `Élection lancée. ${notified} votant(s) notifié(s) par email.`,
    });

  } catch (error) {
    console.error('[start] Unexpected error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
