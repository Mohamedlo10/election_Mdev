'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart3, Users, Vote, TrendingUp, RefreshCw, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useInstance } from '@/contexts/InstanceContext';
import { getElectionStats } from '@/lib/services/election.service';
import { getInstanceResults, getVotesByHour } from '@/lib/services/vote.service';
import VoteEvolutionChart from '@/components/results/VoteEvolutionChart';
import CategoryBarChart from '@/components/results/CategoryBarChart';
import { generateElectionResultsPDF } from '@/lib/utils/pdfGenerator';
import type { CategoryResults, ElectionStats } from '@/types';

export default function InstanceResultsPage() {
  const params = useParams();
  const instanceId = params.instanceId as string;
  const { currentInstance } = useInstance();

  const [results, setResults] = useState<CategoryResults[]>([]);
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [voteEvolutionData, setVoteEvolutionData] = useState<any[]>([]);
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => {
    loadResults();
  }, [instanceId]);

  async function loadResults() {
    setLoading(true);

    const [resultsRes, statsRes, timingRes] = await Promise.all([
      getInstanceResults(instanceId),
      getElectionStats(instanceId),
      getVotesByHour(instanceId),
    ]);

    if (resultsRes.success && resultsRes.data) {
      setResults(resultsRes.data);
    }

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }

    if (timingRes.success && timingRes.data && timingRes.data.length > 0) {
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

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const electionData = {
        instanceName: currentInstance?.name || 'Élection',
        instanceLogo: currentInstance?.logo_url || undefined,
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 50) return 'var(--theme-primary)';
    if (percentage >= 25) return '#eab308';
    return '#9ca3af';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Resultats</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {currentInstance?.name} - Suivez les tendances des votes en temps reel
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={handleExportPDF} disabled={exporting || loading || results.length === 0} className="w-full sm:w-auto">
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
                <p className="text-2xl font-bold">{stats.registered_voters}/{stats.eligible_voters || stats.total_voters || stats.registered_voters}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Vote className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ont vote</p>
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
                <p className="text-sm text-gray-500">Categories</p>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun resultat</h3>
            <p className="text-gray-500">
              Les resultats apparaitront ici une fois que les votes auront commence
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryResult.candidates.map((candidateResult, index) => (
                      <div key={candidateResult.candidate.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-12 w-12 rounded-full bg-gray-100 overflow-hidden ring-2 ring-white shadow">
                                {candidateResult.candidate.photo_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={candidateResult.candidate.photo_url}
                                    alt={candidateResult.candidate.full_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-gray-400">
                                    {candidateResult.candidate.full_name
                                      .split(' ')
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join('')
                                      .toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span
                                className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white ${
                                  index === 0 && candidateResult.votes_count > 0
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {candidateResult.candidate.full_name}
                              </p>
                              <p className="text-xs text-gray-500">Score</p>
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">{candidateResult.votes_count} vote{candidateResult.votes_count !== 1 ? 's' : ''}</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {candidateResult.percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3">
                              <div
                                className="h-3 rounded-full transition-all duration-500"
                                style={{
                                  width: `${candidateResult.percentage}%`,
                                  backgroundColor: getProgressColor(candidateResult.percentage)
                                }}
                              />
                            </div>
                          </div>
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
