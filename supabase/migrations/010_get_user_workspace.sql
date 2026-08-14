-- ============================================
-- Migration 010 : Fonction RPC unique get_user_workspace
-- Date : 2026-08-14
-- Description :
--   Regroupe en UN seul aller-retour tout ce que /api/auth/me faisait en trois
--   requêtes (vérification super_admin, get_user_instances, fetch voters) :
--   auto-liaison des comptes, rôle primaire, scrutins administrés, scrutins de
--   vote et fiche votant. Retourne directement la forme attendue par AuthUser.
-- ============================================

CREATE OR REPLACE FUNCTION get_user_workspace(
  p_user_id UUID,
  p_email   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_norm_email  TEXT;
  v_is_super    BOOLEAN := FALSE;
  v_admin       JSONB   := '[]'::JSONB;
  v_voter       JSONB   := '[]'::JSONB;
  v_admin_count INT     := 0;
  v_voter_count INT     := 0;
  v_role        TEXT;
  v_instance_id UUID    := NULL;
  v_voter_row   JSONB   := NULL;
BEGIN
  v_norm_email := lower(trim(coalesce(p_email, '')));

  -- 1. Auto-liaison des entrées voters / users_roles créées par email
  --    avant que le compte auth n'existe (invitations, imports Excel).
  IF p_user_id IS NOT NULL AND v_norm_email <> '' THEN
    BEGIN
      UPDATE voters
      SET auth_uid      = p_user_id,
          is_registered = TRUE,
          registered_at = COALESCE(registered_at, NOW())
      WHERE lower(trim(email)) = v_norm_email
        AND (auth_uid IS NULL OR auth_uid <> p_user_id);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- ne jamais faire échouer la lecture du workspace
    END;

    BEGIN
      UPDATE users_roles
      SET user_id = p_user_id
      WHERE lower(trim(email)) = v_norm_email
        AND (user_id IS NULL OR user_id <> p_user_id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- 2. Super administrateur : accès global, pas de scrutin rattaché
  SELECT EXISTS (
    SELECT 1
    FROM users_roles ur
    WHERE ur.role = 'super_admin'
      AND (
        (p_user_id IS NOT NULL AND ur.user_id = p_user_id)
        OR (v_norm_email <> '' AND lower(trim(ur.email)) = v_norm_email)
      )
  ) INTO v_is_super;

  IF v_is_super THEN
    RETURN jsonb_build_object(
      'id',                    p_user_id,
      'email',                 p_email,
      'role',                  'super_admin',
      'instance_id',           NULL,
      'voter',                 NULL,
      'admin_instances',       '[]'::JSONB,
      'voter_instances',       '[]'::JSONB,
      'has_multiple_contexts', FALSE,
      'no_instance_yet',       FALSE
    );
  END IF;

  -- 3. Scrutins administrés (admin / manager / observer)
  WITH admin_rows AS (
    SELECT DISTINCT ON (ei.id)
      ei.id            AS instance_id,
      ei.name          AS instance_name,
      ei.status        AS instance_status,
      ei.logo_url      AS logo_url,
      ei.primary_color AS primary_color,
      ur.role::TEXT    AS role
    FROM users_roles ur
    JOIN election_instances ei ON ei.id = ur.instance_id
    WHERE (
        (p_user_id IS NOT NULL AND ur.user_id = p_user_id)
        OR (v_norm_email <> '' AND lower(trim(ur.email)) = v_norm_email)
      )
      AND ur.role IN ('admin', 'manager', 'observer')
    -- En cas de doublons sur une même instance, on garde le rôle le plus fort
    ORDER BY ei.id, CASE ur.role::TEXT
      WHEN 'admin'    THEN 1
      WHEN 'manager'  THEN 2
      WHEN 'observer' THEN 3
      ELSE 9
    END
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'context',         'admin_instance',
        'instance_id',     instance_id,
        'instance_name',   instance_name,
        'instance_status', instance_status::TEXT,
        'logo_url',        logo_url,
        'primary_color',   COALESCE(primary_color, '#22c55e'),
        'role',            role,
        'voter_id',        NULL,
        'is_registered',   NULL
      ) ORDER BY instance_name
    ), '[]'::JSONB),
    COUNT(*)
  INTO v_admin, v_admin_count
  FROM admin_rows;

  -- 4. Scrutins où l'utilisateur est inscrit comme électeur
  WITH voter_rows AS (
    SELECT DISTINCT ON (ei.id)
      ei.id            AS instance_id,
      ei.name          AS instance_name,
      ei.status        AS instance_status,
      ei.logo_url      AS logo_url,
      ei.primary_color AS primary_color,
      v.id             AS voter_id,
      v.is_registered  AS is_registered
    FROM voters v
    JOIN election_instances ei ON ei.id = v.instance_id
    WHERE (
      (p_user_id IS NOT NULL AND v.auth_uid = p_user_id)
      OR (v_norm_email <> '' AND lower(trim(v.email)) = v_norm_email)
    )
    ORDER BY ei.id, v.created_at
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'context',         'voter_instance',
        'instance_id',     instance_id,
        'instance_name',   instance_name,
        'instance_status', instance_status::TEXT,
        'logo_url',        logo_url,
        'primary_color',   COALESCE(primary_color, '#22c55e'),
        'role',            'voter',
        'voter_id',        voter_id,
        'is_registered',   COALESCE(is_registered, TRUE)
      ) ORDER BY instance_name
    ), '[]'::JSONB),
    COUNT(*)
  INTO v_voter, v_voter_count
  FROM voter_rows;

  -- 5. Rôle primaire (priorité admin > manager > observer > voter)
  IF v_admin_count > 0 THEN
    SELECT elem->>'role'
    INTO v_role
    FROM jsonb_array_elements(v_admin) AS elem
    ORDER BY CASE elem->>'role'
      WHEN 'admin'    THEN 1
      WHEN 'manager'  THEN 2
      WHEN 'observer' THEN 3
      ELSE 9
    END
    LIMIT 1;

    IF v_admin_count = 1 THEN
      v_instance_id := (v_admin->0->>'instance_id')::UUID;
    END IF;

  ELSIF v_voter_count > 0 THEN
    v_role := 'voter';
    IF v_voter_count = 1 THEN
      v_instance_id := (v_voter->0->>'instance_id')::UUID;
    END IF;

  ELSE
    -- Nouveau compte : aucun scrutin rattaché, il pourra créer le sien
    v_role := 'admin';
  END IF;

  -- 6. Fiche votant complète si un seul scrutin de vote
  IF v_role = 'voter' AND v_voter_count = 1 THEN
    SELECT to_jsonb(v)
    INTO v_voter_row
    FROM voters v
    WHERE (
        (p_user_id IS NOT NULL AND v.auth_uid = p_user_id)
        OR (v_norm_email <> '' AND lower(trim(v.email)) = v_norm_email)
      )
      AND v.instance_id = v_instance_id
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'id',                    p_user_id,
    'email',                 p_email,
    'role',                  v_role,
    'instance_id',           v_instance_id,
    'voter',                 v_voter_row,
    'admin_instances',       v_admin,
    'voter_instances',       v_voter,
    'has_multiple_contexts', (v_admin_count > 0 AND v_voter_count > 0),
    'no_instance_yet',       (v_admin_count = 0 AND v_voter_count = 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_workspace(UUID, TEXT) TO authenticated, anon, service_role;

COMMENT ON FUNCTION get_user_workspace IS
  'Retourne en un seul appel le profil complet d un utilisateur : rôle primaire, scrutins administrés, scrutins de vote et fiche votant.';
