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
  Shield,
  Vote,
  UserCheck,
  Calendar,
  AlertTriangle,
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

interface RoleAssignment {
  id: string; // users_roles.id
  role: UserRole;
  instance_id: string | null;
  instance_name: string | null;
  created_at: string;
}

interface AccountRecord {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_super_admin: boolean;
  roles: RoleAssignment[];
  voter_count: number;
}

const roleOptions = [
  { value: 'admin', label: 'Administrateur d\'instance' },
  { value: 'observer', label: 'Observateur' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [instances, setInstances] = useState<ElectionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageRolesModal, setShowManageRolesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountRecord | null>(null);

  // Reset password state
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    success: boolean;
    newPassword?: string;
    message?: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Change own password state
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

  // Form states (Création / Assignation)
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
    setError('');

    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();

      if (response.ok) {
        setAccounts(data.accounts || []);
      } else {
        setError(data.error || 'Erreur lors du chargement des comptes');
      }
    } catch {
      setError('Erreur de connexion au serveur');
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

  // Créer un compte ou assigner un rôle
  async function handleCreateOrAssign() {
    if (!formData.email.trim()) {
      setError("L'adresse email est requise");
      return;
    }

    if (formData.role === 'observer' && !formData.instance_id) {
      setError("L'instance est requise pour un observateur");
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
        setSuccess('Compte / Rôle assigné avec succès');
        loadData();
        setTimeout(() => setSuccess(''), 3500);
      } else {
        setError(data.error || 'Erreur lors de la création ou assignation');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    }

    setSubmitting(false);
  }

  // Supprimer un rôle spécifique d'un utilisateur
  async function handleDetachRole(roleId: string) {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/accounts/${roleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Rôle détaché avec succès');
        await loadData();
        if (selectedAccount) {
          setSelectedAccount((prev) =>
            prev ? { ...prev, roles: prev.roles.filter((r) => r.id !== roleId) } : null
          );
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors du détachement du rôle');
      }
    } catch {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  // Supprimer le compte entier
  async function handleDeleteAccount() {
    if (!selectedAccount) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/accounts?user_id=${selectedAccount.user_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedAccount(null);
        setSuccess('Compte utilisateur supprimé avec succès');
        loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors de la suppression du compte');
      }
    } catch {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  // Ouvrir modal pour assigner un rôle à un compte existant
  function openAssignModalForAccount(account: AccountRecord) {
    setFormData({
      email: account.email,
      role: 'admin',
      instance_id: '',
    });
    setShowCreateModal(true);
  }

  // Ouvrir modal pour gérer les rôles d'un compte
  function openManageRolesModal(account: AccountRecord) {
    setSelectedAccount(account);
    setShowManageRolesModal(true);
  }

  // Ouvrir modal de réinitialisation de mot de passe
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
      const response = await fetch(`/api/accounts/${selectedAccount.user_id}/reset-password`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setResetPasswordResult({
          success: true,
          newPassword: data.newPassword,
          message: data.message || data.warning,
        });
        setSuccess('Mot de passe réinitialisé avec succès');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors de la réinitialisation');
      }
    } catch {
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
        setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
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
          setSuccess('Mot de passe modifié avec succès');
          setTimeout(() => setSuccess(''), 3000);
        }
      } else {
        setError(data.error || 'Erreur lors du changement de mot de passe');
      }
    } catch {
      setError('Erreur de connexion');
    }

    setSubmitting(false);
  }

  // Filtrage par recherche
  const filteredAccounts = accounts.filter((account) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      account.email.toLowerCase().includes(search) ||
      account.roles.some((r) => r.instance_name?.toLowerCase().includes(search) || r.role.toLowerCase().includes(search))
    );
  });

  // Ne pas afficher les comptes purement super_admin dans la liste des comptes délégués
  const displayAccounts = filteredAccounts.filter((a) => !a.is_super_admin);

  // Options d'instance
  const instanceOptionsForAdmin = [
    { value: '', label: 'Aucune instance (Admin libre - peut créer ses instances)' },
    ...instances.map((i) => ({ value: i.id, label: i.name })),
  ];

  const instanceOptionsForObserver = instances.map((i) => ({
    value: i.id,
    label: i.name,
  }));

  const currentInstanceOptions =
    formData.role === 'admin' ? instanceOptionsForAdmin : instanceOptionsForObserver;

  // Calcul des stats
  const totalUniqueAccounts = displayAccounts.length;
  const totalAdmins = displayAccounts.filter((a) => a.roles.some((r) => r.role === 'admin')).length;
  const totalObservers = displayAccounts.filter((a) => a.roles.some((r) => r.role === 'observer')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestion des comptes utilisateurs</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Chaque compte est unique et peut être rattaché à une ou plusieurs élections.
          </p>
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
          <Button
            onClick={() => {
              setFormData({ email: '', role: 'admin', instance_id: '' });
              setShowCreateModal(true);
            }}
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau compte / Rôle
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Fermer
          </button>
        </Alert>
      )}

      {success && <Alert variant="success">{success}</Alert>}

      {/* Barre de recherche */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher par email ou nom d'élection..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Comptes uniques</p>
              <p className="text-2xl font-bold text-gray-900">{totalUniqueAccounts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Administrateurs</p>
              <p className="text-2xl font-bold text-gray-900">{totalAdmins}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Observateurs</p>
              <p className="text-2xl font-bold text-gray-900">{totalObservers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des comptes uniques */}
      <Card>
        <CardHeader>
          <CardTitle>Comptes et assignations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Chargement des comptes...</div>
          ) : displayAccounts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun compte trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Utilisateur (Compte)
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Élections & Rôles assignés
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date de création
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayAccounts.map((account) => (
                    <tr key={account.user_id || account.email} className="hover:bg-gray-50/80 transition-colors">
                      {/* Email + Avatar */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-theme-primary-lighter text-theme-primary flex items-center justify-center font-bold text-sm">
                            {account.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{account.email}</p>
                            {account.last_sign_in_at ? (
                              <p className="text-xs text-gray-400">
                                Dernier accès : {new Date(account.last_sign_in_at).toLocaleDateString('fr-FR')}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-500 font-medium">Jamais connecté</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rôles & Instances assignées */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-lg">
                          {account.roles.length === 0 && account.voter_count === 0 && (
                            <span className="text-xs text-gray-400 italic">Aucune assignation active</span>
                          )}

                          {account.roles.map((r) => (
                            <span
                              key={r.id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                r.role === 'admin'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {r.role === 'admin' ? (
                                <Shield className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <UserCheck className="w-3 h-3 text-amber-600" />
                              )}
                              <span className="font-semibold capitalize">{r.role} :</span>
                              <span className="truncate max-w-[160px]">
                                {r.instance_name || (r.role === 'admin' ? 'Toutes instances (Libre)' : 'Non assigné')}
                              </span>
                            </span>
                          ))}

                          {account.voter_count > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              <Vote className="w-3 h-3 text-gray-500" />
                              Votant ({account.voter_count})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date de création */}
                      <td className="py-4 px-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(account.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4">
                        <div className="flex justify-end items-center gap-1.5">
                          {/* Assigner une nouvelle instance */}
                          <button
                            onClick={() => openAssignModalForAccount(account)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Assigner à une nouvelle élection"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          {/* Gérer les rôles */}
                          {account.roles.length > 0 && (
                            <button
                              onClick={() => openManageRolesModal(account)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                              title="Gérer ou détacher les rôles"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Réinitialiser mot de passe */}
                          <button
                            onClick={() => openResetPasswordModal(account)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                            title="Réinitialiser le mot de passe"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Supprimer le compte */}
                          <button
                            onClick={() => {
                              setSelectedAccount(account);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="Supprimer ce compte"
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

      {/* Modal Créer / Assigner un rôle */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={formData.email ? `Assigner un rôle à ${formData.email}` : 'Nouveau compte / Assigner un rôle'}
      >
        <div className="space-y-4">
          <Input
            label="Adresse email"
            type="email"
            placeholder="email@exemple.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!!selectedAccount}
          />

          <Select
            label="Rôle à attribuer"
            options={roleOptions}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole, instance_id: '' })}
          />

          <div>
            <Select
              label={formData.role === 'admin' ? 'Instance (optionnelle pour un admin)' : 'Instance (obligatoire)'}
              options={currentInstanceOptions}
              value={formData.instance_id}
              onChange={(e) => setFormData({ ...formData, instance_id: e.target.value })}
              placeholder="Sélectionner une instance"
            />
            {formData.role === 'admin' && !formData.instance_id && (
              <p className="text-xs text-blue-600 mt-1">
                Un administrateur sans instance assignée pourra créer et gérer ses propres élections.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleCreateOrAssign} loading={submitting}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Gérer / Détacher les rôles */}
      <Modal
        isOpen={showManageRolesModal}
        onClose={() => setShowManageRolesModal(false)}
        title={`Gérer les rôles de ${selectedAccount?.email}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Cet utilisateur possède les assignations suivantes. Vous pouvez détacher une élection sans supprimer le compte
            utilisateur.
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedAccount?.roles.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.role === 'admin' ? 'success' : 'warning'} size="sm">
                      {r.role}
                    </Badge>
                    <span className="font-semibold text-gray-900 text-sm">
                      {r.instance_name || 'Toutes instances'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Assigné le {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDetachRole(r.id)}
                  disabled={submitting}
                  className="text-xs text-red-600 hover:bg-red-50 p-2 rounded-lg border border-red-200 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Détacher
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowManageRolesModal(false);
                if (selectedAccount) openAssignModalForAccount(selectedAccount);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter une autre instance
            </Button>
            <Button variant="outline" onClick={() => setShowManageRolesModal(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Réinitialiser Mot de passe */}
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        title="Réinitialiser le mot de passe"
      >
        <div className="space-y-4">
          {!resetPasswordResult ? (
            <>
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir réinitialiser le mot de passe du compte{' '}
                <strong className="text-gray-900">{selectedAccount?.email}</strong> ?
              </p>
              <p className="text-xs text-gray-500">
                Un mot de passe temporaire sera généré et envoyé automatiquement par email à l&apos;utilisateur.
              </p>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setShowResetPasswordModal(false)} disabled={submitting}>
                  Annuler
                </Button>
                <Button onClick={handleResetPassword} loading={submitting}>
                  Confirmer et réinitialiser
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900">Mot de passe réinitialisé</h3>
              <p className="text-xs text-gray-500">
                {resetPasswordResult.message || 'Le nouveau mot de passe a été envoyé par email.'}
              </p>

              {resetPasswordResult.newPassword && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left">
                  <span className="text-xs text-gray-500 block mb-1">Mot de passe temporaire :</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg font-bold text-gray-900 tracking-wider">
                      {resetPasswordResult.newPassword}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPassword(resetPasswordResult.newPassword!)}
                      className="flex items-center gap-1 text-xs"
                    >
                      {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedPassword ? 'Copié' : 'Copier'}
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={() => setShowResetPasswordModal(false)} className="w-full mt-2">
                Fermer
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Supprimer Compte */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer le compte utilisateur"
      >
        <div className="space-y-4">
          <Alert variant="error">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Attention : action irréversible</p>
                <p className="text-xs mt-1">
                  Cette action supprimera définitivement le compte utilisateur de{' '}
                  <strong>{selectedAccount?.email}</strong> ainsi que tous ses rôles d&apos;administration associés.
                </p>
              </div>
            </div>
          </Alert>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount} loading={submitting}>
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Modifier son propre mot de passe */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title="Modifier mon mot de passe"
      >
        <div className="space-y-4">
          {!generatedPassword ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="pr-10"
                    placeholder="Votre mot de passe actuel"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="generateCodeCheckbox"
                  checked={passwordForm.generateCode}
                  onChange={(e) => setPasswordForm({ ...passwordForm, generateCode: e.target.checked })}
                  className="rounded text-theme-primary focus:ring-theme-primary"
                />
                <label htmlFor="generateCodeCheckbox" className="text-xs text-gray-700 cursor-pointer">
                  Générer automatiquement un code PIN aléatoire à 6 chiffres
                </label>
              </div>

              {!passwordForm.generateCode && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="pr-10"
                        placeholder="Au moins 6 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Retapez le mot de passe"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setShowChangePasswordModal(false)} disabled={submitting}>
                  Annuler
                </Button>
                <Button onClick={handleChangeOwnPassword} loading={submitting}>
                  Mettre à jour
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900">Mot de passe modifié</h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left">
                <span className="text-xs text-gray-500 block mb-1">Votre nouveau code :</span>
                <span className="font-mono text-lg font-bold text-gray-900">{generatedPassword}</span>
              </div>
              <Button onClick={() => setShowChangePasswordModal(false)} className="w-full">
                Fermer
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
