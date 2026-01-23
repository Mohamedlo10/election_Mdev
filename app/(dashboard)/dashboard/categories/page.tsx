'use client';

import { useEffect, useState } from 'react';
import { Plus, FolderKanban, MoreVertical, Edit, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';
import { getAllInstances } from '@/lib/services/election.service';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/services/category.service';
import type { Category, CreateCategory, ElectionInstance } from '@/types';

export default function CategoriesPage() {
  const { authUser } = useAuth();
  const [instances, setInstances] = useState<ElectionInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{ name: string; description: string }>({
    name: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstanceId) {
      loadCategories();
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

  async function loadCategories() {
    setLoading(true);
    const result = await getCategories(selectedInstanceId);
    if (result.success && result.data) {
      setCategories(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement');
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setSubmitting(true);
    const categoryData: CreateCategory = {
      instance_id: selectedInstanceId,
      name: formData.name,
      description: formData.description || null,
    };

    const result = await createCategory(categoryData);

    if (result.success) {
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      loadCategories();
    } else {
      setError(result.error || 'Erreur lors de la création');
    }
    setSubmitting(false);
  }

  async function handleUpdate() {
    if (!selectedCategory || !formData.name.trim()) return;

    setSubmitting(true);
    const result = await updateCategory(selectedCategory.id, {
      name: formData.name,
      description: formData.description || null,
    });

    if (result.success) {
      setShowEditModal(false);
      setSelectedCategory(null);
      loadCategories();
    } else {
      setError(result.error || 'Erreur lors de la mise à jour');
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!selectedCategory) return;

    setSubmitting(true);
    const result = await deleteCategory(selectedCategory.id);

    if (result.success) {
      setShowDeleteModal(false);
      setSelectedCategory(null);
      loadCategories();
    } else {
      setError(result.error || 'Erreur lors de la suppression');
    }
    setSubmitting(false);
  }

  function openEditModal(category: Category) {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setShowEditModal(true);
    setActionMenuId(null);
  }

  function openDeleteModal(category: Category) {
    setSelectedCategory(category);
    setShowDeleteModal(true);
    setActionMenuId(null);
  }

  const instanceOptions = instances.map((i) => ({
    value: i.id,
    label: i.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
          <p className="text-gray-600 mt-1">Gérez les catégories de vote</p>
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
          <Button onClick={() => setShowCreateModal(true)} disabled={!selectedInstanceId}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle catégorie
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </Alert>
      )}

      {!selectedInstanceId ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Sélectionnez une instance pour voir les catégories</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-16 bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie</h3>
            <p className="text-gray-500 mb-4">Créez votre première catégorie de vote</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une catégorie
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category, index) => (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="text-gray-300 cursor-grab">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-gray-500">{category.description}</p>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setActionMenuId(actionMenuId === category.id ? null : category.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {actionMenuId === category.id && (
                    <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                      <button
                        onClick={() => openEditModal(category)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier
                      </button>
                      <button
                        onClick={() => openDeleteModal(category)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouvelle catégorie"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la catégorie"
            placeholder="Ex: Président"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Textarea
            label="Description (optionnel)"
            placeholder="Description de la catégorie..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              Créer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier la catégorie"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la catégorie"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
        title="Supprimer la catégorie"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer la catégorie{' '}
            <span className="font-semibold">{selectedCategory?.name}</span> ?
          </p>
          <p className="text-sm text-red-500">
            Tous les candidats et votes associés seront également supprimés.
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
