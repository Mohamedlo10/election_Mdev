-- ============================================
-- Migration 008 : Fonction RPC complète get_user_instances
-- Date : 2026-08-14
-- Description :
--   Auto-lie automatiquement les comptes auth aux entrées voters et users_roles par email
--   et retourne la totalité des instances administrées et scrutins de vote d'un utilisateur.
-- ============================================

-- 1. Supprimer les anciennes signatures de la fonction pour éviter le conflit de type de retour
DROP FUNCTION IF EXISTS get_user_instances(UUID);
DROP FUNCTION IF EXISTS get_user_instances(UUID, TEXT);

-- 2. Créer la fonction unifiée
CREATE OR REPLACE FUNCTION get_user_instances(
  p_user_id UUID,
  p_email   TEXT DEFAULT NULL
)
RETURNS TABLE (
  context         TEXT,
  instance_id     UUID,
  instance_name   VARCHAR,
  instance_status election_status,
  logo_url        TEXT,
  primary_color   VARCHAR,
  user_role       TEXT,
  voter_id        UUID,
  is_registered   BOOLEAN
) AS $$
DECLARE
  v_norm_email TEXT;
BEGIN
  v_norm_email := lower(trim(coalesce(p_email, '')));

  -- 1. Auto-liaison automatique des comptes dans voters et users_roles
  IF p_user_id IS NOT NULL AND v_norm_email <> '' THEN
    BEGIN
      UPDATE voters
      SET auth_uid = p_user_id,
          is_registered = TRUE,
          registered_at = COALESCE(registered_at, NOW())
      WHERE lower(trim(email)) = v_norm_email
        AND (auth_uid IS NULL OR auth_uid <> p_user_id);
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore to avoid breaking query
    END;

    BEGIN
      UPDATE users_roles
      SET user_id = p_user_id
      WHERE lower(trim(email)) = v_norm_email
        AND (user_id IS NULL OR user_id <> p_user_id);
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore
    END;
  END IF;

  -- 2. Retourner les instances administrées (admin, manager, observer)
  RETURN QUERY
  SELECT DISTINCT ON (ei.id)
    'admin_instance'::TEXT AS context,
    ei.id                  AS instance_id,
    ei.name                AS instance_name,
    ei.status              AS instance_status,
    ei.logo_url            AS logo_url,
    ei.primary_color       AS primary_color,
    ur.role::TEXT          AS user_role,
    NULL::UUID             AS voter_id,
    NULL::BOOLEAN          AS is_registered
  FROM users_roles ur
  JOIN election_instances ei ON ei.id = ur.instance_id
  WHERE (
    (p_user_id IS NOT NULL AND ur.user_id = p_user_id)
    OR (v_norm_email <> '' AND lower(trim(ur.email)) = v_norm_email)
  )
  AND ur.role IN ('admin', 'manager', 'observer')

  UNION ALL

  -- 3. Retourner TOUTES les instances où l'utilisateur est inscrit comme électeur (Scrutin 1, Scrutin 2, etc.)
  SELECT DISTINCT ON (ei.id)
    'voter_instance'::TEXT AS context,
    ei.id                  AS instance_id,
    ei.name                AS instance_name,
    ei.status              AS instance_status,
    ei.logo_url            AS logo_url,
    ei.primary_color       AS primary_color,
    'voter'::TEXT          AS user_role,
    v.id                   AS voter_id,
    v.is_registered        AS is_registered
  FROM voters v
  JOIN election_instances ei ON ei.id = v.instance_id
  WHERE (
    (p_user_id IS NOT NULL AND v.auth_uid = p_user_id)
    OR (v_norm_email <> '' AND lower(trim(v.email)) = v_norm_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_user_instances(UUID, TEXT) TO authenticated, anon, service_role;

COMMENT ON FUNCTION get_user_instances IS
  'Auto-lie les comptes et renvoie l ensemble des scrutins et rôles d un utilisateur par ID et email.';
