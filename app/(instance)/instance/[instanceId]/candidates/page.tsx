'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Users, MoreVertical, Edit, Trash2, User, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { getCategories } from '@/lib/services/category.service';
import {
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
} from '@/lib/services/candidate.service';
import type { Candidate, Category, CreateCandidate } from '@/types';

export default function InstanceCandidatesPage() {
  const params = useParams();
  const instanceId = params.instanceId as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    description: '',
    category_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [instanceId]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadCandidates();
    } else {
      setCandidates([]);
    }
  }, [selectedCategoryId]);

  async function loadCategories() {
    const result = await getCategories(instanceId);
    if (result.success && result.data) {
      setCategories(result.data);
      if (result.data.length > 0) {
        setSelectedCategoryId(result.data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadCandidates() {
    setLoading(true);
    const result = await getCandidates(selectedCategoryId);
    if (result.success && result.data) {
      setCandidates(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement');
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!formData.full_name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setSubmitting(true);
    const candidateData: CreateCandidate = {
      category_id: formData.category_id || selectedCategoryId,
      full_name: formData.full_name,
      description: formData.description || null,
    };

    const result = await createCandidate(candidateData);

    if (result.success) {
      setShowCreateModal(false);
      setFormData({ full_name: '', description: '', category_id: '' });
      loadCandidates();
    } else {
      setError(result.error || 'Erreur lors de la creation');
    }
    setSubmitting(false);
  }

  async function handleUpdate() {
    if (!selectedCandidate || !formData.full_name.trim()) return;

    setSubmitting(true);
    const result = await updateCandidate(selectedCandidate.id, {
      full_name: formData.full_name,
      description: formData.description || null,
    });

    if (result.success) {
      setShowEditModal(false);
      setSelectedCandidate(null);
      loadCandidates();
    } else {
      setError(result.error || 'Erreur lors de la mise a jour');
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!selectedCandidate) return;

    setSubmitting(true);
    const result = await deleteCandidate(selectedCandidate.id);

    if (result.success) {
      setShowDeleteModal(false);
      setSelectedCandidate(null);
      loadCandidates();
    } else {
      setError(result.error || 'Erreur lors de la suppression');
    }
    setSubmitting(false);
  }

  function openCreateModal() {
    setFormData({ full_name: '', description: '', category_id: selectedCategoryId });
    setShowCreateModal(true);
  }

  function openEditModal(candidate: Candidate) {
    setSelectedCandidate(candidate);
    setFormData({
      full_name: candidate.full_name,
      description: candidate.description || '',
      category_id: candidate.category_id,
    });
    setShowEditModal(true);
    setActionMenuId(null);
  }

  function openDeleteModal(candidate: Candidate) {
    setSelectedCandidate(candidate);
    setShowDeleteModal(true);
    setActionMenuId(null);
  }

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Candidats</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gerez les candidats par categorie</p>
        </div>
        <Button onClick={openCreateModal} disabled={!selectedCategoryId} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau candidat
        </Button>
      </div>

      {/* Filter by category */}
      {categories.length > 0 && (
        <div className="flex items-center gap-4">
          <Select
            options={categoryOptions}
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-64"
            placeholder="Selectionner une categorie"
          />
        </div>
      )}

      {error && (
        <Alert variant="error">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </Alert>
      )}

      {!selectedCategoryId ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {categories.length === 0
                ? 'Creez d\'abord des categories pour ajouter des candidats'
                : 'Selectionnez une categorie pour voir les candidats'}
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-40 bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun candidat</h3>
            <p className="text-gray-500 mb-4">Ajoutez des candidats a cette categorie</p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un candidat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {candidate.photo_url ? (
                      <img
                        src={candidate.photo_url}
                        alt={candidate.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{candidate.full_name}</h3>
                      <Badge size="sm">
                        {categories.find((c) => c.id === candidate.category_id)?.name}
                      </Badge>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setActionMenuId(actionMenuId === candidate.id ? null : candidate.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {actionMenuId === candidate.id && (
                      <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                        <button
                          onClick={() => openEditModal(candidate)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => openDeleteModal(candidate)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {candidate.description && (
                  <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                    {candidate.description}
                  </p>
                )}

                {candidate.program_url && (
                  <a
                    href={candidate.program_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm hover:underline mt-3"
                    style={{ color: 'var(--theme-primary)' }}
                  >
                    <FileText className="w-4 h-4" />
                    Voir le programme
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouveau candidat"
      >
        <div className="space-y-4">
          <Input
            label="Nom complet"
            placeholder="Ex: Jean Dupont"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
          <Select
            label="Categorie"
            options={categoryOptions}
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          />
          <Textarea
            label="Description (optionnel)"
            placeholder="Biographie, experience..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              Creer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier le candidat"
      >
        <div className="space-y-4">
          <Input
            label="Nom complet"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
          <Textarea
            label="Description (optionnel)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} loading={submitting}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer le candidat"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Etes-vous sur de vouloir supprimer{' '}
            <span className="font-semibold">{selectedCandidate?.full_name}</span> ?
          </p>
          <p className="text-sm text-red-500">
            Tous les votes pour ce candidat seront egalement supprimes.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={submitting}>
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      {actionMenuId && (
        <div className="fixed inset-0 z-0" onClick={() => setActionMenuId(null)} />
      )}
    </div>
  );
}
