import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCodeEmail } from '@/lib/services/email.service';

// Créer un client Supabase admin pour contourner RLS
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

// Générer un code à 6 chiffres
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    // Vérifier si l'email est dans la liste des votants
    const { data: voterData, error: voterError } = await supabase
      .from('voters')
      .select(`
        id,
        full_name,
        is_registered,
        instance_id,
        election_instances (
          id,
          name,
          status
        )
      `)
      .eq('email', email.toLowerCase())
      .single();

    if (voterError || !voterData) {
      return NextResponse.json(
        { error: 'Email non trouvé dans la liste des votants autorisés' },
        { status: 404 }
      );
    }

    // Vérifier si déjà inscrit
    if (voterData.is_registered) {
      return NextResponse.json(
        { error: 'Ce compte est déjà inscrit. Utilisez la page de connexion.' },
        { status: 400 }
      );
    }

    // Vérifier le statut de l'instance
    const instance = voterData.election_instances as { id: string; name: string; status: string };
    if (!instance || !['draft', 'active', 'paused'].includes(instance.status)) {
      return NextResponse.json(
        { error: 'Cette élection n\'est plus disponible pour l\'inscription' },
        { status: 400 }
      );
    }

    // Générer le code
    const code = generateCode();

    // Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: code,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    // Mettre à jour le votant avec l'auth_uid
    const { error: updateError } = await supabase
      .from('voters')
      .update({
        auth_uid: authData.user.id,
        is_registered: true,
        registered_at: new Date().toISOString(),
      })
      .eq('id', voterData.id);

    if (updateError) {
      console.error('Update error:', updateError);
      // Supprimer le compte auth créé
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement' },
        { status: 500 }
      );
    }

    // Envoyer l'email avec le code
    const emailResult = await sendCodeEmail(
      email.toLowerCase(),
      voterData.full_name,
      code,
      instance.name
    );

    if (!emailResult.success) {
      console.error('Email error:', emailResult.error);
      // Ne pas annuler l'inscription, juste logger
    }

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès. Vérifiez votre email pour obtenir votre code de connexion.',
      instanceName: instance.name,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
