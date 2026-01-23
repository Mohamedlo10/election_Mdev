-- ============================================
-- ESEA - Election System Enterprise Application
-- Schéma SQL pour Supabase
-- ============================================

-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TYPES ENUM
-- ============================================
CREATE TYPE election_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'observer', 'voter');

-- ============================================
-- TABLE: election_instances
-- ============================================
CREATE TABLE election_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#22c55e',
  secondary_color VARCHAR(7) DEFAULT '#1f2937',
  accent_color VARCHAR(7) DEFAULT '#eab308',
  status election_status DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- ============================================
-- TABLE: categories
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES election_instances(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: candidates
-- ============================================
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  description TEXT,
  program_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: voters
-- ============================================
CREATE TABLE voters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES election_instances(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  auth_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_registered BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, email)
);

-- ============================================
-- TABLE: votes
-- ============================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES election_instances(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un votant ne peut voter qu'une fois par catégorie
  UNIQUE(voter_id, category_id)
);

-- ============================================
-- TABLE: users_roles
-- ============================================
CREATE TABLE users_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES election_instances(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un utilisateur ne peut avoir qu'un rôle par instance
  UNIQUE(user_id, instance_id)
);

-- ============================================
-- INDEX POUR PERFORMANCES
-- ============================================
CREATE INDEX idx_categories_instance ON categories(instance_id);
CREATE INDEX idx_candidates_category ON candidates(category_id);
CREATE INDEX idx_voters_instance ON voters(instance_id);
CREATE INDEX idx_voters_email ON voters(email);
CREATE INDEX idx_voters_auth_uid ON voters(auth_uid);
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_candidate ON votes(candidate_id);
CREATE INDEX idx_votes_category ON votes(category_id);
CREATE INDEX idx_votes_instance ON votes(instance_id);
CREATE INDEX idx_users_roles_user ON users_roles(user_id);
CREATE INDEX idx_users_roles_instance ON users_roles(instance_id);

-- ============================================
-- TRIGGERS UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_election_instances_updated_at
  BEFORE UPDATE ON election_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE election_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITIQUES RLS: election_instances
-- ============================================

-- Super admin peut tout voir
CREATE POLICY "Super admins can view all instances" ON election_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Super admin peut créer
CREATE POLICY "Super admins can create instances" ON election_instances
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Super admin peut modifier
CREATE POLICY "Super admins can update instances" ON election_instances
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Super admin peut supprimer
CREATE POLICY "Super admins can delete instances" ON election_instances
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Admin/Observer peut voir leur instance
CREATE POLICY "Admins and observers can view their instance" ON election_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND instance_id = election_instances.id
      AND role IN ('admin', 'observer')
    )
  );

-- Admin peut modifier leur instance
CREATE POLICY "Admins can update their instance" ON election_instances
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND instance_id = election_instances.id
      AND role = 'admin'
    )
  );

-- Votants peuvent voir leur instance
CREATE POLICY "Voters can view their instance" ON election_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voters
      WHERE auth_uid = auth.uid()
      AND instance_id = election_instances.id
      AND is_registered = TRUE
    )
  );

-- ============================================
-- POLITIQUES RLS: categories
-- ============================================

-- Lecture pour utilisateurs de l'instance
CREATE POLICY "Users can view categories of their instance" ON categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND (instance_id = categories.instance_id OR role = 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM voters
      WHERE auth_uid = auth.uid()
      AND instance_id = categories.instance_id
      AND is_registered = TRUE
    )
  );

-- Admin et super admin peuvent créer
CREATE POLICY "Admins can create categories" ON categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND (instance_id = categories.instance_id AND role = 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Admin et super admin peuvent modifier
CREATE POLICY "Admins can update categories" ON categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND (instance_id = categories.instance_id AND role = 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Admin et super admin peuvent supprimer
CREATE POLICY "Admins can delete categories" ON categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND (instance_id = categories.instance_id AND role = 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================
-- POLITIQUES RLS: candidates
-- ============================================

-- Lecture pour utilisateurs de l'instance
CREATE POLICY "Users can view candidates" ON candidates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM categories c
      JOIN users_roles ur ON (ur.instance_id = c.instance_id OR ur.role = 'super_admin')
      WHERE c.id = candidates.category_id
      AND ur.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM categories c
      JOIN voters v ON v.instance_id = c.instance_id
      WHERE c.id = candidates.category_id
      AND v.auth_uid = auth.uid()
      AND v.is_registered = TRUE
    )
  );

-- Admin peut gérer les candidats
CREATE POLICY "Admins can manage candidates" ON candidates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM categories c
      JOIN users_roles ur ON ur.instance_id = c.instance_id
      WHERE c.id = candidates.category_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================
-- POLITIQUES RLS: voters
-- ============================================

-- Admin et super admin peuvent voir les votants
CREATE POLICY "Admins can view voters" ON voters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND (instance_id = voters.instance_id AND role IN ('admin', 'observer'))
    )
    OR
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Votant peut voir ses propres infos
CREATE POLICY "Voters can view own info" ON voters
  FOR SELECT
  USING (auth_uid = auth.uid());

