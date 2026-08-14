'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import type { UserInstanceSummary } from '@/types';
import {
  Shield, Vote, Settings, Users, BarChart3,
  ChevronRight, Clock, CheckCircle, PauseCircle,
  Archive, FileEdit, Loader2, User, LogOut
} from 'lucide-react';

// ─── Composants de badge de statut ──────────────────────────────────────────

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', icon: FileEdit, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  active: { label: 'En cours', icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  paused: { label: 'En pause', icon: PauseCircle, bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'Terminée', icon: CheckCircle, bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  archived: { label: 'Archivée', icon: Archive, bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Gestionnaire',
  observer: 'Observateur',
  voter: 'Votant',
};

// ─── Carte d'instance administrée ───────────────────────────────────────────

function AdminInstanceCard({ instance }: { instance: UserInstanceSummary }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden flex flex-col">
      {/* En-tête coloré */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: instance.primary_color || '#22c55e' }}
      />
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Logo + Nom */}
        <div className="flex items-start gap-3">
          {instance.logo_url ? (
            <img
              src={instance.logo_url}
              alt={instance.instance_name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${instance.primary_color || '#22c55e'}20` }}
            >
              <Shield className="w-5 h-5" style={{ color: instance.primary_color || '#22c55e' }} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate leading-tight">
              {instance.instance_name}
            </h3>
            <span className="text-xs text-gray-500">{ROLE_LABELS[instance.role] ?? instance.role}</span>
          </div>
        </div>

        {/* Badge de statut */}
        <div>
          <StatusBadge status={instance.instance_status as keyof typeof STATUS_CONFIG} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2">
          <Link
            href={`/instance/${instance.instance_id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: instance.primary_color || '#22c55e' }}
          >
            <Settings className="w-4 h-4" />
            Gérer
          </Link>
          <Link
            href={`/instance/${instance.instance_id}/voters`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Users className="w-4 h-4" />
          </Link>
          <Link
            href={`/instance/${instance.instance_id}/results`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Carte d'instance de vote ────────────────────────────────────────────────

function VoterInstanceCard({ instance }: { instance: UserInstanceSummary }) {
  const canVote = instance.instance_status === 'active' && instance.is_registered;
  const isPending = instance.instance_status === 'draft' || instance.instance_status === 'paused';

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden flex flex-col">
      <div
        className="h-2 w-full"
        style={{ backgroundColor: instance.primary_color || '#22c55e' }}
      />
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Logo + Nom */}
        <div className="flex items-start gap-3">
          {instance.logo_url ? (
            <img
              src={instance.logo_url}
              alt={instance.instance_name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${instance.primary_color || '#22c55e'}20` }}
            >
              <Vote className="w-5 h-5" style={{ color: instance.primary_color || '#22c55e' }} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate leading-tight">
              {instance.instance_name}
            </h3>
            <span className="text-xs text-gray-500">Votant inscrit</span>
          </div>
        </div>

        {/* Badge de statut */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={instance.instance_status as keyof typeof STATUS_CONFIG} />
          {instance.is_registered && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
              <CheckCircle className="w-3 h-3" /> Inscrit
            </span>
          )}
        </div>

        {/* Action */}
        <div className="mt-auto pt-2">
          {canVote ? (
            <Link
              href={`/instance/${instance.instance_id}/vote`}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: instance.primary_color || '#22c55e' }}
            >
              <Vote className="w-4 h-4" />
              Accéder au vote
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Link>
          ) : isPending ? (
            <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-600 bg-amber-50">
              <Clock className="w-4 h-4" />
              En attente du démarrage
            </div>
          ) : (
            <Link
              href={`/instance/${instance.instance_id}/results`}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Voir les résultats
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale Dashboard ────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { authUser, loading, adminInstances, voterInstances, hasMultipleContexts, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!authUser) {
      router.push('/login');
      return;
    }

    // Cas simples : redirection directe sans afficher le Hub
    if (authUser.role === 'super_admin') {
      router.push('/super-admin');
      return;
    }

    // Ne plus forcer de redirection automatique pour mono-instance
    // L'utilisateur reste toujours sur Mon Espace (/dashboard)

    // Si 0 instance ou multi-instances → rester sur Mon Espace (/dashboard)


    // Si aucun des cas ci-dessus → rester sur le Hub (multi-contextes ou zéro instance)

  }, [authUser, loading, adminInstances, voterInstances, router]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-500 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  // Cas où les redirections super_admin sont en cours
  if (!authUser || authUser.role === 'super_admin') return null;

  // ─── Hub Unifié ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-primary-lighter rounded-xl flex items-center justify-center">
              <Vote className="w-5 h-5 text-theme-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Mon Espace</h1>
              <p className="text-xs text-gray-400">{authUser.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <User className="w-4 h-4" />
              Mon profil
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                window.location.href = '/login';
              }}
              className="flex items-center gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Se déconnecter</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── Section Admin ────────────────────────────────────────────── */}
        {adminInstances.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Mes Élections à administrer
                </h2>
                <p className="text-xs text-gray-400">
                  {adminInstances.length} élection{adminInstances.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminInstances.map((instance) => (
                <AdminInstanceCard key={instance.instance_id} instance={instance} />
              ))}
            </div>
          </section>
        )}

        {/* ── Section Vote ─────────────────────────────────────────────── */}
        {voterInstances.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                <Vote className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Mes Scrutins de vote
                </h2>
                <p className="text-xs text-gray-400">
                  {voterInstances.length} scrutin{voterInstances.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {voterInstances.map((instance) => (
                <VoterInstanceCard key={instance.instance_id} instance={instance} />
              ))}
            </div>
          </section>
        )}

        {/* ── État vide ─────────────────────────────────────────────────── */}
        {adminInstances.length === 0 && voterInstances.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 max-w-md mx-auto shadow-sm">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Bienvenue sur votre Espace !</h2>
            <p className="text-gray-500 text-sm mb-6">
              Vous n&apos;avez encore aucune élection associée à votre compte. Vous pouvez créer votre premier scrutin dès maintenant.
            </p>
            <Link
              href="/admin-setup"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-theme-primary hover:bg-theme-primary-dark transition-colors shadow-sm"
            >
              + Créer ma première élection
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
