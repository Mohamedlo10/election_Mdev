'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  Building2,
  Users,
  Vote,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
  totalInstances: number;
  activeInstances: number;
  totalVoters: number;
  totalVotes: number;
}

export default function DashboardPage() {
  const { authUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalInstances: 0,
    activeInstances: 0,
    totalVoters: 0,
    totalVotes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();

      if (authUser?.role === 'super_admin') {
        // Stats pour super admin
        const [instancesRes, activeRes, votersRes, votesRes] = await Promise.all([
          supabase.from('election_instances').select('id', { count: 'exact', head: true }),
          supabase.from('election_instances').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('voters').select('id', { count: 'exact', head: true }),
          supabase.from('votes').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          totalInstances: instancesRes.count || 0,
          activeInstances: activeRes.count || 0,
          totalVoters: votersRes.count || 0,
          totalVotes: votesRes.count || 0,
        });
      } else if (authUser?.role === 'admin' || authUser?.role === 'observer') {
        // Stats pour admin/observer d'une instance
        const instanceId = authUser.instance_id;
        if (instanceId) {
          const [votersRes, votesRes] = await Promise.all([
            supabase.from('voters').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId),
            supabase.from('votes').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId),
          ]);

          setStats({
            totalInstances: 1,
            activeInstances: 1,
            totalVoters: votersRes.count || 0,
            totalVotes: votesRes.count || 0,
          });
        }
      } else if (authUser?.role === 'voter') {
        // Stats pour votant
        const voterId = authUser.voter?.id;
        if (voterId) {
          const votesRes = await supabase.from('votes').select('id', { count: 'exact', head: true }).eq('voter_id', voterId);
          setStats({
            totalInstances: 1,
            activeInstances: 1,
            totalVoters: 1,
            totalVotes: votesRes.count || 0,
          });
        }
      }

      setLoading(false);
    }

    if (authUser) {
      loadStats();
    }
  }, [authUser]);

  const getWelcomeMessage = () => {
    switch (authUser?.role) {
      case 'super_admin':
        return 'Vue d\'ensemble de toutes les élections';
      case 'admin':
        return 'Gérez votre instance d\'élection';
      case 'observer':
        return 'Suivez les tendances des votes';
      case 'voter':
        return 'Participez aux élections';
      default:
        return 'Bienvenue sur MDev_Election';
    }
  };

  const statCards = [
    {
      title: authUser?.role === 'super_admin' ? 'Instances' : 'Mon instance',
      value: stats.totalInstances,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      show: ['super_admin', 'admin', 'observer'].includes(authUser?.role || ''),
    },
    {
      title: 'Instances actives',
      value: stats.activeInstances,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      show: authUser?.role === 'super_admin',
    },
    {
      title: 'Votants',
      value: stats.totalVoters,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      show: ['super_admin', 'admin', 'observer'].includes(authUser?.role || ''),
    },
    {
      title: authUser?.role === 'voter' ? 'Mes votes' : 'Votes',
      value: stats.totalVotes,
      icon: Vote,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      show: true,
    },
  ];

  const quickActions = [
    {
      title: 'Créer une instance',
      description: 'Démarrer une nouvelle élection',
      href: '/dashboard/instances',
      icon: Building2,
      roles: ['super_admin'],
    },
    {
      title: 'Gérer les catégories',
      description: 'Ajouter ou modifier des catégories',
      href: '/dashboard/categories',
      icon: AlertCircle,
      roles: ['admin', 'super_admin'],
    },
    {
      title: 'Importer des votants',
      description: 'Importer depuis un fichier Excel',
      href: '/dashboard/voters',
      icon: Users,
      roles: ['admin', 'super_admin'],
    },
    {
      title: 'Voter',
      description: 'Participer à l\'élection',
      href: '/dashboard/vote',
      icon: Vote,
      roles: ['voter'],
    },
    {
      title: 'Voir les résultats',
      description: 'Consulter les tendances',
      href: '/dashboard/results',
      icon: BarChart3,
      roles: ['super_admin', 'admin', 'observer'],
    },
  ];

  const filteredActions = quickActions.filter(
    (action) => authUser && action.roles.includes(authUser.role)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {authUser?.email?.split('@')[0]}
        </h1>
        <p className="text-gray-600 mt-1">{getWelcomeMessage()}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards
          .filter((card) => card.show)
          .map((card) => (
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
              <a
                key={action.href}
                href={action.href}
                className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all"
              >
                <div className="p-2 rounded-lg bg-gray-100">
                  <action.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
