'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Vote,
  CheckCircle,
  User,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LogOut,
  Trophy,
  Award,
  BarChart3,
  Check,
  Send,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useInstance } from '@/contexts/InstanceContext';
import { getCandidates } from '@/lib/services/candidate.service';
import {
  createMultipleVotes,
  getCategoriesWithVoteStatus,
  getInstanceResults,
} from '@/lib/services/vote.service';
import { createClient } from '@/lib/supabase/client';
import SignOutConfirmDialog from '@/components/ui/SignOutConfirmDialog';
import type { Candidate, CategoryResults, CreateVote } from '@/types';

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

  const isSuperAdmin = authUser?.role === 'super_admin';
  const isAdminOnThisInstance = isSuperAdmin || authUser?.admin_instances?.some((i) => i.instance_id === instanceId);
  const isVoter = !isAdminOnThisInstance;

  const [categories, setCategories] = useState<CategoryWithStatus[]>([]);
  const [categoryCandidates, setCategoryCandidates] = useState<CategoryCandidates>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Sélections multiples : categoryId -> candidateId
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});
  const [activeVoterId, setActiveVoterId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [results, setResults] = useState<CategoryResults[]>([]);

  useEffect(() => {
    if (currentInstance) {
      if (currentInstance.status === 'completed') {
        loadResults();
      } else if (authUser) {
        loadData();
      }
    }
  }, [authUser, currentInstance]);

  async function loadData() {
    setLoading(true);
    setError('');

    // Vérifier si l'élection est active
    if (currentInstance?.status !== 'active') {
      setError("Cette élection n'est pas encore ouverte au vote");
      setLoading(false);
      return;
    }

    // Résoudre le voterId pour cette instance
    let voterId =
      authUser?.voter_instances?.find((i) => i.instance_id === instanceId)?.voter_id ||
      (authUser?.voter?.instance_id === instanceId ? authUser.voter.id : null);

    if (!voterId && authUser?.id) {
      const supabase = createClient();
      const { data: voterData } = await supabase
        .from('voters')
        .select('id')
        .eq('instance_id', instanceId)
        .eq('auth_uid', authUser.id)
        .maybeSingle();

      voterId = voterData?.id || null;
    }

    if (!voterId) {
      setError("Vous n'êtes pas inscrit comme votant sur cette élection.");
      setLoading(false);
      return;
    }

    setActiveVoterId(voterId);

    // Charger les catégories avec statut de vote
    const catResult = await getCategoriesWithVoteStatus(instanceId, voterId);

    if (catResult.success && catResult.data) {
      setCategories(catResult.data);

      // Charger les candidats pour toutes les catégories
      const allCandidates: CategoryCandidates = {};
      const expanded = new Set<string>();

      for (const cat of catResult.data) {
        const candResult = await getCandidates(cat.id);
        if (candResult.success && candResult.data) {
          allCandidates[cat.id] = candResult.data;
        }
        // Ouvrir toutes les catégories par défaut
        expanded.add(cat.id);
      }

      setCategoryCandidates(allCandidates);
      setExpandedCategories(expanded);
    } else {
      setError(catResult.error || 'Erreur lors du chargement des catégories');
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

  // Sélectionner ou désélectionner un candidat pour un poste/catégorie
  function handleToggleCandidate(categoryId: string, candidateId: string) {
    const category = categories.find((c) => c.id === categoryId);
    if (category?.hasVoted) return;

    setSelectedCandidates((prev) => {
      if (prev[categoryId] === candidateId) {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      }
      return { ...prev, [categoryId]: candidateId };
    });
  }

  // Validation groupée de tous les votes sélectionnés
  async function handleBatchVote() {
    const selectedEntries = Object.entries(selectedCandidates);
    if (!activeVoterId || selectedEntries.length === 0) return;

    setVoting(true);
    setError('');

    const votesToSubmit: CreateVote[] = selectedEntries.map(([categoryId, candidateId]) => ({
      voter_id: activeVoterId,
      category_id: categoryId,
      candidate_id: candidateId,
      instance_id: instanceId,
    }));

    const result = await createMultipleVotes(votesToSubmit);

    if (result.success) {
      setShowConfirmModal(false);
      setSubmittedCount(votesToSubmit.length);
      setShowSuccessModal(true);

      // Mise à jour locale immédiate pour éviter le rechargement
      setCategories((prev) =>
        prev.map((cat) => {
          const chosenCandidateId = selectedCandidates[cat.id];
          if (chosenCandidateId) {
            return { ...cat, hasVoted: true, votedCandidateId: chosenCandidateId };
          }
          return cat;
        })
      );

      // Réinitialiser les sélections en attente
      setSelectedCandidates({});
    } else {
      setError(result.error || 'Erreur lors de la validation des votes');
      setShowConfirmModal(false);
    }

    setVoting(false);
  }

  // Calculs de statut
  const completedCount = categories.filter((c) => c.hasVoted).length;
  const totalCount = categories.length;
  const unvotedCategories = categories.filter((c) => !c.hasVoted);
  const pendingSelectedCount = Object.keys(selectedCandidates).length;
  const totalChosenCount = completedCount + pendingSelectedCount;
  const allVoted = completedCount === totalCount && totalCount > 0;

  // Header pour les votants
  const VoterHeader = () =>
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
              <h2 className="font-bold text-gray-900 truncate">{currentInstance?.name || 'Election'}</h2>
              <p className="text-sm text-gray-500 truncate">{authUser?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setIsSignOutOpen(true)}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>
    ) : null;

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

        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Résultats de l'élection</h1>
          <p className="text-gray-600 mt-1">{currentInstance?.name}</p>
        </div>

        <div className="space-y-6">
          {results.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun résultat disponible</p>
              </CardContent>
            </Card>
          ) : (
            results.map((categoryResult) => {
              const sortedCandidates = [...categoryResult.candidates].sort((a, b) => b.votes_count - a.votes_count);
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
                            {categoryResult.total_votes} vote{categoryResult.total_votes !== 1 ? 's' : ''} exprimé
                            {categoryResult.total_votes !== 1 ? 's' : ''}
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
                      <p className="text-center text-gray-500 py-4">Aucun vote dans cette catégorie</p>
                    ) : (
                      <div className="space-y-4">
                        {sortedCandidates.map((candidateResult, index) => {
                          const isWinner = index === 0;

                          return (
                            <div
                              key={candidateResult.candidate.id}
                              className={`relative p-4 rounded-lg border-2 ${
                                isWinner ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 bg-gray-50'
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
                                {candidateResult.candidate.photo_url ? (
                                  <img
                                    src={candidateResult.candidate.photo_url}
                                    alt={candidateResult.candidate.full_name}
                                    className={`w-14 h-14 rounded-full object-cover ${
                                      isWinner ? 'ring-2 ring-yellow-400' : ''
                                    }`}
                                  />
                                ) : (
                                  <div
                                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                      isWinner ? 'bg-yellow-100' : 'bg-gray-100'
                                    }`}
                                  >
                                    <User className={`w-7 h-7 ${isWinner ? 'text-yellow-600' : 'text-gray-400'}`} />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-semibold ${isWinner ? 'text-yellow-700' : 'text-gray-900'}`}>
                                      {candidateResult.candidate.full_name}
                                    </h4>
                                    {index > 0 && <span className="text-xs text-gray-400">#{index + 1}</span>}
                                  </div>

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
              <h2 className="text-xl font-bold text-gray-900 mb-2">Élection non disponible</h2>
              <p className="text-gray-600">
                {currentInstance?.status === 'draft' && "Cette élection n'a pas encore démarré."}
                {currentInstance?.status === 'paused' && 'Cette élection est actuellement en pause.'}
                {currentInstance?.status === 'archived' && 'Cette élection a été archivée.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header pour les votants */}
      <VoterHeader />

      {/* Titre et progression globale */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bulletin de vote</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Sélectionnez vos candidats pour chaque poste puis validez l'ensemble de votre vote en une seule fois.
          </p>
        </div>
        {allVoted ? (
          <Badge variant="success" size="md">
            <CheckCircle className="w-4 h-4 mr-1" />
            Vote complet ({totalCount}/{totalCount})
          </Badge>
        ) : pendingSelectedCount > 0 ? (
          <Badge variant="warning" size="md">
            <Sparkles className="w-4 h-4 mr-1" />
            {pendingSelectedCount} sélection(s) en attente
          </Badge>
        ) : null}
      </div>

      {/* Carte de progression */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progression des choix</span>
            <span className="text-sm font-semibold text-gray-900">
              {totalChosenCount}/{totalCount} poste(s)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden flex">
            {/* Déjà voté */}
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
            {/* Sélectionné en cours */}
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (pendingSelectedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                Voté ({completedCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Sélectionné ({pendingSelectedCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
                Restant ({Math.max(0, totalCount - totalChosenCount)})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="error">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Fermer
          </button>
        </Alert>
      )}

      {/* Liste des postes / catégories */}
      <div className="space-y-5">
        {categories.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Vote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune catégorie disponible</p>
            </CardContent>
          </Card>
        ) : (
          categories.map((category) => {
            const candidates = categoryCandidates[category.id] || [];
            const isExpanded = expandedCategories.has(category.id);
            const votedCandidate = candidates.find((c) => c.id === category.votedCandidateId);
            const pendingCandidateId = selectedCandidates[category.id];
            const pendingCandidate = candidates.find((c) => c.id === pendingCandidateId);

            return (
              <Card
                key={category.id}
                className={`overflow-hidden transition-all border-2 ${
                  category.hasVoted
                    ? 'border-green-200'
                    : pendingCandidateId
                    ? 'border-blue-300 shadow-sm'
                    : 'border-gray-200'
                }`}
              >
                <CardHeader
                  className={`cursor-pointer transition-colors ${
                    category.hasVoted
                      ? 'bg-green-50/70'
                      : pendingCandidateId
                      ? 'bg-blue-50/50 hover:bg-blue-50/80'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          category.hasVoted
                            ? 'bg-green-100 text-green-600'
                            : pendingCandidateId
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {category.hasVoted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : pendingCandidateId ? (
                          <Check className="w-5 h-5 font-bold" />
                        ) : (
                          <Vote className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base sm:text-lg truncate">{category.name}</CardTitle>
                          {category.hasVoted ? (
                            <Badge variant="success" size="sm">
                              Vote enregistré
                            </Badge>
                          ) : pendingCandidateId ? (
                            <Badge variant="info" size="sm">
                              Sélectionné
                            </Badge>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              À choisir
                            </span>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">{category.description}</p>
                        )}
                        {category.hasVoted && votedCandidate && (
                          <p className="text-xs sm:text-sm text-green-700 mt-1 font-medium">
                            Vote validé pour : <span className="underline">{votedCandidate.full_name}</span>
                          </p>
                        )}
                        {!category.hasVoted && pendingCandidate && (
                          <p className="text-xs sm:text-sm text-blue-700 mt-1 font-medium">
                            Choix sélectionné : <span className="underline">{pendingCandidate.full_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
                        {candidates.length} candidat(s)
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t border-gray-100 pt-4">
                    {candidates.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Aucun candidat dans cette catégorie</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {candidates.map((candidate) => {
                          const isVotedFor = category.votedCandidateId === candidate.id;
                          const isPendingSelected = pendingCandidateId === candidate.id;

                          return (
                            <div
                              key={candidate.id}
                              className={`relative p-4 rounded-xl border-2 transition-all select-none ${
                                isVotedFor
                                  ? 'border-green-500 bg-green-50'
                                  : isPendingSelected
                                  ? 'border-blue-500 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20'
                                  : category.hasVoted
                                  ? 'border-gray-200 bg-gray-50 opacity-60'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/60 hover:shadow-sm cursor-pointer'
                              }`}
                              onClick={() => !category.hasVoted && handleToggleCandidate(category.id, candidate.id)}
                            >
                              {/* Badge sélectionné en cours */}
                              {isPendingSelected && (
                                <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              )}

                              {/* Badge déjà voté */}
                              {isVotedFor && (
                                <div className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full p-1 shadow">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </div>
                              )}

                              <div className="flex items-center gap-3">
                                {candidate.photo_url ? (
                                  <img
                                    src={candidate.photo_url}
                                    alt={candidate.full_name}
                                    className={`w-14 h-14 rounded-full object-cover ${
                                      isPendingSelected
                                        ? 'ring-2 ring-blue-500'
                                        : isVotedFor
                                        ? 'ring-2 ring-green-500'
                                        : ''
                                    }`}
                                  />
                                ) : (
                                  <div
                                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                      isPendingSelected
                                        ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                                        : isVotedFor
                                        ? 'bg-green-100 text-green-600 ring-2 ring-green-500'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}
                                  >
                                    <User className="w-7 h-7" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className={`font-semibold truncate ${
                                      isPendingSelected
                                        ? 'text-blue-900'
                                        : isVotedFor
                                        ? 'text-green-800'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {candidate.full_name}
                                  </h4>
                                  {candidate.description && (
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                      {candidate.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {!category.hasVoted && (
                                <button
                                  type="button"
                                  className={`w-full mt-3 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                                    isPendingSelected
                                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                      : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleCandidate(category.id, candidate.id);
                                  }}
                                >
                                  {isPendingSelected ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      Sélectionné (Cliquer pour retirer)
                                    </>
                                  ) : (
                                    'Sélectionner ce candidat'
                                  )}
                                </button>
                              )}

                              {isVotedFor && (
                                <div className="mt-3 text-center">
                                  <span className="text-xs font-medium text-green-700 bg-green-100/60 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Votre vote enregistré
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

      {/* Barre d'action fixe en bas (Sticky Bottom Bar) */}
      {!allVoted && unvotedCategories.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-xl md:max-w-2xl z-30 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl p-4 transition-all">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  pendingSelectedCount === unvotedCategories.length
                    ? 'bg-green-100 text-green-700'
                    : pendingSelectedCount > 0
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {pendingSelectedCount}/{unvotedCategories.length}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {pendingSelectedCount === 0
                    ? 'Aucun candidat sélectionné'
                    : pendingSelectedCount === unvotedCategories.length
                    ? 'Tous les postes sont choisis !'
                    : `${pendingSelectedCount} poste(s) sur ${unvotedCategories.length} sélectionné(s)`}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {pendingSelectedCount > 0
                    ? 'Prêt à valider votre vote groupé'
                    : 'Cliquez sur les candidats pour faire votre choix'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {pendingSelectedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCandidates({})}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Effacer
                </Button>
              )}
              <Button
                size="md"
                disabled={pendingSelectedCount === 0}
                onClick={() => setShowConfirmModal(true)}
                className="flex-1 sm:flex-initial shadow-md"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Valider mon vote ({pendingSelectedCount})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmation Récapitulatif Global */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirmer votre vote" size="lg">
        <div className="space-y-4">
          <Alert variant="warning">
            Votre vote est <strong>définitif</strong>. Une fois validé, il sera enregistré de manière sécurisée et ne
            pourra plus être modifié.
          </Alert>

          <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Récapitulatif de vos choix ({pendingSelectedCount} poste(s)) :
            </h3>

            {categories.map((category) => {
              const candidates = categoryCandidates[category.id] || [];
              const pendingCandidateId = selectedCandidates[category.id];
              const pendingCandidate = candidates.find((c) => c.id === pendingCandidateId);
              const alreadyVotedCandidate = candidates.find((c) => c.id === category.votedCandidateId);

              if (category.hasVoted) {
                return (
                  <div
                    key={category.id}
                    className="p-3 bg-green-50/60 border border-green-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs text-green-800 font-medium">{category.name}</span>
                      <p className="font-semibold text-gray-900 text-sm">
                        {alreadyVotedCandidate?.full_name || 'Vote déjà enregistré'}
                      </p>
                    </div>
                    <Badge variant="success" size="sm">
                      Déjà voté
                    </Badge>
                  </div>
                );
              }

              if (pendingCandidate) {
                return (
                  <div
                    key={category.id}
                    className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {pendingCandidate.photo_url ? (
                        <img
                          src={pendingCandidate.photo_url}
                          alt={pendingCandidate.full_name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-400"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs text-blue-700 font-semibold uppercase">{category.name}</span>
                        <p className="font-bold text-gray-900 text-sm truncate">{pendingCandidate.full_name}</p>
                      </div>
                    </div>
                    <Badge variant="info" size="sm">
                      <Check className="w-3 h-3 mr-1" />
                      Sélectionné
                    </Badge>
                  </div>
                );
              }

              return (
                <div
                  key={category.id}
                  className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-between gap-3 text-gray-500"
                >
                  <div>
                    <span className="text-xs text-gray-500 font-medium">{category.name}</span>
                    <p className="font-medium text-xs text-amber-600">Aucun choix (Vote blanc)</p>
                  </div>
                  <span className="text-xs text-gray-400">Non sélectionné</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={voting}>
              Modifier mes choix
            </Button>
            <Button onClick={handleBatchVote} loading={voting} className="gap-2">
              <Send className="w-4 h-4" />
              Confirmer définitivement mon vote
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Succès */}
      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} size="sm">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vote enregistré !</h2>
          <p className="text-gray-600 mb-6">
            Vos <strong>{submittedCount}</strong> vote(s) ont été enregistrés avec succès.
          </p>
          <Button onClick={() => setShowSuccessModal(false)} className="w-full">
            Continuer
          </Button>
        </div>
      </Modal>

      <SignOutConfirmDialog isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} />
    </div>
  );
}
