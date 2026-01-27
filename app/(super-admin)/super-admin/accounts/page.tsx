'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Users,
  Trash2,
  Edit,
  Search,
  Building2,
  KeyRound,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import { createClient } from '@/lib/supabase/client';
import type { ElectionInstance, UserRole } from '@/types';

interface AccountRecord {
  id: string;
  user_id: string;
  instance_id: string | null;
  role: UserRole;
  created_at: string;
  email?: string;
  instance_name?: string;
}

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'observer', label: 'Observateur' },
];

const roleConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'info' }> = {
  super_admin: { label: 'Super Admin', variant: 'success' },
  admin: { label: 'Admin', variant: 'info' },
  observer: { label: 'Observateur', variant: 'warning' },
  voter: { label: 'Votant', variant: 'default' },
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [instances, setInstances] = useState<ElectionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountRecord | null>(null);

  // Reset password states
  const [resetPasswordResult, setResetPasswordResult] = useState<{ success: boolean; newPassword?: string; message?: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Change own password states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    generateCode: false,
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    role: 'admin' as UserRole,
    instance_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Charger les comptes (users_roles avec email via auth.users n'est pas accessible directement)
    // On doit faire une requete via API
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();

      if (response.ok) {
        setAccounts(data.accounts || []);
      } else {
        setError(data.error || 'Erreur lors du chargement des comptes');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    // Charger les instances
    const { data: instancesData } = await supabase
      .from('election_instances')
      .select('*')
      .order('name');

    if (instancesData) {
      setInstances(instancesData);
    }

    setLoading(false);
  }

  async function handleCreate() {
    if (!formData.email.trim()) {
      setError('L\'email est requis');
      return;
    }
    // L'instance n'est obligatoire que pour les observateurs
    if (formData.role === 'observer' && !formData.instance_id) {
      setError('L\'instance est requise pour un observateur');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ email: '', role: 'admin', instance_id: '' });
        setSuccess('Compte cree avec succes');
        loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors de la creation');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  async function handleUpdate() {
    if (!selectedAccount) return;

    // L'instance n'est obligatoire que pour les observateurs
    if (formData.role === 'observer' && !formData.instance_id) {
      setError('L\'instance est requise pour un observateur');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: formData.role,
          instance_id: formData.instance_id || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowEditModal(false);
        setSelectedAccount(null);
        setSuccess('Compte mis a jour');
        loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors de la mise a jour');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  async function handleDelete() {
    if (!selectedAccount) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedAccount(null);
        setSuccess('Compte supprime');
        loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  function openEditModal(account: AccountRecord) {
    setSelectedAccount(account);
    setFormData({
      email: account.email || '',
      role: account.role,
      instance_id: account.instance_id || '',
    });
    setShowEditModal(true);
  }

  function openDeleteModal(account: AccountRecord) {
    setSelectedAccount(account);
    setShowDeleteModal(true);
  }

  function openResetPasswordModal(account: AccountRecord) {
    setSelectedAccount(account);
    setResetPasswordResult(null);
    setCopiedPassword(false);
    setShowResetPasswordModal(true);
  }

  async function handleResetPassword() {
    if (!selectedAccount) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/accounts/${selectedAccount.id}/reset-password`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setResetPasswordResult({
          success: true,
          newPassword: data.newPassword,
          message: data.warning || data.message,
        });
        setSuccess('Mot de passe reinitialise avec succes');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors de la reinitialisation');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  async function copyPassword(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  async function handleChangeOwnPassword() {
    if (!passwordForm.currentPassword) {
      setError('Le mot de passe actuel est requis');
      return;
    }

    if (!passwordForm.generateCode) {
      if (!passwordForm.newPassword) {
        setError('Le nouveau mot de passe est requis');
        return;
      }
      if (passwordForm.newPassword.length < 6) {
        setError('Le nouveau mot de passe doit contenir au moins 6 caracteres');
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/accounts/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.generateCode ? undefined : passwordForm.newPassword,
          generateNewCode: passwordForm.generateCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.newPassword) {
          setGeneratedPassword(data.newPassword);
        } else {
          setShowChangePasswordModal(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', generateCode: false });
          setSuccess('Mot de passe modifie avec succes');
          setTimeout(() => setSuccess(''), 3000);
        }
      } else {
        setError(data.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  const filteredAccounts = accounts.filter((account) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      account.email?.toLowerCase().includes(search) ||
      account.instance_name?.toLowerCase().includes(search) ||
      account.role.toLowerCase().includes(search)
    );
  });

  // Exclure les super_admin et voters de l'affichage
  const displayAccounts = filteredAccounts.filter(
    (a) => a.role !== 'super_admin' && a.role !== 'voter'
  );

  // Options d'instance - pour admin on ajoute "Aucune" en premier
  const instanceOptionsForAdmin = [
    { value: '', label: 'Aucune (pourra creer sa propre instance)' },
    ...instances.map((i) => ({ value: i.id, label: i.name })),
  ];

  const instanceOptionsForObserver = instances.map((i) => ({
    value: i.id,
    label: i.name,
  }));

  // Choisir les options selon le role selectionne
  const currentInstanceOptions = formData.role === 'admin'
    ? instanceOptionsForAdmin
    : instanceOptionsForObserver;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestion des comptes</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gerez les administrateurs et observateurs</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => {
              setShowChangePasswordModal(true);
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', generateCode: false });
              setGeneratedPassword(null);
            }}
            className="flex-1 sm:flex-none"
          >
            <Lock className="w-4 h-4 mr-2" />
            Mon mot de passe
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau compte
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher par email, instance ou role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total comptes</p>
              <p className="text-2xl font-bold text-gray-900">{displayAccounts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {displayAccounts.filter((a) => a.role === 'admin').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Observateurs</p>
              <p className="text-2xl font-bold text-gray-900">
                {displayAccounts.filter((a) => a.role === 'observer').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des comptes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : displayAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun compte trouve</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Instance</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date creation</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{account.email || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={roleConfig[account.role]?.variant || 'default'} size="sm">
                          {roleConfig[account.role]?.label || account.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4" />
                          {account.instance_name ? (
                            <span>{account.instance_name}</span>
                          ) : account.role === 'admin' ? (
                            <span className="text-blue-600 text-sm">Peut creer une instance</span>
                          ) : (
                            <span className="text-gray-400">Aucune</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(account.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openResetPasswordModal(account)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                            title="Reinitialiser le mot de passe"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(account)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(account)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                            title="Supprimer"
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
        title="Nouveau compte"
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="email@exemple.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Select
            label="Role"
            options={roleOptions}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole, instance_id: '' })}
          />

          <div>
            <Select
              label={formData.role === 'admin' ? 'Instance (optionnel)' : 'Instance'}
              options={currentInstanceOptions}
              value={formData.instance_id}
              onChange={(e) => setFormData({ ...formData, instance_id: e.target.value })}
              placeholder="Selectionner une instance"
            />
            {formData.role === 'admin' && (
              <p className="text-xs text-blue-600 mt-1">
                Un admin sans instance pourra creer sa propre instance. Un seul admin par instance est autorise.
              </p>
            )}
            {formData.role === 'observer' && (
              <p className="text-xs text-gray-500 mt-1">
                Un observateur doit etre affecte a une instance. Plusieurs observateurs par instance sont autorises.
              </p>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Un email d&apos;invitation sera envoye a l&apos;utilisateur avec ses identifiants de connexion.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              Creer le compte
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier le compte"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{selectedAccount?.email}</p>
          </div>

          <Select
            label="Role"
            options={roleOptions}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole, instance_id: '' })}
          />

          <div>
            <Select
              label={formData.role === 'admin' ? 'Instance (optionnel)' : 'Instance'}
              options={currentInstanceOptions}
              value={formData.instance_id}
              onChange={(e) => setFormData({ ...formData, instance_id: e.target.value })}
              placeholder="Selectionner une instance"
            />
            {formData.role === 'admin' && (
              <p className="text-xs text-blue-600 mt-1">
                Un admin sans instance pourra creer sa propre instance. Un seul admin par instance est autorise.
              </p>
            )}
            {formData.role === 'observer' && (
              <p className="text-xs text-gray-500 mt-1">
                Un observateur doit etre affecte a une instance.
              </p>
            )}
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
        title="Supprimer le compte"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Etes-vous sur de vouloir supprimer le compte{' '}
            <span className="font-semibold">{selectedAccount?.email}</span> ?
          </p>
          <p className="text-sm text-red-500">
            Cette action supprimera uniquement le role. Le compte utilisateur restera actif.
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

      {/* Change Own Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', generateCode: false });
          setGeneratedPassword(null);
        }}
        title="Changer mon mot de passe"
        size="sm"
      >
        <div className="space-y-4">
          {!generatedPassword ? (
            <>
              <div className="relative">
                <Input
                  label="Mot de passe actuel"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Entrez votre mot de passe actuel"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={passwordForm.generateCode}
                    onChange={(e) => setPasswordForm({ ...passwordForm, generateCode: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Generer un code a 6 chiffres automatiquement</span>
                </label>
              </div>

              {!passwordForm.generateCode && (
                <>
                  <div className="relative">
                    <Input
                      label="Nouveau mot de passe"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Entrez le nouveau mot de passe"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <Input
                    label="Confirmer le nouveau mot de passe"
                    type="password"
                    placeholder="Confirmez le nouveau mot de passe"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowChangePasswordModal(false)}>
                  Annuler
                </Button>
                <Button onClick={handleChangeOwnPassword} loading={submitting}>
                  Changer le mot de passe
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
                <p className="text-sm text-green-700 font-medium">
                  Mot de passe modifie avec succes !
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Votre nouveau mot de passe :</p>
                <div className="flex items-center gap-2">
                  <code className="text-2xl font-bold tracking-widest text-green-600">
                    {generatedPassword}
                  </code>
                  <button
                    onClick={() => copyPassword(generatedPassword)}
                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"
                    title="Copier"
                  >
                    {copiedPassword ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r">
                <p className="text-sm text-yellow-700">
                  <strong>Important :</strong> Notez ce code, il sera necessaire pour votre prochaine connexion.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', generateCode: false });
                  setGeneratedPassword(null);
                }}>
                  Fermer
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setResetPasswordResult(null);
        }}
        title="Reinitialiser le mot de passe"
        size="sm"
      >
        <div className="space-y-4">
          {!resetPasswordResult ? (
            <>
              <p className="text-gray-600">
                Vous allez reinitialiser le mot de passe du compte{' '}
                <span className="font-semibold">{selectedAccount?.email}</span>.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r">
                <p className="text-sm text-blue-700">
                  Un nouveau code a 6 chiffres sera genere et envoye par email a l&apos;utilisateur.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowResetPasswordModal(false)}>
                  Annuler
                </Button>
                <Button onClick={handleResetPassword} loading={submitting}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Reinitialiser
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
                <p className="text-sm text-green-700 font-medium">
                  Mot de passe reinitialise avec succes !
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {resetPasswordResult.message}
                </p>
              </div>

              {resetPasswordResult.newPassword && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Nouveau mot de passe (a communiquer manuellement) :</p>
                  <div className="flex items-center gap-2">
                    <code className="text-2xl font-bold tracking-widest text-green-600">
                      {resetPasswordResult.newPassword}
                    </code>
                    <button
                      onClick={() => copyPassword(resetPasswordResult.newPassword!)}
                      className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"
                      title="Copier"
                    >
                      {copiedPassword ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordResult(null);
                }}>
                  Fermer
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
