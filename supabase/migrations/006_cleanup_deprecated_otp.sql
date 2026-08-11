-- ============================================
-- Migration 006 : Nettoyage des objets OTP obsolètes
-- Date : 2026-08-11
-- Description :
--   Le système d'authentification a été unifié autour des mots de passe permanents
--   et des liens de connexion/réinitialisation expirables.
--   Cette migration supprime la table et les fonctions SQL d'anciennes clés OTP.
-- ============================================

-- 1. Supprimer la table voter_otps
DROP TABLE IF EXISTS voter_otps CASCADE;

-- 2. Supprimer les fonctions d'OTP obsolètes
DROP FUNCTION IF EXISTS check_existing_otp(TEXT);
DROP FUNCTION IF EXISTS generate_voter_otp(UUID);
DROP FUNCTION IF EXISTS verify_voter_otp(TEXT, VARCHAR);
DROP FUNCTION IF EXISTS can_send_otp(TEXT);
