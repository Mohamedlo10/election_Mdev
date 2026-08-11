// ============================================
// MDev_Election - Election System Enterprise Application
// Types TypeScript
// ============================================

// Statuts d'élection
export type ElectionStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

// Rôles utilisateurs (manager = gestionnaire opérationnel sans droits de configuration)
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'observer' | 'voter';

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
  auth_purged_at?: string | null;
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
  /** NULL = mot de passe permanent pas encore défini (première connexion en attente) */
  password_set_at: string | null;
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
// DASHBOARD UNIFIÉ — MULTI-INSTANCES
// ============================================

/** Résumé d'une instance vue depuis le Dashboard Unifié */
export interface UserInstanceSummary {
  /** 'admin_instance' si l'utilisateur a un rôle admin/manager/observer */
  context: 'admin_instance' | 'voter_instance';
  instance_id: string;
  instance_name: string;
  instance_status: ElectionStatus;
  logo_url: string | null;
  primary_color: string;
  /** Rôle de l'utilisateur dans cette instance */
  role: UserRole;
  /** Uniquement renseigné si context === 'voter_instance' */
  voter_id: string | null;
  /** Uniquement renseigné si context === 'voter_instance' */
  is_registered: boolean | null;
}

/** Données agrégées du Dashboard Unifié */
export interface UserDashboardData {
  admin_instances: UserInstanceSummary[];
  voter_instances: UserInstanceSummary[];
}

// ============================================
// UTILISATEUR AUTHENTIFIÉ (contexte)
// ============================================
export interface AuthUser {
  id: string;
  email: string;
  /** Rôle primaire (priorité : super_admin > admin > manager > observer > voter) */
  role: UserRole;
  /** Instance principale (pour compatibilité ascendante, null si multi-instances) */
  instance_id: string | null;
  voter?: Voter;
  /** Toutes les instances administrées (admin/manager/observer) */
  admin_instances?: UserInstanceSummary[];
  /** Toutes les instances où l'utilisateur est votant */
  voter_instances?: UserInstanceSummary[];
  /** true si l'utilisateur a à la fois des instances admin et voter */
  has_multiple_contexts?: boolean;
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
  eligible_voters: number;
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
