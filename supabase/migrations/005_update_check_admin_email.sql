-- ============================================
-- Migration 005 : Mise à jour de check_admin_email
-- Date : 2026-08-11
-- Dépendance : Migration 001 (rôle manager dans l'ENUM)
-- Description :
--   La fonction existante check_admin_email est utilisée par l'API
--   /api/auth/request-code pour détecter si un email appartient
--   à un administrateur et lui proposer la connexion par mot de passe.
--   On l'étend pour inclure le rôle 'manager'.
-- ============================================

DROP FUNCTION IF EXISTS check_admin_email(TEXT);

CREATE OR REPLACE FUNCTION check_admin_email(p_email TEXT)
RETURNS TABLE (
  is_admin    BOOLEAN,
  user_id     UUID,
  role        user_role,
  instance_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE                AS is_admin,
    ur.user_id          AS user_id,
    ur.role             AS role,
    ur.instance_id      AS instance_id
  FROM auth.users u
  JOIN users_roles ur ON ur.user_id = u.id
  WHERE lower(u.email) = lower(p_email)
    AND ur.role IN ('super_admin', 'admin', 'manager', 'observer')
  ORDER BY
    -- Priorité : super_admin > admin > manager > observer
    CASE ur.role
      WHEN 'super_admin' THEN 1
      WHEN 'admin'       THEN 2
      WHEN 'manager'     THEN 3
      WHEN 'observer'    THEN 4
      ELSE 5
    END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_admin_email IS
  'Vérifie si un email correspond à un utilisateur avec un rôle administratif '
  '(super_admin, admin, manager, observer). Utilisé pour orienter le flux de connexion. '
  'Mise à jour v2 : inclut le rôle manager.';
