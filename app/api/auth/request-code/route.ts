import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
 * POST /api/auth/request-code
 *
 * Nouvelle logique simplifiée :
 * 1. Si l'email est admin/manager/observer → retourne { user_type: 'admin' }
 *    (le front affiche l'étape mot de passe)
 * 2. Si l'email est dans voters :
 *    - Election active + password_set_at != null → { user_type: 'voter', password_set: true }
 *    - Election active + password_set_at IS null → { user_type: 'voter', password_set: false }
 *    - Election pas active → { election_not_started: true }
 * 3. Si l'email est dans auth.users mais ni admin ni voter → { user_type: 'admin' }
 *    (inscrit via /register sans instance assignée)
 * 4. Email inconnu → 404
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    // ──────────────────────────────────────────────────
    // 1. Vérifier si c'est un admin/manager/observer
    // ──────────────────────────────────────────────────
    const { data: adminData } = await supabase
      .rpc('check_admin_email', { p_email: normalizedEmail });

    const adminCheck = adminData?.[0];

    if (adminCheck?.is_admin) {
      return NextResponse.json({
        success: true,
        user_type: 'admin',
        message: 'Utilisateur administrateur détecté',
      });
    }

    // ──────────────────────────────────────────────────
    // 2. Vérifier si l'email est dans auth.users
    //    (compte créé via /register sans instance encore)
    // ──────────────────────────────────────────────────
    const { data: usersList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authUser = usersList?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail
    );

    if (authUser) {
      // L'utilisateur a un compte auth → connexion par mot de passe directement
      return NextResponse.json({
        success: true,
        user_type: 'admin',
        password_set: true,
        message: 'Compte existant détecté, connexion par mot de passe',
      });
    }

    // ──────────────────────────────────────────────────
    // 3. Vérifier dans la table voters
    // ──────────────────────────────────────────────────
    const { data: voterData } = await supabase
      .from('voters')
      .select('id, auth_uid, password_set_at, instance_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!voterData) {
      // Aucun compte connu
      return NextResponse.json(
        { error: 'Aucun compte associé à cet email. Vérifiez votre adresse ou inscrivez-vous.' },
        { status: 404 }
      );
    }

    // 3a. Récupérer le statut de l'élection associée
    const { data: instanceData } = await supabase
      .from('election_instances')
      .select('status, name')
      .eq('id', voterData.instance_id)
      .maybeSingle();

    // Si l'élection n'est pas active, bloquer avec info
    if (!instanceData || instanceData.status !== 'active') {
      return NextResponse.json({
        success: true,
        user_type: 'voter',
        election_not_started: true,
        instance_name: instanceData?.name || '',
        message: 'Élection pas encore démarrée',
      });
    }

    // 3b. Voter avec élection active : mot de passe défini ?
    const passwordSet = voterData.password_set_at != null;

    return NextResponse.json({
      success: true,
      user_type: 'voter',
      password_set: passwordSet,
      message: passwordSet
        ? 'Mot de passe défini, connexion par mot de passe'
        : 'Première connexion, envoi du lien de définition de mot de passe',
    });

  } catch (error) {
    console.error('[request-code] Error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
