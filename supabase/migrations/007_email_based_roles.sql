-- ============================================
-- Migration 007 : Association par email dans users_roles & Auto-liaison
-- Date : 2026-08-11
-- Description :
--   Stocke l'email directement dans users_roles pour permettre l'invitation d'équipe
--   sans créer de compte auth forcé. Rend user_id optionnel (NULLABLE).
--   Raccorde automatiquement les rôles et votes lors de l'inscription.
-- ============================================

-- 1. Ajouter la colonne email à users_roles et rendre user_id NULLABLE
ALTER TABLE users_roles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users_roles ALTER COLUMN user_id DROP NOT NULL;

-- 2. Remplir rétroactivement la colonne email pour les lignes existantes
UPDATE users_roles ur
SET email = lower(u.email)
FROM auth.users u
WHERE ur.user_id = u.id AND (ur.email IS NULL OR ur.email = '');

-- 3. Contrainte d'unicité sur (instance_id, email)
ALTER TABLE users_roles DROP CONSTRAINT IF EXISTS users_roles_user_id_instance_id_key;
ALTER TABLE users_roles DROP CONSTRAINT IF EXISTS users_roles_instance_email_key;

-- Ajouter l'index unique pour (instance_id, email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_roles_instance_email
  ON users_roles(instance_id, lower(email))
  WHERE instance_id IS NOT NULL;

-- 4. Fonction RPC get_user_instances mise à jour (prend en compte p_email)
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
  user_role       user_role,
  voter_id        UUID,
  is_registered   BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  -- Élections où l'utilisateur a un rôle d'équipe (admin, manager, observer)
  SELECT
    'admin_instance'::TEXT AS context,
    ei.id                  AS instance_id,
    ei.name                AS instance_name,
    ei.status              AS instance_status,
    ei.logo_url            AS logo_url,
    ei.primary_color       AS primary_color,
    ur.role                AS user_role,
    NULL::UUID             AS voter_id,
    NULL::BOOLEAN          AS is_registered
  FROM users_roles ur
  JOIN election_instances ei ON ei.id = ur.instance_id
  WHERE (ur.user_id = p_user_id OR (p_email IS NOT NULL AND lower(ur.email) = lower(p_email)))
    AND ur.role IN ('admin', 'manager', 'observer')

  UNION ALL

  -- Élections où l'utilisateur est inscrit comme votant
  SELECT
    'voter_instance'::TEXT AS context,
    ei.id                  AS instance_id,
    ei.name                AS instance_name,
    ei.status              AS instance_status,
    ei.logo_url            AS logo_url,
    ei.primary_color       AS primary_color,
    'voter'::user_role     AS user_role,
    v.id                   AS voter_id,
    v.is_registered        AS is_registered
  FROM voters v
  JOIN election_instances ei ON ei.id = v.instance_id
  WHERE (v.auth_uid = p_user_id OR (p_email IS NOT NULL AND lower(v.email) = lower(p_email)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger d'auto-liaison lors de la création d'un compte sur auth.users (sécurisé avec gestion d'erreurs)
CREATE OR REPLACE FUNCTION trg_auto_link_user_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    -- Lier les rôles d'équipe correspondants à cet email
    BEGIN
      UPDATE users_roles
      SET user_id = NEW.id
      WHERE lower(email) = lower(NEW.email) AND (user_id IS NULL OR user_id != NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Auto-link users_roles error: %', SQLERRM;
    END;

    -- Lier les entrées de votants correspondantes à cet email
    BEGIN
      UPDATE voters
      SET auth_uid = NEW.id,
          is_registered = TRUE,
          registered_at = COALESCE(registered_at, NOW())
      WHERE lower(email) = lower(NEW.email) AND (auth_uid IS NULL OR auth_uid != NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Auto-link voters error: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attacher le trigger sur auth.users s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created_link ON auth.users;
CREATE TRIGGER on_auth_user_created_link
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_link_user_on_signup();
