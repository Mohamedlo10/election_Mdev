'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Eye, Plus, Trash2, Search, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import { useInstance } from '@/contexts/InstanceContext';

interface Observer {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

export default function ObserversPage() {
  const params = useParams();
  const instanceId = params.instanceId as string;
  const { currentInstance } = useInstance();

  const [observers, setObservers] = useState<Observer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedObserver, setSelectedObserver] = useState<Observer | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadObservers();
  }, [instanceId]);

  async function loadObservers() {
    setLoading(true);
    try {
      const response = await fetch(`/api/instance/${instanceId}/observers`);
      const data = await response.json();

      if (response.ok) {
        setObservers(data.observers || []);
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!newEmail.trim()) {
      setError('L\'email est requis');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/instance/${instanceId}/observers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateModal(false);
        setNewEmail('');
        setSuccess('Observateur ajoute avec succes. Un email lui a ete envoye.');
        loadObservers();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Erreur lors de la creation');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  async function handleDelete() {
    if (!selectedObserver) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(
        `/api/instance/${instanceId}/observers?id=${selectedObserver.id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedObserver(null);
        setSuccess('Observateur supprime');
        loadObservers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  const filteredObservers = observers.filter((obs) =>
    obs.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Observateurs</h1>
          <p className="text-gray-600 mt-1">
            {currentInstance?.name} - Gerez les observateurs de votre election
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un observateur
        </Button>
      </div>

      {error && (
        <Alert variant="error">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Fermer
          </button>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Eye className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total observateurs</p>
              <p className="text-2xl font-bold text-gray-900">{observers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Invitations envoyees</p>
              <p className="text-2xl font-bold text-gray-900">{observers.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher par email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Observers List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des observateurs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : filteredObservers.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Aucun observateur trouve' : 'Aucun observateur pour le moment'}
              </p>
              {!searchTerm && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowCreateModal(true)}
                >
                  Ajouter le premier observateur
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Date d&apos;ajout
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObservers.map((observer) => (
                    <tr
                      key={observer.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Eye className="w-4 h-4 text-yellow-600" />
                          </div>
                          <span className="font-medium text-gray-900">
                            {observer.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(observer.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setSelectedObserver(observer);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Ajouter un observateur"
      >
        <div className="space-y-4">
          <Input
            label="Email de l'observateur"
            type="email"
            placeholder="observateur@exemple.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note :</strong> Un email contenant les identifiants de connexion
              sera automatiquement envoye a l&apos;observateur.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              Ajouter l&apos;observateur
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer l'observateur"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Etes-vous sur de vouloir supprimer l&apos;observateur{' '}
            <span className="font-semibold">{selectedObserver?.email}</span> ?
          </p>
          <p className="text-sm text-gray-500">
            Cette personne ne pourra plus acceder a cette instance.
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
    </div>
  );
}
