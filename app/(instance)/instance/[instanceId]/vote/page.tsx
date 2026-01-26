'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Vote, CheckCircle, User, AlertCircle, ChevronDown, ChevronUp, LogOut, Trophy, Award, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useInstance } from '@/contexts/InstanceContext';
import { getCandidates } from '@/lib/services/candidate.service';
import { createVote, getCategoriesWithVoteStatus, getInstanceResults } from '@/lib/services/vote.service';
import type { Candidate, CategoryResults } from '@/types';

interface CategoryWithStatus {
  id: string;
  name: string;
  description: string | null;
  order: number;
  hasVoted: boolean;
  votedCandidateId: string | null;
}

interface CategoryCandidates {
  [categoryId: string]: Candidate[];
}

export default function InstanceVotePage() {
  const params = useParams();
  const instanceId = params.instanceId as string;
  const { authUser, signOut } = useAuth();
  const { currentInstance } = useInstance();
  const isVoter = authUser?.role === 'voter';

  const [categories, setCategories] = useState<CategoryWithStatus[]>([]);
  const [categoryCandidates, setCategoryCandidates] = useState<CategoryCandidates>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithStatus | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [results, setResults] = useState<CategoryResults[]>([]);

  useEffect(() => {
    if (currentInstance) {
      if (currentInstance.status === 'completed') {
        loadResults();
      } else if (authUser?.voter?.id) {
        loadData();
      }
    }
  }, [authUser, currentInstance]);

  async function loadData() {
    setLoading(true);

    // Verifier si l'election est active
    if (currentInstance?.status !== 'active') {
      setError('Cette election n\'est pas encore ouverte au vote');
      setLoading(false);
      return;
    }

    // Charger les categories avec statut de vote
    const catResult = await getCategoriesWithVoteStatus(
      instanceId,
      authUser!.voter!.id
    );

    if (catResult.success && catResult.data) {
      setCategories(catResult.data);

      // Charger les candidats pour toutes les categories
      const allCandidates: CategoryCandidates = {};
      const expanded = new Set<string>();

      for (const cat of catResult.data) {
        const candResult = await getCandidates(cat.id);
        if (candResult.success && candResult.data) {
          allCandidates[cat.id] = candResult.data;
        }
        // Ouvrir toutes les categories par defaut
        expanded.add(cat.id);
      }

      setCategoryCandidates(allCandidates);
      setExpandedCategories(expanded);
    }

    setLoading(false);
  }

  async function loadResults() {
    setLoading(true);
    const result = await getInstanceResults(instanceId);
    if (result.success && result.data) {
      setResults(result.data);
    }
    setLoading(false);
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }

  function handleCandidateSelect(category: CategoryWithStatus, candidate: Candidate) {
    if (category.hasVoted) return;
    setSelectedCategory(category);
    setSelectedCandidate(candidate);
    setShowConfirmModal(true);
  }

  async function handleVote() {
    if (!selectedCategory || !selectedCandidate || !authUser?.voter?.id) return;

    setVoting(true);
    const result = await createVote({
      voter_id: authUser.voter.id,
      candidate_id: selectedCandidate.id,
      category_id: selectedCategory.id,
      instance_id: instanceId,
    });

    if (result.success) {
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      loadData();
      setSelectedCategory(null);
      setSelectedCandidate(null);
    } else {
      setError(result.error || 'Erreur lors du vote');
    }
    setVoting(false);
  }

  const completedCount = categories.filter((c) => c.hasVoted).length;
  const totalCount = categories.length;
  const allVoted = completedCount === totalCount && totalCount > 0;

  // Header pour les votants (utilise dans loading et error)
  const VoterHeader = () => (
    isVoter ? (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 mb-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {currentInstance?.logo_url ? (
              <img
                src={currentInstance.logo_url}
                alt={currentInstance?.name || 'Election'}
                className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                <Vote className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 truncate">
                {currentInstance?.name || 'Election'}
              </h2>
              <p className="text-sm text-gray-500 truncate">{authUser?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Deconnexion
          </Button>
        </div>
      </div>
    ) : null
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <VoterHeader />
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 bg-gray-100" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Afficher les résultats quand l'élection est terminée
  if (currentInstance?.status === 'completed') {
    return (
      <div className="space-y-6">
        <VoterHeader />

        {/* Header résultats */}
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Resultats de l'election</h1>
          <p className="text-gray-600 mt-1">{currentInstance?.name}</p>
        </div>

        {/* Résultats par catégorie */}
        <div className="space-y-6">
          {results.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun resultat disponible</p>
              </CardContent>
            </Card>
          ) : (
            results.map((categoryResult) => {
              const sortedCandidates = [...categoryResult.candidates].sort(
                (a, b) => b.votes_count - a.votes_count
              );
              const winner = sortedCandidates[0];
              const hasVotes = categoryResult.total_votes > 0;

              return (
                <Card key={categoryResult.category.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                          <Award className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{categoryResult.category.name}</CardTitle>
                          <p className="text-sm text-gray-500">
                            {categoryResult.total_votes} vote{categoryResult.total_votes !== 1 ? 's' : ''} exprime{categoryResult.total_votes !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {hasVotes && winner && (
                        <Badge variant="success" size="md">
                          <Trophy className="w-3 h-3 mr-1" />
                          {winner.candidate.full_name}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    {!hasVotes ? (
                      <p className="text-center text-gray-500 py-4">Aucun vote dans cette categorie</p>
                    ) : (
                      <div className="space-y-4">
                        {sortedCandidates.map((candidateResult, index) => {
                          const isWinner = index === 0;

                          return (
                            <div
                              key={candidateResult.candidate.id}
                              className={`relative p-4 rounded-lg border-2 ${
                                isWinner
                                  ? 'border-yellow-400 bg-yellow-50'
                                  : 'border-gray-100 bg-gray-50'
                              }`}
                            >
                              {isWinner && (
                                <div className="absolute -top-3 -left-2">
                                  <div className="bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    1er
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-4">
                                {/* Photo */}
                                {candidateResult.candidate.photo_url ? (
                                  <img
                                    src={candidateResult.candidate.photo_url}
                                    alt={candidateResult.candidate.full_name}
                                    className={`w-14 h-14 rounded-full object-cover ${
                                      isWinner ? 'ring-2 ring-yellow-400' : ''
                                    }`}
                                  />
                                ) : (
                                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                    isWinner ? 'bg-yellow-100' : 'bg-gray-100'
                                  }`}>
                                    <User className={`w-7 h-7 ${isWinner ? 'text-yellow-600' : 'text-gray-400'}`} />
                                  </div>
                                )}

                                {/* Infos */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-semibold ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                                      {candidateResult.candidate.full_name}
                                    </h4>
                                    {index > 0 && (
                                      <span className="text-xs text-gray-400">#{index + 1}</span>
                                    )}
                                  </div>

                                  {/* Progress bar */}
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-sm mb-1">
                                      <span className="text-gray-600">
                                        {candidateResult.votes_count} vote{candidateResult.votes_count !== 1 ? 's' : ''}
                                      </span>
                                      <span className={`font-medium ${isWinner ? 'text-yellow-600' : 'text-gray-500'}`}>
                                        {candidateResult.percentage.toFixed(1)}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                      <div
                                        className={`h-2.5 rounded-full transition-all duration-500 ${
                                          isWinner ? 'bg-yellow-400' : 'bg-gray-400'
                                        }`}
                                        style={{ width: `${candidateResult.percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Autres statuts non votables
  if (error && currentInstance?.status !== 'active') {
    return (
      <div className="space-y-6">
        <VoterHeader />
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="text-center py-8">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Election non disponible
              </h2>
              <p className="text-gray-600">
                {currentInstance?.status === 'draft' && 'Cette election n\'a pas encore demarre.'}
                {currentInstance?.status === 'paused' && 'Cette election est actuellement en pause.'}
                {currentInstance?.status === 'archived' && 'Cette election a ete archivee.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header pour les votants */}
      <VoterHeader />

      {/* Titre et progression */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Voter</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {completedCount}/{totalCount} categories votees
          </p>
        </div>
        {allVoted && (
          <Badge variant="success" size="md">
            <CheckCircle className="w-4 h-4 mr-1" />
            Vote complet
          </Badge>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progression</span>
            <span className="text-sm text-gray-500">{completedCount}/{totalCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                backgroundColor: 'var(--theme-primary)',
              }}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="error">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </Alert>
      )}

      {/* Categories avec candidats */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Vote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune categorie disponible</p>
            </CardContent>
          </Card>
        ) : (
          categories.map((category) => {
            const candidates = categoryCandidates[category.id] || [];
            const isExpanded = expandedCategories.has(category.id);
            const votedCandidate = candidates.find((c) => c.id === category.votedCandidateId);

            return (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader
                  className={`cursor-pointer transition-colors ${
                    category.hasVoted ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          category.hasVoted ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        {category.hasVoted ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Vote className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {category.name}
                          {category.hasVoted && (
                            <Badge variant="success" size="sm">Vote</Badge>
                          )}
                        </CardTitle>
                        {category.description && (
                          <p className="text-sm text-gray-500">{category.description}</p>
                        )}
                        {category.hasVoted && votedCandidate && (
                          <p className="text-sm text-green-600 mt-1">
                            Vous avez vote pour : <span className="font-medium">{votedCandidate.full_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{candidates.length} candidat(s)</span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t border-gray-100">
                    {candidates.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Aucun candidat dans cette categorie</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                        {candidates.map((candidate) => {
                          const isVotedFor = category.votedCandidateId === candidate.id;

                          return (
                            <div
                              key={candidate.id}
                              className={`relative p-4 rounded-lg border-2 transition-all ${
                                isVotedFor
                                  ? 'border-green-500 bg-green-50'
                                  : category.hasVoted
                                  ? 'border-gray-200 bg-gray-50 opacity-60'
                                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer'
                              }`}
                              onClick={() => !category.hasVoted && handleCandidateSelect(category, candidate)}
                            >
                              {isVotedFor && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              )}

                              <div className="flex items-center gap-3">
                                {candidate.photo_url ? (
                                  <img
                                    src={candidate.photo_url}
                                    alt={candidate.full_name}
                                    className={`w-14 h-14 rounded-full object-cover ${
                                      isVotedFor ? 'ring-2 ring-green-500' : ''
                                    }`}
                                  />
                                ) : (
                                  <div
                                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                      isVotedFor ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-100'
                                    }`}
                                  >
                                    <User className={`w-7 h-7 ${isVotedFor ? 'text-green-600' : 'text-gray-400'}`} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-semibold truncate ${isVotedFor ? 'text-green-700' : 'text-gray-900'}`}>
                                    {candidate.full_name}
                                  </h4>
                                  {candidate.description && (
                                    <p className="text-sm text-gray-500 line-clamp-2">{candidate.description}</p>
                                  )}
                                </div>
                              </div>

                              {!category.hasVoted && (
                                <Button
                                  size="sm"
                                  className="w-full mt-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCandidateSelect(category, candidate);
                                  }}
                                >
                                  Voter pour ce candidat
                                </Button>
                              )}

                              {isVotedFor && (
                                <div className="mt-3 text-center">
                                  <span className="text-sm font-medium text-green-600">
                                    Votre choix
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirmer votre vote"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            Votre vote est definitif et ne pourra pas etre modifie.
          </Alert>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Categorie</p>
            <p className="font-medium text-gray-900">{selectedCategory?.name}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Candidat selectionne</p>
            <div className="flex items-center gap-3">
              {selectedCandidate?.photo_url ? (
                <img
                  src={selectedCandidate.photo_url}
                  alt={selectedCandidate.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <p className="font-semibold text-gray-900">{selectedCandidate?.full_name}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleVote} loading={voting}>
              Confirmer mon vote
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vote enregistre !</h2>
          <p className="text-gray-600 mb-6">
            Votre vote a ete enregistre avec succes.
          </p>
          <Button onClick={() => setShowSuccessModal(false)} className="w-full">
            Continuer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
