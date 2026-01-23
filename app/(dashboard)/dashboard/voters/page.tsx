'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Plus,
  UserCheck,
  MoreVertical,
  Edit,
  Trash2,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { getAllInstances } from '@/lib/services/election.service';
import {
  getVoters,
  createVoter,
  updateVoter,
  deleteVoter,
  parseExcelFile,
  importVoters,
  getVotersStats,
} from '@/lib/services/voter.service';
import type { Voter, ElectionInstance, VoterImport } from '@/types';

export default function VotersPage() {
  const { authUser } = useAuth();
  const [instances, setInstances] = useState<ElectionInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [voters, setVoters] = useState<Voter[]>([]);
  const [filteredVoters, setFilteredVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, registered: 0, notRegistered: 0 });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ full_name: '', email: '' });
  const [importData, setImportData] = useState<VoterImport[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstanceId) {
      loadVoters();
      loadStats();
    }
  }, [selectedInstanceId]);

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      setFilteredVoters(
        voters.filter(
          (v) =>
            v.full_name.toLowerCase().includes(term) ||
            v.email.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredVoters(voters);
    }
  }, [searchTerm, voters]);

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

  async function loadVoters() {
    setLoading(true);
    const result = await getVoters(selectedInstanceId);
    if (result.success && result.data) {
      setVoters(result.data);
      setFilteredVoters(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement');
    }
    setLoading(false);
  }

  async function loadStats() {
    const result = await getVotersStats(selectedInstanceId);
    if (result.success && result.data) {
      setStats(result.data);
    }
  }

  async function handleCreate() {
    if (!formData.full_name.trim() || !formData.email.trim()) {
      setError('Tous les champs sont requis');
      return;
    }

    setSubmitting(true);
    const result = await createVoter({
      instance_id: selectedInstanceId,
      full_name: formData.full_name,
      email: formData.email,
    });

    if (result.success) {
      setShowCreateModal(false);
      setFormData({ full_name: '', email: '' });
      loadVoters();
      loadStats();
    } else {
      setError(result.error || 'Erreur lors de la création');
    }
    setSubmitting(false);
  }

  async function handleUpdate() {
    if (!selectedVoter || !formData.full_name.trim() || !formData.email.trim()) return;

    setSubmitting(true);
    const result = await updateVoter(selectedVoter.id, {
      full_name: formData.full_name,
      email: formData.email,
    });

    if (result.success) {
      setShowEditModal(false);
      setSelectedVoter(null);
      loadVoters();
    } else {
      setError(result.error || 'Erreur lors de la mise à jour');
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!selectedVoter) return;

    setSubmitting(true);
    const result = await deleteVoter(selectedVoter.id);

    if (result.success) {
      setShowDeleteModal(false);
      setSelectedVoter(null);
      loadVoters();
      loadStats();
    } else {
      setError(result.error || 'Erreur lors de la suppression');
    }
    setSubmitting(false);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcelFile(file);
      setImportData(data);
      setImportResult(null);
      setShowImportModal(true);
    } catch {
      setError('Erreur lors de la lecture du fichier');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleImport() {
    if (importData.length === 0) return;

    setSubmitting(true);
    const result = await importVoters(selectedInstanceId, importData);

    if (result.success && result.data) {
      setImportResult(result.data);
      if (result.data.imported > 0) {
        loadVoters();
        loadStats();
      }
    } else {
      setError(result.error || 'Erreur lors de l\'import');
    }
    setSubmitting(false);
  }

  function openEditModal(voter: Voter) {
    setSelectedVoter(voter);
    setFormData({
      full_name: voter.full_name,
      email: voter.email,
    });
    setShowEditModal(true);
    setActionMenuId(null);
  }

  function openDeleteModal(voter: Voter) {
    setSelectedVoter(voter);
    setShowDeleteModal(true);
    setActionMenuId(null);
  }

  function downloadTemplate() {
    const template = 'full_name,email\nJean Dupont,jean@exemple.com\nMarie Martin,marie@exemple.com';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_votants.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const instanceOptions = instances.map((i) => ({
    value: i.id,
    label: i.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Votants</h1>
          <p className="text-gray-600 mt-1">Gérez la liste des votants autorisés</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedInstanceId}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
          <Button onClick={() => setShowCreateModal(true)} disabled={!selectedInstanceId}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Stats */}
      {selectedInstanceId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inscrits</p>
                <p className="text-2xl font-bold">{stats.registered}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <XCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Non inscrits</p>
                <p className="text-2xl font-bold">{stats.notRegistered}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        {authUser?.role === 'super_admin' && instances.length > 0 && (
          <Select
            options={instanceOptions}
            value={selectedInstanceId}
            onChange={(e) => setSelectedInstanceId(e.target.value)}
            className="w-64"
            placeholder="Sélectionner une instance"
          />
        )}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Rechercher un votant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </Alert>
      )}

      {/* Table */}
      {!selectedInstanceId ? (
        <Card>
          <CardContent className="text-center py-12">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Sélectionnez une instance pour voir les votants</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className="animate-pulse">
          <CardContent className="h-64 bg-gray-100" />
        </Card>
      ) : filteredVoters.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun votant'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? 'Essayez avec d\'autres termes de recherche'
                : 'Ajoutez des votants manuellement ou importez depuis un fichier Excel'}
            </p>
            {!searchTerm && (
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer
                </Button>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d&apos;inscription
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVoters.map((voter) => (
                  <tr key={voter.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{voter.full_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {voter.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={voter.is_registered ? 'success' : 'default'} size="sm">
                        {voter.is_registered ? 'Inscrit' : 'Non inscrit'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voter.registered_at
                        ? new Date(voter.registered_at).toLocaleDateString('fr-FR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === voter.id ? null : voter.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {actionMenuId === voter.id && (
                          <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                            <button
                              onClick={() => openEditModal(voter)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4" />
                              Modifier
                            </button>
                            <button
                              onClick={() => openDeleteModal(voter)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Ajouter un votant"
      >
        <div className="space-y-4">
          <Input
            label="Nom complet"
            placeholder="Ex: Jean Dupont"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="jean@exemple.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier le votant"
      >
        <div className="space-y-4">
          <Input
            label="Nom complet"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
        title="Supprimer le votant"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer{' '}
            <span className="font-semibold">{selectedVoter?.full_name}</span> ?
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

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportData([]);
          setImportResult(null);
        }}
        title="Importer des votants"
        size="lg"
      >
        <div className="space-y-4">
          {importResult ? (
            <div>
              <Alert variant={importResult.errors.length > 0 ? 'warning' : 'success'}>
                {importResult.imported} votant(s) importé(s) avec succès
                {importResult.errors.length > 0 && `, ${importResult.errors.length} erreur(s)`}
              </Alert>

              {importResult.errors.length > 0 && (
                <div className="mt-4 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 mb-2">Erreurs :</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={() => {
                  setShowImportModal(false);
                  setImportData([]);
                  setImportResult(null);
                }}>
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  {importData.length} votant(s) trouvé(s) dans le fichier
                </p>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger le template
                </Button>
              </div>

              {importData.length > 0 && (
                <Card padding="none">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Nom
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Email
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importData.slice(0, 10).map((voter, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-sm">{voter.full_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{voter.email}</td>
                          </tr>
                        ))}
                        {importData.length > 10 && (
                          <tr>
                            <td colSpan={2} className="px-4 py-2 text-sm text-gray-500 text-center">
                              ... et {importData.length - 10} autres
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowImportModal(false);
                  setImportData([]);
                }}>
                  Annuler
                </Button>
                <Button onClick={handleImport} loading={submitting} disabled={importData.length === 0}>
                  Importer {importData.length} votant(s)
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {actionMenuId && (
        <div className="fixed inset-0 z-0" onClick={() => setActionMenuId(null)} />
      )}
    </div>
  );
}
