'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, FolderKanban, MoreVertical, Edit, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/services/category.service';
import type { Category, CreateCategory } from '@/types';

export default function InstanceCategoriesPage() {
  const params = useParams();
  const instanceId = params.instanceId as string;

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
    loadCategories();
  }, [instanceId]);

  async function loadCategories() {
    setLoading(true);
    const result = await getCategories(instanceId);
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
      instance_id: instanceId,
      name: formData.name,
      description: formData.description || null,
    };

    const result = await createCategory(categoryData);

    if (result.success) {
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      loadCategories();
    } else {
      setError(result.error || 'Erreur lors de la creation');
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
      setError(result.error || 'Erreur lors de la mise a jour');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gerez les categories de vote</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle categorie
        </Button>
      </div>

      {error && (
        <Alert variant="error">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </Alert>
      )}

      {loading ? (
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune categorie</h3>
            <p className="text-gray-500 mb-4">Creez votre premiere categorie de vote</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Creer une categorie
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
                  <div className="w-8 h-8 bg-theme-primary-light rounded-lg flex items-center justify-center font-semibold" style={{ color: 'var(--theme-primary)' }}>
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
        title="Nouvelle categorie"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la categorie"
            placeholder="Ex: President"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Textarea
            label="Description (optionnel)"
            placeholder="Description de la categorie..."
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
        title="Modifier la categorie"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la categorie"
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
        title="Supprimer la categorie"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Etes-vous sur de vouloir supprimer la categorie{' '}
            <span className="font-semibold">{selectedCategory?.name}</span> ?
          </p>
          <p className="text-sm text-red-500">
            Tous les candidats et votes associes seront egalement supprimes.
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