-- Admin peut gérer les votants
CREATE POLICY "Admins can manage voters" ON voters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND instance_id = voters.instance_id
      AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================
-- POLITIQUES RLS: votes
-- ============================================

-- Votant peut créer son vote
CREATE POLICY "Voters can create votes" ON votes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM voters
      WHERE id = votes.voter_id
      AND auth_uid = auth.uid()
      AND is_registered = TRUE
    )
    AND
    EXISTS (
      SELECT 1 FROM election_instances
      WHERE id = votes.instance_id
      AND status = 'active'
    )
  );

-- Votant peut voir ses votes
CREATE POLICY "Voters can view own votes" ON votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voters
      WHERE id = votes.voter_id
      AND auth_uid = auth.uid()
    )
  );

-- Admin et observer peuvent voir les votes (stats)
CREATE POLICY "Admins can view votes stats" ON votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND (instance_id = votes.instance_id AND role IN ('admin', 'observer'))
    )
    OR
    EXISTS (
      SELECT 1 FROM users_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================
-- POLITIQUES RLS: users_roles
-- ============================================

-- Super admin peut tout
CREATE POLICY "Super admins can manage roles" ON users_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- Utilisateur peut voir son propre rôle
CREATE POLICY "Users can view own role" ON users_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- FONCTION: Vérifier si email est dans liste votants
-- ============================================
CREATE OR REPLACE FUNCTION check_voter_email(p_email TEXT)
RETURNS TABLE (
  voter_id UUID,
  instance_id UUID,
  instance_name VARCHAR,
  full_name VARCHAR,
  is_registered BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id as voter_id,
    v.instance_id,
    ei.name as instance_name,
    v.full_name,
    v.is_registered
  FROM voters v
  JOIN election_instances ei ON ei.id = v.instance_id
  WHERE v.email = p_email
  AND ei.status IN ('draft', 'active', 'paused');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FONCTION: Enregistrer un votant après création auth
-- ============================================
CREATE OR REPLACE FUNCTION register_voter(p_voter_id UUID, p_auth_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE voters
  SET
    auth_uid = p_auth_uid,
    is_registered = TRUE,
    registered_at = NOW()
  WHERE id = p_voter_id
  AND is_registered = FALSE;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FONCTION: Obtenir les stats d'une instance
-- ============================================
CREATE OR REPLACE FUNCTION get_election_stats(p_instance_id UUID)
RETURNS TABLE (
  total_voters BIGINT,
  registered_voters BIGINT,
  votes_cast BIGINT,
  categories_count BIGINT,
  candidates_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM voters WHERE instance_id = p_instance_id) as total_voters,
    (SELECT COUNT(*) FROM voters WHERE instance_id = p_instance_id AND is_registered = TRUE) as registered_voters,
    (SELECT COUNT(DISTINCT voter_id) FROM votes WHERE instance_id = p_instance_id) as votes_cast,
    (SELECT COUNT(*) FROM categories WHERE instance_id = p_instance_id) as categories_count,
    (SELECT COUNT(*) FROM candidates c
     JOIN categories cat ON cat.id = c.category_id
     WHERE cat.instance_id = p_instance_id) as candidates_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FONCTION: Obtenir les résultats par catégorie
-- ============================================
CREATE OR REPLACE FUNCTION get_category_results(p_category_id UUID)
RETURNS TABLE (
  candidate_id UUID,
  candidate_name VARCHAR,
  votes_count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_votes BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_votes
  FROM votes WHERE category_id = p_category_id;

  RETURN QUERY
  SELECT
    c.id as candidate_id,
    c.full_name as candidate_name,
    COUNT(v.id) as votes_count,
    CASE
      WHEN total_votes > 0 THEN ROUND((COUNT(v.id)::NUMERIC / total_votes) * 100, 2)
      ELSE 0
    END as percentage
  FROM candidates c
  LEFT JOIN votes v ON v.candidate_id = c.id
  WHERE c.category_id = p_category_id
  GROUP BY c.id, c.full_name
  ORDER BY votes_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- À exécuter dans les paramètres Storage de Supabase

-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('programs', 'programs', true);

-- Politiques storage pour logos
-- CREATE POLICY "Public logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
-- CREATE POLICY "Auth users can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Politiques storage pour photos
-- CREATE POLICY "Public photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
-- CREATE POLICY "Auth users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Politiques storage pour programs
-- CREATE POLICY "Public programs" ON storage.objects FOR SELECT USING (bucket_id = 'programs');
-- CREATE POLICY "Auth users can upload programs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'programs' AND auth.role() = 'authenticated');
