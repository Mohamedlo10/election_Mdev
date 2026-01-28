-- ============================================
-- Migration: Système OTP pour les votants
-- Code valide 10 heures, réutilisable tant que valide
-- ============================================

-- Ajouter les colonnes OTP à la table voters
ALTER TABLE voters
ADD COLUMN IF NOT EXISTS login_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS code_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_code_sent_at TIMESTAMPTZ;

-- Index pour les performances de lookup par code
CREATE INDEX IF NOT EXISTS idx_voters_login_code ON voters(login_code) WHERE login_code IS NOT NULL;

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS check_existing_otp(TEXT);

-- Fonction: Vérifier si un code valide existe déjà + statut de l'élection
CREATE OR REPLACE FUNCTION check_existing_otp(p_email TEXT)
RETURNS TABLE (
  has_valid_code BOOLEAN,
  code_expires_at TIMESTAMPTZ,
  minutes_remaining INTEGER,
  voter_id UUID,
  full_name VARCHAR,
  instance_id UUID,
  instance_name VARCHAR,
  instance_status TEXT
) AS $$
DECLARE
  v_voter RECORD;
  remaining_minutes INTEGER;
BEGIN
  -- Trouver le votant avec instance (TOUS LES STATUTS)
  SELECT v.*, ei.name as inst_name, ei.status as inst_status
  INTO v_voter
  FROM voters v
  JOIN election_instances ei ON ei.id = v.instance_id
  WHERE v.email = LOWER(p_email)
  AND ei.status IN ('draft', 'active', 'paused', 'completed', 'archived')
  LIMIT 1;

  -- Votant non trouvé
  IF v_voter IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0, NULL::UUID, NULL::VARCHAR, NULL::UUID, NULL::VARCHAR, NULL::TEXT;
    RETURN;
  END IF;

  -- Vérifier si un code valide existe
  IF v_voter.login_code IS NOT NULL AND v_voter.code_expires_at > NOW() THEN
    remaining_minutes := CEIL(EXTRACT(EPOCH FROM (v_voter.code_expires_at - NOW())) / 60)::INTEGER;
    RETURN QUERY SELECT TRUE, v_voter.code_expires_at, remaining_minutes, v_voter.id, v_voter.full_name, v_voter.instance_id, v_voter.inst_name, v_voter.inst_status::TEXT;
    RETURN;
  END IF;

  -- Pas de code valide
  RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0, v_voter.id, v_voter.full_name, v_voter.instance_id, v_voter.inst_name, v_voter.inst_status::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Générer et stocker un code OTP (valide 10 heures)
