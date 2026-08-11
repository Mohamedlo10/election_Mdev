-- ============================================
-- Migration 001 : Ajout du rôle 'manager' et tracking mot de passe
-- Date : 2026-08-11
-- Description :
--   1. Ajoute 'manager' à l'ENUM user_role
--   2. Ajoute la colonne password_set_at dans voters
--      (NULL = pas encore défini, NOT NULL = mot de passe permanent créé)
-- ============================================

-- 1. Ajouter 'manager' à l'ENUM user_role
-- IF NOT EXISTS est supporté depuis PostgreSQL 9.3 pour ADD VALUE
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager' AFTER 'admin';

-- 2. Ajouter la colonne password_set_at dans la table voters
ALTER TABLE voters
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN voters.password_set_at IS
  'Date à laquelle le votant a défini son mot de passe permanent via le lien expirable. '
  'NULL = première connexion en attente, NOT NULL = mot de passe défini.';
