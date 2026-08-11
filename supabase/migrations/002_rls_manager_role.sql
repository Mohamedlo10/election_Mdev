-- ============================================
-- Migration 002 : Politiques RLS pour le rôle 'manager'
-- Date : 2026-08-11
-- Dépendance : Migration 001 (rôle manager doit exister dans l'ENUM)
-- Description :
--   Le manager peut gérer les votants, voir les stats et lire les données
--   de son instance, mais NE PEUT PAS modifier les paramètres de l'élection.
-- ============================================

-- ----------------------------------------
-- election_instances : lecture seule pour le manager
-- ----------------------------------------
CREATE POLICY "Managers can view their instance"
  ON election_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
        AND instance_id = election_instances.id
        AND role = 'manager'
    )
  );

-- ----------------------------------------
-- categories : lecture seule pour le manager
-- ----------------------------------------
CREATE POLICY "Managers can view categories"
  ON categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
        AND instance_id = categories.instance_id
        AND role = 'manager'
    )
  );

-- ----------------------------------------
-- candidates : lecture seule pour le manager
-- ----------------------------------------
CREATE POLICY "Managers can view candidates"
  ON candidates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM categories c
      JOIN users_roles ur ON ur.instance_id = c.instance_id
      WHERE c.id = candidates.category_id
        AND ur.user_id = auth.uid()
        AND ur.role = 'manager'
    )
  );

-- ----------------------------------------
-- voters : CRUD complet pour le manager sur son instance
-- ----------------------------------------
CREATE POLICY "Managers can view voters"
  ON voters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
        AND instance_id = voters.instance_id
        AND role = 'manager'
    )
  );

CREATE POLICY "Managers can insert voters"
  ON voters
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
        AND instance_id = voters.instance_id
        AND role = 'manager'
    )
  );

CREATE POLICY "Managers can update voters"
  ON voters
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
        AND instance_id = voters.instance_id
        AND role = 'manager'
    )
  );

CREATE POLICY "Managers can delete voters"
  ON voters
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
        AND instance_id = voters.instance_id
        AND role = 'manager'
    )
  );

-- ----------------------------------------
-- votes : lecture seule pour le manager (stats de participation)
-- ----------------------------------------
CREATE POLICY "Managers can view votes stats"
  ON votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
        AND instance_id = votes.instance_id
        AND role = 'manager'
    )
  );
