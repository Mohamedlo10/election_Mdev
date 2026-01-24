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
-- 3. TRIGGER: Protect Voters
-- Blocks INSERT, UPDATE, DELETE when instance status != 'draft'
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

  -- Block if not in draft
  IF v_status IS NOT NULL AND v_status != 'draft' THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Impossible d''ajouter un votant: l''election est deja demarree (statut: %)', v_status
        USING ERRCODE = 'P0001',
              HINT = 'Les votants ne peuvent etre ajoutes que lorsque l''election est en mode brouillon.';
    ELSIF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'Impossible de modifier les informations du votant: l''election est deja demarree (statut: %)', v_status
        USING ERRCODE = 'P0001',
              HINT = 'Les informations des votants ne peuvent etre modifiees que lorsque l''election est en mode brouillon.';
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
COMMENT ON FUNCTION protect_voters_when_started() IS 'Prevents all voter operations (INSERT, UPDATE, DELETE) when election is not in draft status';
