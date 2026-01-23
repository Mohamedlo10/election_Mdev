'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Building2,
  MoreVertical,
  Play,
  Pause,
  StopCircle,
  Archive,
  Trash2,
  Edit,
  Users,
  Vote,
  LogIn,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import {
  getAllInstances,
  createInstance,
  updateInstance,
  deleteInstance,
  startElection,
  pauseElection,
  endElection,
  archiveElection,
} from '@/lib/services/election.service';
import { createClient } from '@/lib/supabase/client';
import type { ElectionInstance, CreateElectionInstance, ElectionStatus } from '@/types';

const statusConfig: Record<ElectionStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  active: { label: 'Active', variant: 'success' },
  paused: { label: 'En pause', variant: 'warning' },
  completed: { label: 'Terminee', variant: 'info' },
  archived: { label: 'Archivee', variant: 'error' },
};

interface InstanceStats {
  [instanceId: string]: {
    voters: number;
    votes: number;
  };
}

export default function SuperAdminInstancesPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<ElectionInstance[]>([]);
  const [instanceStats, setInstanceStats] = useState<InstanceStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<ElectionInstance | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateElectionInstance>({
    name: '',
    primary_color: '#22c55e',
    secondary_color: '#1f2937',
    accent_color: '#eab308',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInstances();
  }, []);

  async function loadInstances() {
    setLoading(true);
    const result = await getAllInstances();
    if (result.success && result.data) {
      setInstances(result.data);
      // Charger les stats pour chaque instance
      loadInstanceStats(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement');
    }
    setLoading(false);
  }

  async function loadInstanceStats(instances: ElectionInstance[]) {
    const supabase = createClient();
    const stats: InstanceStats = {};

    for (const instance of instances) {
      const [votersRes, votesRes] = await Promise.all([
        supabase.from('voters').select('id', { count: 'exact', head: true }).eq('instance_id', instance.id),
        supabase.from('votes').select('id', { count: 'exact', head: true }).eq('instance_id', instance.id),
      ]);

      stats[instance.id] = {
        voters: votersRes.count || 0,
        votes: votesRes.count || 0,
      };
    }

    setInstanceStats(stats);
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setSubmitting(true);
    const result = await createInstance(formData);

    if (result.success) {
      setShowCreateModal(false);
      setFormData({ name: '', primary_color: '#22c55e', secondary_color: '#1f2937', accent_color: '#eab308' });
      loadInstances();
    } else {
      setError(result.error || 'Erreur lors de la creation');
    }
    setSubmitting(false);
  }

  async function handleUpdate() {
    if (!selectedInstance || !formData.name.trim()) return;

    setSubmitting(true);
    const result = await updateInstance(selectedInstance.id, formData);

    if (result.success) {
      setShowEditModal(false);
      setSelectedInstance(null);
      loadInstances();
    } else {
      setError(result.error || 'Erreur lors de la mise a jour');
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!selectedInstance) return;

    setSubmitting(true);
    const result = await deleteInstance(selectedInstance.id);

    if (result.success) {
      setShowDeleteModal(false);
      setSelectedInstance(null);
      loadInstances();
    } else {
      setError(result.error || 'Erreur lors de la suppression');
    }
    setSubmitting(false);
  }

  async function handleStatusChange(instance: ElectionInstance, action: 'start' | 'pause' | 'end' | 'archive') {
    setActionMenuId(null);
    let result;

    switch (action) {
      case 'start':
        result = await startElection(instance.id);
        break;
      case 'pause':
        result = await pauseElection(instance.id);
        break;
      case 'end':
        result = await endElection(instance.id);
        break;
      case 'archive':
        result = await archiveElection(instance.id);
        break;
    }

    if (result.success) {
      loadInstances();
    } else {
      setError(result.error || 'Erreur lors du changement de statut');
    }
  }

  function openEditModal(instance: ElectionInstance) {
    setSelectedInstance(instance);
    setFormData({
      name: instance.name,
      primary_color: instance.primary_color,
      secondary_color: instance.secondary_color,
      accent_color: instance.accent_color,
    });
    setShowEditModal(true);
    setActionMenuId(null);
  }

  function openDeleteModal(instance: ElectionInstance) {
    setSelectedInstance(instance);
    setShowDeleteModal(true);
    setActionMenuId(null);
  }

  function enterInstance(instance: ElectionInstance) {
    router.push(`/instance/${instance.id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instances d&apos;election</h1>
          <p className="text-gray-600 mt-1">Gerez toutes vos instances d&apos;election</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle instance
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </Alert>
      )}

      {/* Instances Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48 bg-gray-100 rounded-lg" />
            </Card>
          ))}
        </div>
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune instance
            </h3>
            <p className="text-gray-500 mb-4">
              Creez votre premiere instance d&apos;election
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Creer une instance
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <Card key={instance.id} className="hover:shadow-md transition-shadow relative">
              <CardContent>
                {/* Color indicator */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                  style={{ backgroundColor: instance.primary_color }}
                />

                <div className="flex items-start justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: instance.primary_color + '20' }}
                    >
                      <Building2 style={{ color: instance.primary_color }} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{instance.name}</h3>
                      <Badge variant={statusConfig[instance.status].variant} size="sm">
                        {statusConfig[instance.status].label}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions menu */}
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuId(actionMenuId === instance.id ? null : instance.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {actionMenuId === instance.id && (
                      <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                        <button
                          onClick={() => openEditModal(instance)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </button>

                        {instance.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(instance, 'start')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                          >
                            <Play className="w-4 h-4" />
                            Demarrer
                          </button>
                        )}

                        {instance.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(instance, 'pause')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                          >
                            <Pause className="w-4 h-4" />
                            Mettre en pause
                          </button>
                        )}

                        {instance.status === 'paused' && (
                          <button
                            onClick={() => handleStatusChange(instance, 'start')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                          >
                            <Play className="w-4 h-4" />
                            Reprendre
                          </button>
                        )}

                        {['active', 'paused'].includes(instance.status) && (
                          <button
                            onClick={() => handleStatusChange(instance, 'end')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                          >
                            <StopCircle className="w-4 h-4" />
                            Terminer
                          </button>
                        )}

                        {instance.status === 'completed' && (
                          <button
                            onClick={() => handleStatusChange(instance, 'archive')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                          >
                            <Archive className="w-4 h-4" />
                            Archiver
                          </button>
                        )}

                        <hr className="my-1" />

                        <button
                          onClick={() => openDeleteModal(instance)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{instanceStats[instance.id]?.voters || 0} votants</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Vote className="w-4 h-4" />
                    <span>{instanceStats[instance.id]?.votes || 0} votes</span>
                  </div>
                </div>

                {/* Enter button */}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => enterInstance(instance)}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrer dans l&apos;instance
                </Button>

                {/* Date */}
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Creee le {new Date(instance.created_at).toLocaleDateString('fr-FR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouvelle instance d'election"
      >
        <div className="space-y-4">
          <Input
            label="Nom de l'instance"
            placeholder="Ex: Election presidentielle 2024"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur primaire
              </label>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur secondaire
              </label>
              <input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur accent
              </label>
              <input
                type="color"
                value={formData.accent_color}
                onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              Creer l&apos;instance
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier l'instance"
      >
        <div className="space-y-4">
          <Input
            label="Nom de l'instance"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur primaire
              </label>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur secondaire
              </label>
              <input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur accent
              </label>
              <input
                type="color"
                value={formData.accent_color}
                onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
          </div>

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
        title="Supprimer l'instance"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Etes-vous sur de vouloir supprimer l&apos;instance{' '}
            <span className="font-semibold">{selectedInstance?.name}</span> ?
          </p>
          <p className="text-sm text-red-500">
            Cette action est irreversible. Toutes les donnees associees seront supprimees.
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

      {/* Click outside handler for action menu */}
      {actionMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuId(null)}
        />
      )}
    </div>
  );
}
