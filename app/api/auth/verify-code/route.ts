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

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email et code requis' },
        { status: 400 }
      );
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Le code doit contenir 6 chiffres' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Vérifier le code OTP
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('verify_voter_otp', {
        p_email: normalizedEmail,
        p_code: code
      });

    if (verifyError) {
      console.error('Verify error:', verifyError);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      );
    }

    const result = verifyData?.[0];

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error_message || 'Code invalide' },
        { status: 401 }
      );
    }

    // Récupérer les infos du votant avec son compte auth
    const { data: voterData, error: voterError } = await supabase
      .from('voters')
      .select('auth_uid, is_registered')
      .eq('id', result.voter_id)
      .single();

    if (voterError || !voterData?.auth_uid) {
      // Si pas de compte auth, le créer maintenant (fallback)
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();
      
      let userId: string;

      // Tenter de créer le compte
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
      });

      if (authError) {
        if (authError.code === 'email_exists') {
          // Récupérer l'utilisateur existant
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find((u: any) => u.email === normalizedEmail);

          if (existingUser) {
            userId = existingUser.id;
            await supabase.auth.admin.updateUserById(userId, {
              password: tempPassword,
            });
          } else {
            return NextResponse.json(
              { error: 'Erreur lors de la création du compte' },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Erreur lors de la création du compte' },
            { status: 500 }
          );
        }
      } else {
        userId = authData.user.id;
      }

      // Lier le compte au votant
      await supabase
        .from('voters')
        .update({
          auth_uid: userId,
          is_registered: true,
          registered_at: new Date().toISOString(),
        })
        .eq('id', result.voter_id);

      // Retourner les credentials
      return NextResponse.json({
        success: true,
        userId,
        voter_id: result.voter_id,
        instance_id: result.instance_id,
        full_name: result.full_name,
        credentials: {
          email: normalizedEmail,
          password: tempPassword,
        }
      });
    }

    // Le compte existe déjà, générer un nouveau mot de passe temporaire
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(voterData.auth_uid, {
      password: tempPassword,
    });

    if (updateError) {
      console.error('Update password error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du compte' },
        { status: 500 }
      );
    }

    // Retourner les credentials pour que le client se connecte
    return NextResponse.json({
      success: true,
      userId: voterData.auth_uid,
      voter_id: result.voter_id,
      instance_id: result.instance_id,
      full_name: result.full_name,
      credentials: {
        email: normalizedEmail,
        password: tempPassword,
      }
    });

  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
