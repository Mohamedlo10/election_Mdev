// ============================================
// MDev_Election - Election System Enterprise Application
// Types TypeScript
// ============================================

// Statuts d'élection
export type ElectionStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

// Rôles utilisateurs
export type UserRole = 'super_admin' | 'admin' | 'observer' | 'voter';

// ============================================
// INSTANCES D'ÉLECTION
// ============================================
export interface ElectionInstance {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  status: ElectionStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface CreateElectionInstance {
  name: string;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export interface UpdateElectionInstance {
  name?: string;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  status?: ElectionStatus;
}

// ============================================
// CATÉGORIES
// ============================================
export interface Category {
  id: string;
  instance_id: string;
  name: string;
  description: string | null;
  order: number;
  created_at: string;
}

export interface CreateCategory {
  instance_id: string;
  name: string;
  description?: string | null;
  order?: number;
}

export interface UpdateCategory {
  name?: string;
  description?: string | null;
  order?: number;
}

// ============================================
// CANDIDATS
// ============================================
export interface Candidate {
  id: string;
  category_id: string;
  full_name: string;
  description: string | null;
  program_url: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface CreateCandidate {
  category_id: string;
  full_name: string;
  description?: string | null;
  program_url?: string | null;
  photo_url?: string | null;
}

export interface UpdateCandidate {
  full_name?: string;
  description?: string | null;
  program_url?: string | null;
  photo_url?: string | null;
}

// Candidat avec infos catégorie pour affichage
export interface CandidateWithCategory extends Candidate {
  category: Category;
}

// ============================================
// VOTANTS
// ============================================
export interface Voter {
  id: string;
  instance_id: string;
  full_name: string;
  email: string;
  auth_uid: string | null;
  is_registered: boolean;
  registered_at: string | null;
  created_at: string;
}

export interface CreateVoter {
  instance_id: string;
  full_name: string;
  email: string;
}

export interface UpdateVoter {
  full_name?: string;
  email?: string;
}

// Pour import Excel
export interface VoterImport {
  full_name: string;
  email: string;
}

// ============================================
// VOTES
// ============================================
export interface Vote {
  id: string;
  voter_id: string;
  candidate_id: string;
  category_id: string;
  instance_id: string;
  created_at: string;
}

export interface CreateVote {
  voter_id: string;
  candidate_id: string;
  category_id: string;
  instance_id: string;
}

// Vote avec détails pour affichage
export interface VoteWithDetails extends Vote {
  candidate: Candidate;
  category: Category;
}

// ============================================
// RÔLES UTILISATEURS
// ============================================
export interface UserRoleRecord {
  id: string;
  user_id: string;
  instance_id: string | null; // null pour super_admin
  role: UserRole;
  created_at: string;
}

export interface CreateUserRole {
  user_id: string;
  instance_id?: string | null;
  role: UserRole;
}

// ============================================
// UTILISATEUR AUTHENTIFIÉ (contexte)
// ============================================
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  instance_id: string | null;
  voter?: Voter;
}

// ============================================
// STATISTIQUES & RÉSULTATS
// ============================================
export interface CategoryResults {
  category: Category;
  candidates: CandidateResults[];
  total_votes: number;
}

export interface CandidateResults {
  candidate: Candidate;
  votes_count: number;
  percentage: number;
}

export interface ElectionStats {
  instance_id: string;
  total_voters: number;
  registered_voters: number;
  votes_cast: number;
  participation_rate: number;
  categories_count: number;
  candidates_count: number;
}

// ============================================
// RÉPONSES API
// ============================================
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================
// FORMULAIRES
// ============================================
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
}

// ============================================
// COULEURS DYNAMIQUES INSTANCE
// ============================================
export interface InstanceTheme {
  primary: string;
  secondary: string;
  accent: string;
}
