import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOtpEmail } from '@/lib/services/email.service';

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

// Fonction utilitaire pour créer ou récupérer un compte auth
async function ensureAuthAccount(supabase: any, email: string, voterId: string) {
  try {
    // Vérifier si le voter a déjà un auth_uid
    const { data: voterData } = await supabase
      .from('voters')
      .select('auth_uid, is_registered')
      .eq('id', voterId)
      .single();

    if (voterData?.auth_uid) {
      // Compte déjà créé
      return { authUid: voterData.auth_uid, created: false };
    }

    // Générer un mot de passe temporaire
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    let authUid: string;

    // Tenter de créer un nouveau compte
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      // Si l'utilisateur existe déjà dans auth, le récupérer
      if (authError.code === 'email_exists') {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

        if (existingUser) {
          authUid = existingUser.id;
          // Mettre à jour le mot de passe
          await supabase.auth.admin.updateUserById(authUid, {
            password: tempPassword,
          });
        } else {
          throw authError;
        }
      } else {
        throw authError;
      }
    } else {
      authUid = authData.user.id;
    }

    // Lier le compte auth au voter (inscription automatique)
    const { error: linkError } = await supabase
      .from('voters')
      .update({
        auth_uid: authUid,
        is_registered: true,
        registered_at: new Date().toISOString(),
      })
      .eq('id', voterId);

    if (linkError) {
      console.error('Link error:', linkError);
      throw linkError;
    }

    return { authUid, created: true };

  } catch (error) {
    console.error('Auth account creation error:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Vérifier si c'est un admin/observer (via fonction SQL)
    const { data: adminData } = await supabase
      .rpc('check_admin_email', { p_email: normalizedEmail });

    const adminCheck = adminData?.[0];

    if (adminCheck && adminCheck.is_admin) {
      // C'est un admin/observer → demander mot de passe
      return NextResponse.json({
        success: true,
        user_type: 'admin',
        message: 'Utilisateur administrateur détecté',
      });
    }

    // 2. Vérifier le voter et le statut de l'élection
    const { data: existingData } = await supabase
      .rpc('check_existing_otp', { p_email: normalizedEmail });

    const existingCheck = existingData?.[0];

    // Si voter non trouvé
    if (!existingCheck || !existingCheck.voter_id) {
      return NextResponse.json(
        { error: 'Email non trouvé' },
        { status: 404 }
      );
    }

    // 3. Gérer selon le statut de l'élection
    if (existingCheck.instance_status === 'active') {
      // ÉLECTION ACTIVE - Fonctionnement normal
      
      // Créer automatiquement le compte auth
      try {
        await ensureAuthAccount(supabase, normalizedEmail, existingCheck.voter_id);
      } catch (error) {
        console.error('Failed to ensure auth account:', error);
        // Continue quand même, l'inscription se fera lors de la vérification du code
      }

      // Vérifier si un code valide existe déjà
      if (existingCheck.has_valid_code) {
        return NextResponse.json({
          success: true,
          user_type: 'voter',
          has_existing_code: true,
          minutes_remaining: existingCheck.minutes_remaining,
          message: `Votre code précédent est toujours valide (${existingCheck.minutes_remaining} min restantes)`,
        });
      }

      // Vérifier le rate limiting
      const { data: checkData } = await supabase
        .rpc('can_send_otp', { p_email: normalizedEmail });

      const rateCheck = checkData?.[0];

      if (rateCheck && !rateCheck.allowed) {
        return NextResponse.json(
          {
            error: `Veuillez patienter ${rateCheck.wait_seconds} secondes avant de demander un nouveau code`,
            wait_seconds: rateCheck.wait_seconds,
            user_type: 'voter',
          },
          { status: 429 }
        );
      }

      // Générer et envoyer un nouveau code
      const { data: otpData, error: otpError } = await supabase
        .rpc('generate_voter_otp', { p_voter_id: existingCheck.voter_id });

      if (otpError || !otpData?.[0]) {
        console.error('OTP error:', otpError);
        return NextResponse.json(
          { error: 'Erreur lors de la génération du code' },
          { status: 500 }
        );
      }

      const otp = otpData[0];

      // Envoyer l'email
      const emailResult = await sendOtpEmail(
        normalizedEmail,
        existingCheck.full_name,
        otp.code,
        existingCheck.instance_name
      );

      if (!emailResult.success) {
        console.error('Email error:', emailResult.error);
        return NextResponse.json(
          { error: 'Erreur lors de l\'envoi de l\'email. Réessayez dans quelques instants.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        user_type: 'voter',
        has_existing_code: false,
        message: 'Code envoyé par email',
        expires_in: 18000, // 5 heures en secondes
      });

    } else if (existingCheck.instance_status === 'completed' || existingCheck.instance_status === 'archived') {
      // ÉLECTION TERMINÉE - Le dernier code est toujours valide (pas de vérification d'expiration)

      // Créer automatiquement le compte auth si pas déjà fait
      try {
        await ensureAuthAccount(supabase, normalizedEmail, existingCheck.voter_id);
      } catch (error) {
        console.error('Failed to ensure auth account:', error);
      }

      // Pour les élections terminées, on vérifie juste s'il y a eu un code envoyé
      const { data: voterData } = await supabase
        .from('voters')
        .select('login_code')
        .eq('id', existingCheck.voter_id)
        .single();

      if (voterData?.login_code) {
        // Il y a un code (même expiré) - dire qu'il est valide pour consulter les résultats
        return NextResponse.json({
          success: true,
          user_type: 'voter',
          election_ended: true,
          has_existing_code: true,
          instance_name: existingCheck.instance_name,
          message: `L'élection "${existingCheck.instance_name}" est terminée. Votre dernier code est toujours valide pour consulter les résultats.`,
        });
      } else {
        // Aucun code n'a jamais été envoyé
        return NextResponse.json({
          success: true,
          user_type: 'voter',
          election_ended: true,
          has_existing_code: false,
          instance_name: existingCheck.instance_name,
          message: `L'élection "${existingCheck.instance_name}" est terminée. Aucun code n'a été envoyé. Contactez l'administrateur pour accéder aux résultats.`,
        });
      }

    } else {
      // ÉLECTION PAS ENCORE DÉMARRÉE (draft ou paused)
      return NextResponse.json({
        success: true,
        user_type: 'voter',
        election_not_started: true,
        instance_name: existingCheck.instance_name,
        message: `Vous êtes bien inscrit pour "${existingCheck.instance_name}". Votre code de connexion vous sera envoyé par email dès que l'élection démarrera.`,
      });
    }

  } catch (error) {
    console.error('Request code error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
