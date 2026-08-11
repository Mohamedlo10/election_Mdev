'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Users2, Plus, Trash2, Search, Mail, Shield,
  UserCheck, Eye, Edit2, AlertTriangle, CheckCircle, Info,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import { useInstance } from '@/contexts/InstanceContext';
import type { UserRole } from '@/types';

interface TeamMember {
  id: string;          // user_roles record id
  user_id: string;     // auth user id
  email: string;
  role: UserRole;
  created_at: string;
}

const ROLE_DETAILS: Record<UserRole, {
  label: string;
  icon: typeof Shield;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  description: string;
}> = {
  super_admin: {
    label: 'Super Admin',
    icon: Shield,
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    borderClass: 'border-purple-200',
    bgClass: 'bg-purple-50',
    description: 'Accès système global illimité.',
  },
  admin: {
    label: 'Administrateur',
    icon: Shield,
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    borderClass: 'border-red-200',
    bgClass: 'bg-red-50',
    description: 'Contrôle total sur l\'élection (paramètres, candidatures, votants, résultats).',
  },
  manager: {
    label: 'Gestionnaire',
    icon: UserCheck,
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    borderClass: 'border-green-200',
    bgClass: 'bg-green-50',
    description: 'Gestion opérationnelle des votants, relances par mail et suivi de participation.',
  },
  observer: {
    label: 'Observateur',
    icon: Eye,
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    borderClass: 'border-blue-200',
    bgClass: 'bg-blue-50',
    description: 'Consultation uniquement (statistiques et résultats du scrutin).',
  },
  voter: {
    label: 'Votant',
    icon: Users2,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    borderClass: 'border-gray-200',
    bgClass: 'bg-gray-50',
    description: 'Électeur uniquement.',
  },
};

