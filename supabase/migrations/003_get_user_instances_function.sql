-- ============================================
-- Migration 003 : Fonction get_user_instances
-- Date : 2026-08-11
-- Dépendance : Migration 001 (rôle manager dans l'ENUM)
-- Description :
--   Retourne toutes les instances associées à un utilisateur,
--   que ce soit en tant qu'admin/manager/observer ou en tant que votant.
--   Utilisée par le Dashboard Unifié (Hub).
-- ============================================

CREATE OR REPLACE FUNCTION get_user_instances(p_user_id UUID)
RETURNS TABLE (
  context          TEXT,            -- 'admin_instance' | 'voter_instance'
  instance_id      UUID,
  instance_name    VARCHAR,
  instance_status  election_status,
  logo_url         TEXT,
  primary_color    VARCHAR,
  user_role        TEXT,            -- 'admin' | 'manager' | 'observer' | 'voter'
  voter_id         UUID,            -- NULL si rôle admin/manager/observer
  is_registered    BOOLEAN          -- NULL si rôle admin/manager/observer
) AS $$
BEGIN
  -- -----------------------------------------
  -- 1. Instances administrées (via users_roles)
  --    Inclut : admin, manager, observer
  --    Exclut : super_admin (instance_id IS NULL pour eux)
  -- -----------------------------------------
  RETURN QUERY
  SELECT
    'admin_instance'::TEXT        AS context,
    ei.id                         AS instance_id,
    ei.name                       AS instance_name,
    ei.status                     AS instance_status,
    ei.logo_url                   AS logo_url,
    ei.primary_color              AS primary_color,
    ur.role::TEXT                 AS user_role,
    NULL::UUID                    AS voter_id,
    NULL::BOOLEAN                 AS is_registered
  FROM users_roles ur
  JOIN election_instances ei ON ei.id = ur.instance_id
  WHERE ur.user_id = p_user_id
    AND ur.role IN ('admin', 'manager', 'observer')
    AND ur.instance_id IS NOT NULL
  ORDER BY ei.created_at DESC;

  -- -----------------------------------------
  -- 2. Instances de vote (via voters)
  --    Retourne toutes les instances où l'utilisateur est
  --    inscrit comme votant, quel que soit le statut de l'élection.
  -- -----------------------------------------
  RETURN QUERY
  SELECT
    'voter_instance'::TEXT        AS context,
    ei.id                         AS instance_id,
    ei.name                       AS instance_name,
    ei.status                     AS instance_status,
    ei.logo_url                   AS logo_url,
    ei.primary_color              AS primary_color,
    'voter'::TEXT                 AS user_role,
    v.id                          AS voter_id,
    v.is_registered               AS is_registered
  FROM voters v
  JOIN election_instances ei ON ei.id = v.instance_id
  WHERE v.auth_uid = p_user_id
  ORDER BY ei.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder l'exécution aux utilisateurs authentifiés
-- (SECURITY DEFINER permet de bypasser le RLS côté DB,
--  la vérification se fait par le filtre p_user_id = auth.uid() côté API)
GRANT EXECUTE ON FUNCTION get_user_instances(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_instances IS
  'Retourne toutes les instances associées à un utilisateur : '
  'celles qu''il administre (admin/manager/observer) et celles où il vote. '
  'Utilisée par le Dashboard Unifié pour afficher le sélecteur d''espace.';
