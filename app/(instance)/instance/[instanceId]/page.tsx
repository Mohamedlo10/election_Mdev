'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useInstance } from '@/contexts/InstanceContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  Users,
  Vote,
  BarChart3,
  CheckCircle,
  Clock,
  FolderTree,
  UserCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface InstanceStats {
  totalCategories: number;
  totalCandidates: number;
  totalVoters: number;
  registeredVoters: number;
  totalVotes: number;
}

export default function InstanceDashboardPage() {
  const params = useParams();
  const instanceId = params.instanceId as string;
  const { authUser } = useAuth();
  const { currentInstance } = useInstance();
  const [stats, setStats] = useState<InstanceStats>({
    totalCategories: 0,
    totalCandidates: 0,
    totalVoters: 0,
    registeredVoters: 0,
    totalVotes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();

      const [categoriesRes, candidatesRes, votersRes, registeredRes, votesRes] = await Promise.all([
        supabase.from('categories').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId),
        supabase.from('voters').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId),
        supabase.from('voters').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId).eq('is_registered', true),
        supabase.from('votes').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId),
      ]);

      setStats({
        totalCategories: categoriesRes.count || 0,
        totalCandidates: candidatesRes.count || 0,
        totalVoters: votersRes.count || 0,
        registeredVoters: registeredRes.count || 0,
        totalVotes: votesRes.count || 0,
      });

      setLoading(false);
    }

    if (instanceId) {
      loadStats();
    }
  }, [instanceId]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-blue-100 text-blue-700',
      archived: 'bg-gray-100 text-gray-500',
    };
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      active: 'Active',
      paused: 'En pause',
      completed: 'Terminee',
      archived: 'Archivee',
    };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const statCards = [
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: FolderTree,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Candidats',
      value: stats.totalCandidates,
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Votants inscrits',
      value: `${stats.registeredVoters}/${stats.totalVoters}`,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Votes',
      value: stats.totalVotes,
      icon: Vote,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  const basePath = `/instance/${instanceId}`;
  const userRole = authUser?.role;

  const quickActions = [
    {
      title: 'Gerer les categories',
      description: 'Ajouter ou modifier des categories',
      href: `${basePath}/categories`,
      icon: FolderTree,
      roles: ['admin', 'super_admin'],
    },
    {
      title: 'Gerer les candidats',
      description: 'Ajouter des candidats aux categories',
      href: `${basePath}/candidates`,
      icon: UserCheck,
      roles: ['admin', 'super_admin'],
    },
    {
      title: 'Importer des votants',
      description: 'Importer depuis un fichier Excel',
      href: `${basePath}/voters`,
      icon: Users,
      roles: ['admin', 'super_admin'],
    },
    {
      title: 'Voter',
      description: 'Participer a l\'election',
      href: `${basePath}/vote`,
      icon: Vote,
      roles: ['voter'],
    },
    {
      title: 'Voir les resultats',
      description: 'Consulter les tendances',
      href: `${basePath}/results`,
      icon: BarChart3,
      roles: ['super_admin', 'admin', 'observer'],
    },
  ];

  const filteredActions = quickActions.filter(
    (action) => userRole && action.roles.includes(userRole)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentInstance?.name || 'Instance'}
          </h1>
          <p className="text-gray-600 mt-1">
            Tableau de bord de l'election
          </p>
        </div>
        {currentInstance && getStatusBadge(currentInstance.status)}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '-' : card.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      {filteredActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:border-theme-primary hover:bg-theme-primary-light transition-all"
                >
                  <div className="p-2 rounded-lg bg-gray-100">
                    <action.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instance Info */}
      {currentInstance && (
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Date de creation</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(currentInstance.created_at).toLocaleDateString('fr-FR')}
                </dd>
              </div>
              {currentInstance.start_date && (
                <div>
                  <dt className="text-sm text-gray-500">Date de debut</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(currentInstance.start_date).toLocaleDateString('fr-FR')}
                  </dd>
                </div>
              )}
              {currentInstance.end_date && (
                <div>
                  <dt className="text-sm text-gray-500">Date de fin</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(currentInstance.end_date).toLocaleDateString('fr-FR')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">Taux de participation</dt>
                <dd className="font-medium text-gray-900">
                  {stats.totalVoters > 0
                    ? `${Math.round((stats.registeredVoters / stats.totalVoters) * 100)}%`
                    : '0%'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
