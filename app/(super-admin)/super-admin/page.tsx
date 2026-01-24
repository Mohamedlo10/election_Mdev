'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  Building2,
  Users,
  Vote,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { ElectionInstance } from '@/types';

interface GlobalStats {
  totalInstances: number;
  activeInstances: number;
  totalVoters: number;
  totalVotes: number;
  registeredVoters: number;
}

export default function SuperAdminDashboardPage() {
  const { authUser } = useAuth();
  const [stats, setStats] = useState<GlobalStats>({
    totalInstances: 0,
    activeInstances: 0,
    totalVoters: 0,
    totalVotes: 0,
    registeredVoters: 0,
  });
  const [recentInstances, setRecentInstances] = useState<ElectionInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Charger les stats globales
      const [instancesRes, activeRes, votersRes, registeredRes, votesRes] = await Promise.all([
        supabase.from('election_instances').select('id', { count: 'exact', head: true }),
        supabase.from('election_instances').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('voters').select('id', { count: 'exact', head: true }),
        supabase.from('voters').select('id', { count: 'exact', head: true }).eq('is_registered', true),
        supabase.from('votes').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalInstances: instancesRes.count || 0,
        activeInstances: activeRes.count || 0,
        totalVoters: votersRes.count || 0,
        registeredVoters: registeredRes.count || 0,
        totalVotes: votesRes.count || 0,
      });

      // Charger les instances recentes
      const { data: instances } = await supabase
        .from('election_instances')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (instances) {
        setRecentInstances(instances);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const statCards = [
    {
      title: 'Total Instances',
      value: stats.totalInstances,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Instances Actives',
      value: stats.activeInstances,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Votants Inscrits',
      value: `${stats.registeredVoters}/${stats.totalVoters}`,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Votes Totaux',
      value: stats.totalVotes,
      icon: Vote,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  const quickActions = [
    {
      title: 'Creer une instance',
      description: 'Demarrer une nouvelle election',
      href: '/super-admin/instances',
      icon: Building2,
    },
    {
      title: 'Gerer les comptes',
      description: 'Ajouter des admins et observers',
      href: '/super-admin/accounts',
      icon: Users,
    },
  ];

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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Dashboard Super Admin
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Vue d&apos;ensemble de toutes les elections
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all"
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

        {/* Recent Instances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              Instances recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500 text-center py-4">Chargement...</p>
            ) : recentInstances.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune instance</p>
            ) : (
              <div className="space-y-3">
                {recentInstances.map((instance) => (
                  <Link
                    key={instance.id}
                    href={`/instance/${instance.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: instance.primary_color }}
                      />
                      <span className="font-medium text-gray-900">{instance.name}</span>
                    </div>
                    {getStatusBadge(instance.status)}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
