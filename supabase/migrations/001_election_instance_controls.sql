-- Migration: Election Instance Controls
-- Description: Adds triggers to prevent modifications when election is started
-- Date: 2026-01-24

-- ============================================
-- 1. TRIGGER: Protect Categories
-- Blocks INSERT, UPDATE, DELETE when instance status != 'draft'
-- ============================================

CREATE OR REPLACE FUNCTION protect_categories_when_started()
RETURNS TRIGGER AS $$
DECLARE
  v_status election_status;
  v_instance_id UUID;
BEGIN
  -- Get the instance_id based on operation type
  IF TG_OP = 'DELETE' THEN
    v_instance_id := OLD.instance_id;
  ELSE
    v_instance_id := NEW.instance_id;
  END IF;

  -- Check the instance status
  SELECT status INTO v_status
  FROM election_instances
  WHERE id = v_instance_id;

  -- Block if not in draft
  IF v_status IS NOT NULL AND v_status != 'draft' THEN
    RAISE EXCEPTION 'Impossible de modifier les categories: l''election est deja demarree (statut: %)', v_status
      USING ERRCODE = 'P0001',
            HINT = 'Les categories ne peuvent etre modifiees que lorsque l''election est en mode brouillon.';
  END IF;

  -- Allow the operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS tr_protect_categories ON categories;
CREATE TRIGGER tr_protect_categories
  BEFORE INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION protect_categories_when_started();


-- ============================================
-- 2. TRIGGER: Protect Candidates
-- Blocks INSERT, UPDATE, DELETE when instance status != 'draft'
-- ============================================

CREATE OR REPLACE FUNCTION protect_candidates_when_started()
RETURNS TRIGGER AS $$
DECLARE
  v_status election_status;
  v_instance_id UUID;
  v_category_id UUID;
BEGIN
  -- Get the category_id based on operation type
  IF TG_OP = 'DELETE' THEN
    v_category_id := OLD.category_id;
  ELSE
    v_category_id := NEW.category_id;
  END IF;

  -- Get the instance_id through the category
  SELECT c.instance_id INTO v_instance_id
  FROM categories c
  WHERE c.id = v_category_id;

  -- Check the instance status
  SELECT status INTO v_status
  FROM election_instances
  WHERE id = v_instance_id;

  -- Block if not in draft
  IF v_status IS NOT NULL AND v_status != 'draft' THEN
    RAISE EXCEPTION 'Impossible de modifier les candidats: l''election est deja demarree (statut: %)', v_status
      USING ERRCODE = 'P0001',
            HINT = 'Les candidats ne peuvent etre modifies que lorsque l''election est en mode brouillon.';
  END IF;

  -- Allow the operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS tr_protect_candidates ON candidates;
CREATE TRIGGER tr_protect_candidates
  BEFORE INSERT OR UPDATE OR DELETE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION protect_candidates_when_started();


-- ============================================
-- 3. TRIGGER: Protect Voters (MODIFIÉ)
-- Blocks INSERT, UPDATE, DELETE when instance status != 'draft'
-- EXCEPTION: Permet les modifications OTP + inscription automatique
-- ============================================

CREATE OR REPLACE FUNCTION protect_voters_when_started()
RETURNS TRIGGER AS $$
DECLARE
  v_status election_status;
  v_instance_id UUID;
BEGIN
  -- Get the instance_id based on operation type
  IF TG_OP = 'DELETE' THEN
    v_instance_id := OLD.instance_id;
  ELSE
    v_instance_id := NEW.instance_id;
  END IF;

  -- Check the instance status
  SELECT status INTO v_status
  FROM election_instances
  WHERE id = v_instance_id;

  -- Si l'élection n'est pas en draft, vérifier les modifications
  IF v_status IS NOT NULL AND v_status != 'draft' THEN
    
    -- Pour les UPDATE, autoriser si seules les colonnes autorisées ont changé
    IF TG_OP = 'UPDATE' THEN
      -- Autoriser uniquement si les colonnes critiques (identité) n'ont PAS changé
      IF OLD.email = NEW.email AND
         OLD.full_name = NEW.full_name AND
         OLD.instance_id = NEW.instance_id THEN
        -- Les colonnes d'identité n'ont pas changé, autoriser
        -- (cela couvre les colonnes OTP + inscription automatique)
        RETURN NEW;
      END IF;
      
      -- Si on arrive ici, l'identité du votant a changé
      RAISE EXCEPTION 'Impossible de modifier l''identite du votant: l''election est deja demarree (statut: %)', v_status
        USING ERRCODE = 'P0001',
              HINT = 'L''email, le nom et l''instance ne peuvent etre modifies que lorsque l''election est en mode brouillon.';
    END IF;

    -- Bloquer INSERT et DELETE
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Impossible d''ajouter un votant: l''election est deja demarree (statut: %)', v_status
        USING ERRCODE = 'P0001',
              HINT = 'Les votants ne peuvent etre ajoutes que lorsque l''election est en mode brouillon.';
    ELSIF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Impossible de supprimer le votant: l''election est deja demarree (statut: %)', v_status
        USING ERRCODE = 'P0001',
              HINT = 'Les votants ne peuvent etre supprimes que lorsque l''election est en mode brouillon.';
    END IF;
  END IF;

  -- Allow the operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS tr_protect_voters ON voters;
CREATE TRIGGER tr_protect_voters
  BEFORE INSERT OR UPDATE OR DELETE ON voters
  FOR EACH ROW
  EXECUTE FUNCTION protect_voters_when_started();


-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION protect_categories_when_started() IS 'Prevents category modifications when election is not in draft status';
COMMENT ON FUNCTION protect_candidates_when_started() IS 'Prevents candidate modifications when election is not in draft status';
COMMENT ON FUNCTION protect_voters_when_started() IS 'Prevents voter operations when election is not in draft status, except for OTP-related updates and automatic registration (auth_uid, is_registered, registered_at)';
