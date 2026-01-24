'use client';

import { useEffect, useState } from 'react';
import { Vote, CheckCircle, User, ChevronRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { getCandidates } from '@/lib/services/candidate.service';
import { createVote, getCategoriesWithVoteStatus, getVoterVotes } from '@/lib/services/vote.service';
import { getInstance } from '@/lib/services/election.service';
import type { Candidate, ElectionInstance, VoteWithDetails } from '@/types';

interface CategoryWithStatus {
  id: string;
  name: string;
  description: string | null;
  order: number;
  hasVoted: boolean;
  votedCandidateId: string | null;
}

export default function VotePage() {
  const { authUser } = useAuth();
  const [instance, setInstance] = useState<ElectionInstance | null>(null);
  const [categories, setCategories] = useState<CategoryWithStatus[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithStatus | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [myVotes, setMyVotes] = useState<VoteWithDetails[]>([]);
  const [showMyVotes, setShowMyVotes] = useState(false);

  useEffect(() => {
    if (authUser?.instance_id && authUser?.voter?.id) {
      loadData();
    }
  }, [authUser]);

  async function loadData() {
    setLoading(true);

    // Charger l'instance
    const instanceResult = await getInstance(authUser!.instance_id!);
    if (instanceResult.success && instanceResult.data) {
      setInstance(instanceResult.data);

      // Vérifier si l'élection est active
      if (instanceResult.data.status !== 'active') {
        setError('Cette élection n\'est pas encore ouverte au vote');
        setLoading(false);
        return;
      }
    }

    // Charger les catégories avec statut de vote
    const catResult = await getCategoriesWithVoteStatus(
      authUser!.instance_id!,
      authUser!.voter!.id
    );

    if (catResult.success && catResult.data) {
      setCategories(catResult.data);
    }

    // Charger les votes déjà effectués
    const votesResult = await getVoterVotes(authUser!.voter!.id);
    if (votesResult.success && votesResult.data) {
      setMyVotes(votesResult.data);
    }

    setLoading(false);
  }

  async function loadCandidates(categoryId: string) {
    const result = await getCandidates(categoryId);
    if (result.success && result.data) {
      setCandidates(result.data);
    }
  }

  function handleCategorySelect(category: CategoryWithStatus) {
    if (category.hasVoted) return;
    setSelectedCategory(category);
    setSelectedCandidate(null);
    loadCandidates(category.id);
  }

  function handleCandidateSelect(candidate: Candidate) {
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
      instance_id: authUser.instance_id!,
    });

    if (result.success) {
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      // Rafraîchir les catégories
      loadData();
      setSelectedCategory(null);
      setSelectedCandidate(null);
      setCandidates([]);
    } else {
      setError(result.error || 'Erreur lors du vote');
    }
    setVoting(false);
  }

  const completedCount = categories.filter((c) => c.hasVoted).length;
  const totalCount = categories.length;
  const allVoted = completedCount === totalCount && totalCount > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 bg-gray-100" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && instance?.status !== 'active') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Élection non disponible
            </h2>
            <p className="text-gray-600">
              {instance?.status === 'draft' && 'Cette élection n\'a pas encore démarré.'}
              {instance?.status === 'paused' && 'Cette élection est actuellement en pause.'}
              {instance?.status === 'completed' && 'Cette élection est terminée.'}
              {instance?.status === 'archived' && 'Cette élection a été archivée.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voter</h1>
          <p className="text-gray-600 mt-1">
            {instance?.name} - {completedCount}/{totalCount} catégories votées
          </p>
        </div>
        <div className="flex items-center gap-3">
          {myVotes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMyVotes(!showMyVotes)}
            >
              {showMyVotes ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Masquer mes votes
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Voir mes votes
                </>
              )}
            </Button>
          )}
          {allVoted && (
            <Badge variant="success" size="md">
              <CheckCircle className="w-4 h-4 mr-1" />
              Vote complet
            </Badge>
          )}
        </div>
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
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
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

      {/* Section Mes Votes */}
      {showMyVotes && myVotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Mes votes ({myVotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myVotes.map((vote) => (
                <div
                  key={vote.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <p className="text-sm text-gray-500 mb-2">{vote.category?.name}</p>
                  <div className="flex items-center gap-3">
                    {vote.candidate?.photo_url ? (
                      <img
                        src={vote.candidate.photo_url}
                        alt={vote.candidate.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{vote.candidate?.full_name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(vote.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Catégories</h2>
          {categories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Vote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune catégorie disponible</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className={`cursor-pointer transition-all ${
                    category.hasVoted
                      ? 'opacity-60 cursor-default'
                      : selectedCategory?.id === category.id
                      ? 'ring-2 ring-green-500 shadow-md'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleCategorySelect(category)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          category.hasVoted
                            ? 'bg-green-100'
                            : selectedCategory?.id === category.id
                            ? 'bg-green-500'
                            : 'bg-gray-100'
                        }`}
                      >
                        {category.hasVoted ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Vote
                            className={`w-5 h-5 ${
                              selectedCategory?.id === category.id
                                ? 'text-white'
                                : 'text-gray-400'
                            }`}
                          />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-gray-500">{category.description}</p>
                        )}
                      </div>
                    </div>
                    {!category.hasVoted && (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Candidates */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedCategory ? `Candidats - ${selectedCategory.name}` : 'Candidats'}
          </h2>
          {!selectedCategory ? (
            <Card>
              <CardContent className="text-center py-8">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Sélectionnez une catégorie pour voir les candidats</p>
              </CardContent>
            </Card>
          ) : candidates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun candidat dans cette catégorie</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <Card
                  key={candidate.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => handleCandidateSelect(candidate)}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    {candidate.photo_url ? (
                      <img
                        src={candidate.photo_url}
                        alt={candidate.full_name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-7 h-7 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{candidate.full_name}</h3>
                      {candidate.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {candidate.description}
                        </p>
                      )}
                    </div>
                    <Button size="sm">
                      Voter
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirmer votre vote"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            Votre vote est définitif et ne pourra pas être modifié.
          </Alert>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Catégorie</p>
            <p className="font-medium text-gray-900">{selectedCategory?.name}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Candidat sélectionné</p>
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vote enregistré !</h2>
          <p className="text-gray-600 mb-6">
            Votre vote a été enregistré avec succès.
          </p>
          <Button onClick={() => setShowSuccessModal(false)} className="w-full">
            Continuer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
