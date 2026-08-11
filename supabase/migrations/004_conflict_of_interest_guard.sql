-- ============================================
-- Migration 004 : Garde-fou contre les conflits d'intérêts
-- Date : 2026-08-11
-- Dépendance : Migration 001 (rôle manager dans l'ENUM)
-- Description :
--   Empêche qu'un admin ou manager d'une instance soit aussi
--   inscrit comme votant sur cette même instance.
--   Implémenté via un trigger BEFORE INSERT/UPDATE sur la table voters.
-- ============================================

-- -----------------------------------------
-- Fonction utilitaire de vérification (appelable directement)
-- -----------------------------------------
CREATE OR REPLACE FUNCTION check_conflict_of_interest(
  p_user_id    UUID,
  p_instance_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  has_admin_role BOOLEAN;
  has_voter_entry BOOLEAN;
BEGIN
  -- Vérifie si l'utilisateur est admin ou manager de l'instance
  SELECT EXISTS (
    SELECT 1 FROM users_roles
    WHERE user_id = p_user_id
      AND instance_id = p_instance_id
      AND role IN ('admin', 'manager')
  ) INTO has_admin_role;

  -- Vérifie si l'utilisateur est déjà inscrit comme votant
  SELECT EXISTS (
    SELECT 1 FROM voters
    WHERE auth_uid = p_user_id
      AND instance_id = p_instance_id
  ) INTO has_voter_entry;

  -- Retourne TRUE s'il y a conflit
  RETURN has_admin_role AND has_voter_entry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_conflict_of_interest(UUID, UUID) TO authenticated;

-- -----------------------------------------
-- Fonction trigger : appelée avant INSERT/UPDATE sur voters
-- Vérifie par email si l'ajout crée un conflit sur la même instance
-- -----------------------------------------
CREATE OR REPLACE FUNCTION trg_prevent_admin_as_voter()
RETURNS TRIGGER AS $$
DECLARE
  conflicting_user_id UUID;
  conflicting_role    TEXT;
  existing_user_id    UUID;
BEGIN
  -- 1. Chercher si l'email du votant correspond à un admin/manager sur la même instance
  SELECT u.id, ur.role::TEXT
  INTO conflicting_user_id, conflicting_role
  FROM auth.users u
  JOIN users_roles ur ON ur.user_id = u.id
  WHERE lower(u.email) = lower(NEW.email)
    AND ur.instance_id = NEW.instance_id
    AND ur.role IN ('admin', 'manager')
  LIMIT 1;

  IF conflicting_user_id IS NOT NULL THEN
    RAISE EXCEPTION
      'CONFLICT_OF_INTEREST: L''utilisateur % est % de cette instance et ne peut pas être ajouté comme votant. '
      'Retirez son rôle administratif ou utilisez une autre adresse email.',
      NEW.email,
      conflicting_role;
  END IF;

  -- 2. Si l'utilisateur a déjà un compte dans auth.users, lier automatiquement son auth_uid
  IF NEW.auth_uid IS NULL THEN
    SELECT id INTO existing_user_id
    FROM auth.users
    WHERE lower(email) = lower(NEW.email)
    LIMIT 1;

    IF existing_user_id IS NOT NULL THEN
      NEW.auth_uid := existing_user_id;
      NEW.is_registered := TRUE;
      IF NEW.registered_at IS NULL THEN
        NEW.registered_at := NOW();
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger existant s'il est déjà présent
DROP TRIGGER IF EXISTS prevent_admin_as_voter ON voters;

-- Créer le trigger sur la table voters
-- Se déclenche AVANT chaque INSERT ou UPDATE (notamment changement d'email)
CREATE TRIGGER prevent_admin_as_voter
  BEFORE INSERT OR UPDATE OF email, instance_id ON voters
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_admin_as_voter();

COMMENT ON FUNCTION trg_prevent_admin_as_voter IS
  'Trigger de garde-fou : empêche qu''un admin ou manager soit ajouté comme votant '
  'sur la même instance. Vérifie par email dans auth.users.';

COMMENT ON FUNCTION check_conflict_of_interest IS
  'Retourne TRUE si l''utilisateur (par auth_uid) est à la fois admin/manager ET votant '
  'sur la même instance. Utilisé pour afficher des avertissements côté API.';