export default function TeamPage() {
  const params = useParams();
  const instanceId = params.instanceId as string;
  const { currentInstance } = useInstance();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'observer'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadTeam();
  }, [instanceId]);

  async function loadTeam() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/instance/${instanceId}/team`);
      const data = await response.json();

      if (response.ok) {
        setMembers(data.members || []);
      } else {
        setError(data.error || 'Erreur lors du chargement de l\'équipe');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  // ─── Ajouter un membre ──────────────────────────────────────────────────────
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setModalError('');

    if (!email.trim()) {
      setModalError('L\'adresse email est requise');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/instance/${instanceId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: selectedRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowAddModal(false);
        setEmail('');
        setSelectedRole('manager');
        setSuccess(data.message || 'Membre ajouté avec succès');
        loadTeam();
        setTimeout(() => setSuccess(''), 6000);
      } else {
        setModalError(data.error || 'Erreur lors de l\'ajout');
      }
    } catch {
      setModalError('Erreur de connexion au serveur');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Modifier le rôle ───────────────────────────────────────────────────────
  async function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember) return;

    setModalError('');
    setSubmitting(true);

    try {
      const response = await fetch(`/api/instance/${instanceId}/team?id=${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowEditModal(false);
        setSelectedMember(null);
        setSuccess('Rôle mis à jour avec succès');
        loadTeam();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setModalError(data.error || 'Erreur lors de la modification');
      }
    } catch {
      setModalError('Erreur de connexion au serveur');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Supprimer un membre ───────────────────────────────────────────────────
  async function handleDeleteMember() {
    if (!selectedMember) return;

    setSubmitting(true);
    setModalError('');

    try {
      const response = await fetch(`/api/instance/${instanceId}/team?id=${selectedMember.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedMember(null);
        setSuccess('Membre retiré de l\'équipe');
        loadTeam();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setModalError(data.error || 'Erreur lors de la suppression');
      }
    } catch {
      setModalError('Erreur de connexion au serveur');
    } finally {
      setSubmitting(false);
    }
  }

  // Filtrage des membres
  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header avec titre et bouton d'action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users2 className="w-7 h-7 text-theme-primary" />
            Équipe de l&apos;élection
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les personnes qui administrent ou supervisent ce scrutin (&quot;{currentInstance?.name}&quot;)
          </p>
        </div>
        <Button
          onClick={() => {
            setEmail('');
            setSelectedRole('manager');
            setModalError('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un membre
        </Button>
      </div>

      {/* Alertes de succès / erreur globales */}
      {success && (
        <Alert variant="success" className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </Alert>
      )}

      {/* Barre de recherche et filtre par rôle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-black"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: 'all', label: 'Tous' },
                { key: 'admin', label: 'Administrateurs' },
                { key: 'manager', label: 'Gestionnaires' },
                { key: 'observer', label: 'Observateurs' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setRoleFilter(f.key as typeof roleFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    roleFilter === f.key
                      ? 'bg-theme-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des membres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Membres de l&apos;équipe ({filteredMembers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Aucun membre trouvé</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchTerm || roleFilter !== 'all'
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : 'Cliquez sur "Ajouter un membre" pour commencer.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMembers.map((member) => {
                const roleConfig = ROLE_DETAILS[member.role] ?? ROLE_DETAILS.observer;
                const RoleIcon = roleConfig.icon;

                return (
                  <div
                    key={member.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-600 font-semibold text-sm">
                        {member.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                            {member.email}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleConfig.badgeClass}`}
                          >
                            <RoleIcon className="w-3 h-3" />
                            {roleConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Ajouté le {new Date(member.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setSelectedRole(member.role);
                          setModalError('');
                          setShowEditModal(true);
                        }}
                        className="text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Changer le rôle
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setModalError('');
                          setShowDeleteModal(true);
                        }}
                        className="text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL : Ajouter un membre ───────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => !submitting && setShowAddModal(false)}
        title="Ajouter un membre à l'équipe"
      >
        <form onSubmit={handleAddMember} className="space-y-5">
          {modalError && (
            <Alert variant="error">
              {modalError}
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              Si la personne possède déjà un compte (ex: elle est administrateur sur une autre élection), elle sera simplement rattachée à cette élection avec le rôle choisi.
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse email du membre
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                placeholder="collaborateur@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-black"
                required
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attribuer un rôle
            </label>
            <div className="space-y-2">
              {(['manager', 'admin', 'observer'] as UserRole[]).map((r) => {
                const config = ROLE_DETAILS[r];
                const Icon = config.icon;
                const isSelected = selectedRole === r;

                return (
                  <label
                    key={r}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? `${config.borderClass} ${config.bgClass}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={isSelected}
                      onChange={() => setSelectedRole(r)}
                      className="mt-0.5 text-theme-primary focus:ring-theme-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-gray-900">
                        <Icon className="w-4 h-4 text-gray-700" />
                        {config.label}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={!email || submitting}
            >
              Ajouter à l&apos;équipe
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL : Modifier le rôle ────────────────────────────────────────── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => !submitting && setShowEditModal(false)}
        title="Modifier le rôle du membre"
      >
        <form onSubmit={handleUpdateRole} className="space-y-5">
          {modalError && (
            <Alert variant="error">
              {modalError}
            </Alert>
          )}

          {selectedMember && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
              Changement de rôle pour <strong className="text-gray-900">{selectedMember.email}</strong>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau rôle
            </label>
            <div className="space-y-2">
              {(['manager', 'admin', 'observer'] as UserRole[]).map((r) => {
                const config = ROLE_DETAILS[r];
                const Icon = config.icon;
                const isSelected = selectedRole === r;

                return (
                  <label
                    key={r}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? `${config.borderClass} ${config.bgClass}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-role"
                      value={r}
                      checked={isSelected}
                      onChange={() => setSelectedRole(r)}
                      className="mt-0.5 text-theme-primary focus:ring-theme-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-gray-900">
                        <Icon className="w-4 h-4 text-gray-700" />
                        {config.label}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={submitting}
            >
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL : Confirmation de suppression ───────────────────────────── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !submitting && setShowDeleteModal(false)}
        title="Retirer le membre de l'équipe"
      >
        <div className="space-y-4">
          {modalError && (
            <Alert variant="error">
              {modalError}
            </Alert>
          )}

          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir retirer <strong className="text-gray-900">{selectedMember?.email}</strong> de l&apos;équipe de cette élection ?
          </p>
          <p className="text-xs text-gray-400">
            L&apos;utilisateur n&apos;aura plus accès à cet espace d&apos;administration. Son compte général et ses éventuels autres rôles ne seront pas supprimés.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteMember}
              loading={submitting}
              disabled={submitting}
            >
              Retirer de l&apos;équipe
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