CREATE OR REPLACE FUNCTION generate_voter_otp(p_voter_id UUID)
RETURNS TABLE (
  code VARCHAR,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  new_code VARCHAR(6);
  expiration TIMESTAMPTZ;
BEGIN
  -- Générer un code à 6 chiffres
  new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  -- Expiration dans 10 heures
  expiration := NOW() + INTERVAL '10 hours';

  -- Mettre à jour le votant
  UPDATE voters
  SET
    login_code = new_code,
    code_expires_at = expiration,
    code_attempts = 0,
    last_code_sent_at = NOW()
  WHERE id = p_voter_id;

  RETURN QUERY SELECT new_code, expiration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier un code OTP (MODIFIÉE - ignore expiration pour élections terminées)
CREATE OR REPLACE FUNCTION verify_voter_otp(p_email TEXT, p_code VARCHAR)
RETURNS TABLE (
  success BOOLEAN,
  voter_id UUID,
  instance_id UUID,
  full_name VARCHAR,
  error_message TEXT
) AS $$
DECLARE
  v_voter RECORD;
BEGIN
  -- Trouver le votant (TOUS LES STATUTS)
  SELECT v.*, ei.status as instance_status
  INTO v_voter
  FROM voters v
  JOIN election_instances ei ON ei.id = v.instance_id
  WHERE v.email = LOWER(p_email)
  AND ei.status IN ('draft', 'active', 'paused', 'completed', 'archived')
  LIMIT 1;

  -- Votant non trouvé
  IF v_voter IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::VARCHAR, 'Email non trouvé'::TEXT;
    RETURN;
  END IF;

  -- Pas de code actif
  IF v_voter.login_code IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::VARCHAR, 'Aucun code en attente. Demandez un nouveau code.'::TEXT;
    RETURN;
  END IF;

  -- Vérifier expiration SEULEMENT si l'élection n'est pas terminée
  IF v_voter.instance_status NOT IN ('completed', 'archived') THEN
    -- Code expiré (seulement pour élections actives)
    IF v_voter.code_expires_at < NOW() THEN
      -- Nettoyer le code expiré
      UPDATE voters SET login_code = NULL, code_expires_at = NULL, code_attempts = 0
      WHERE id = v_voter.id;
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::VARCHAR, 'Code expiré. Demandez un nouveau code.'::TEXT;
      RETURN;
    END IF;

    -- Trop de tentatives (seulement pour élections actives)
    IF v_voter.code_attempts >= 5 THEN
      -- Bloquer et nettoyer
      UPDATE voters SET login_code = NULL, code_expires_at = NULL, code_attempts = 0
      WHERE id = v_voter.id;
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::VARCHAR, 'Trop de tentatives. Demandez un nouveau code.'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Code incorrect
  IF v_voter.login_code != p_code THEN
    -- Incrémenter les tentatives seulement si l'élection n'est pas terminée
    IF v_voter.instance_status NOT IN ('completed', 'archived') THEN
      UPDATE voters SET code_attempts = code_attempts + 1
      WHERE id = v_voter.id;
    END IF;
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::VARCHAR, 'Code incorrect'::TEXT;
    RETURN;
  END IF;

  -- Code correct - NE PAS supprimer le code (réutilisable)
  -- Juste réinitialiser les tentatives si élection active
  IF v_voter.instance_status NOT IN ('completed', 'archived') THEN
    UPDATE voters SET code_attempts = 0
    WHERE id = v_voter.id;
  END IF;

  RETURN QUERY SELECT TRUE, v_voter.id, v_voter.instance_id, v_voter.full_name, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier le rate limiting (1 code par 60 secondes) - utilisé seulement pour forcer un nouveau code
CREATE OR REPLACE FUNCTION can_send_otp(p_email TEXT)
RETURNS TABLE (
  allowed BOOLEAN,
  wait_seconds INTEGER,
  voter_id UUID,
  full_name VARCHAR,
  instance_id UUID,
  instance_name VARCHAR
) AS $$
DECLARE
  v_voter RECORD;
  time_diff INTEGER;
BEGIN
  -- Trouver le votant avec instance (TOUS LES STATUTS)
  SELECT v.*, ei.name as instance_name, ei.status as instance_status
  INTO v_voter
  FROM voters v
  JOIN election_instances ei ON ei.id = v.instance_id
  WHERE v.email = LOWER(p_email)
  AND ei.status IN ('draft', 'active', 'paused', 'completed', 'archived')
  LIMIT 1;

  -- Votant non trouvé
  IF v_voter IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID, NULL::VARCHAR, NULL::UUID, NULL::VARCHAR;
    RETURN;
  END IF;

  -- Vérifier le rate limiting
  IF v_voter.last_code_sent_at IS NOT NULL THEN
    time_diff := EXTRACT(EPOCH FROM (NOW() - v_voter.last_code_sent_at))::INTEGER;
    IF time_diff < 60 THEN
      RETURN QUERY SELECT FALSE, 60 - time_diff, v_voter.id, v_voter.full_name, v_voter.instance_id, v_voter.instance_name;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT TRUE, 0, v_voter.id, v_voter.full_name, v_voter.instance_id, v_voter.instance_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier si un email appartient à un admin/observer
CREATE OR REPLACE FUNCTION check_admin_email(p_email TEXT)
RETURNS TABLE (
  is_admin BOOLEAN,
  user_id UUID,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_admin,
    ur.user_id,
    ur.role::TEXT
  FROM users_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE au.email = LOWER(p_email)
  AND ur.role IN ('super_admin', 'admin', 'observer')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;