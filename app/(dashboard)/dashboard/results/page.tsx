'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Users, Vote, TrendingUp, RefreshCw, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { getAllInstances, getElectionStats } from '@/lib/services/election.service';
import { getInstanceResults, getVotesByHour } from '@/lib/services/vote.service';
import VoteEvolutionChart from '@/components/results/VoteEvolutionChart';
import CategoryBarChart from '@/components/results/CategoryBarChart';
import { generateElectionResultsPDF } from '@/lib/utils/pdfGenerator';
import type { ElectionInstance, CategoryResults, ElectionStats } from '@/types';

export default function ResultsPage() {
  const { authUser } = useAuth();
  const [instances, setInstances] = useState<ElectionInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [results, setResults] = useState<CategoryResults[]>([]);
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [voteEvolutionData, setVoteEvolutionData] = useState<any[]>([]);
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstanceId) {
      loadResults();
    }
  }, [selectedInstanceId]);

  async function loadInstances() {
    if (authUser?.role === 'super_admin') {
      const result = await getAllInstances();
      if (result.success && result.data) {
        setInstances(result.data);
        if (result.data.length > 0) {
          setSelectedInstanceId(result.data[0].id);
        }
      }
    } else if (authUser?.instance_id) {
      setSelectedInstanceId(authUser.instance_id);
    }
    setLoading(false);
  }

  async function loadResults() {
    setLoading(true);

    const [resultsRes, statsRes, timingRes] = await Promise.all([
      getInstanceResults(selectedInstanceId),
      getElectionStats(selectedInstanceId),
      getVotesByHour(selectedInstanceId),
    ]);

    if (resultsRes.success && resultsRes.data) {
      setResults(resultsRes.data);
    }

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }

    if (timingRes.success && timingRes.data && timingRes.data.length > 0) {
      // Transformer les données pour le graphique
      const transformedData = timingRes.data.map((item: any, index: number) => ({
        time: item.hour,
        votes: item.count,
        cumulativeVotes: timingRes.data!
          .slice(0, index + 1)
          .reduce((sum: number, curr: any) => sum + curr.count, 0),
      }));
      setVoteEvolutionData(transformedData);
    }

    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  }

  async function handleExportPDF() {
    if (!stats || results.length === 0) {
      alert('Aucun résultat à exporter');
      return;
    }

    try {
      setExporting(true);
      setShowCharts(true);

      // Attendre que les graphiques soient rendus
      await new Promise(resolve => setTimeout(resolve, 1000));

      const selectedInstance = instances.find(i => i.id === selectedInstanceId);
      
      const electionData = {
        instanceName: selectedInstance?.name || 'Élection',
        instanceLogo: selectedInstance?.logo_url || undefined,
        totalVoters: stats.registered_voters,
        totalVotes: stats.votes_cast,
        participationRate: stats.participation_rate,
        categories: results.map(cr => ({
          name: cr.category.name,
          candidates: cr.candidates.map(c => ({
            id: c.candidate.id,
            full_name: c.candidate.full_name,
            photo_url: c.candidate.photo_url,
            votes: c.votes_count,
            percentage: c.percentage,
          })),
        })),
      };

      const categoryChartIds = results.map((_, index) => `category-chart-${index}`);
      
      await generateElectionResultsPDF(
        electionData,
        voteEvolutionData.length > 0 ? 'evolution-chart' : undefined,
        categoryChartIds
      );

      setShowCharts(false);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExporting(false);
    }
  }

  const instanceOptions = instances.map((i) => ({
    value: i.id,
    label: i.name,
  }));

  const getProgressColor = (percentage: number) => {
    if (percentage >= 50) return 'bg-green-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Résultats</h1>
          <p className="text-gray-600 mt-1">Suivez les tendances des votes en temps réel</p>
        </div>
        <div className="flex items-center gap-4">
          {authUser?.role === 'super_admin' && instances.length > 0 && (
            <Select
              options={instanceOptions}
              value={selectedInstanceId}
              onChange={(e) => setSelectedInstanceId(e.target.value)}
              className="w-64"
            />
          )}
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={handleExportPDF} disabled={exporting || loading || results.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            {exporting ? 'Export en cours...' : 'Exporter PDF'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Votants inscrits</p>
                <p className="text-2xl font-bold">{stats.registered_voters}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Vote className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ont voté</p>
                <p className="text-2xl font-bold">{stats.votes_cast}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Participation</p>
                <p className="text-2xl font-bold">{stats.participation_rate.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Catégories</p>
                <p className="text-2xl font-bold">{stats.categories_count}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results by category */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48 bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat</h3>
            <p className="text-gray-500">
              Les résultats apparaîtront ici une fois que les votes auront commencé
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {results.map((categoryResult) => (
            <Card key={categoryResult.category.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{categoryResult.category.name}</CardTitle>
                <Badge>
                  {categoryResult.total_votes} vote{categoryResult.total_votes !== 1 ? 's' : ''}
                </Badge>
              </CardHeader>
              <CardContent>
                {categoryResult.candidates.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Aucun candidat</p>
                ) : (
                  <div className="space-y-4">
                    {categoryResult.candidates.map((candidateResult, index) => (
                      <div key={candidateResult.candidate.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 && candidateResult.votes_count > 0
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span className="font-medium text-gray-900">
                              {candidateResult.candidate.full_name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">
                              {candidateResult.votes_count}
                            </span>
                            <span className="text-gray-500 ml-2">
                              ({candidateResult.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(
                              candidateResult.percentage
                            )}`}
                            style={{ width: `${candidateResult.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Graphiques cachés pour l'export PDF */}
      {showCharts && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          {voteEvolutionData.length > 0 && (
            <div 
              id="evolution-chart" 
              style={{ 
                width: '1200px', 
                height: '600px', 
                backgroundColor: '#ffffff',
                padding: '20px',
                fontFamily: 'Arial, sans-serif',
                color: '#000000'
              }}
            >
              <VoteEvolutionChart data={voteEvolutionData} />
            </div>
          )}
          {results.map((categoryResult, index) => (
            <div
              key={categoryResult.category.id}
              id={`category-chart-${index}`}
              style={{ 
                width: '1200px', 
                height: '600px', 
                backgroundColor: '#ffffff',
                padding: '20px',
                fontFamily: 'Arial, sans-serif',
                color: '#000000'
              }}
            >
              <CategoryBarChart
                data={categoryResult.candidates.map(c => ({
                  name: c.candidate.full_name,
                  votes: c.votes_count,
                  percentage: c.percentage,
                }))}
                categoryName={categoryResult.category.name}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
