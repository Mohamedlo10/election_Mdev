'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { updateUserPassword } from '@/lib/services/auth.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { createClient } from '@/lib/supabase/client';
import {
  User, Lock, Eye, EyeOff, Shield, Vote,
  CheckCircle, ChevronRight, KeyRound, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import type { UserInstanceSummary } from '@/types';

// ─── Indicateur de force du mot de passe ─────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [
    password.length >= 8,
    hasUpper,
    hasNumber,
    hasSpecial,
    password.length >= 12,
  ].filter(Boolean).length;

  const config =
    score <= 2 ? { label: 'Faible', color: '#ef4444', width: '25%' } :
    score <= 3 ? { label: 'Moyen', color: '#eab308', width: '55%' } :
    score <= 4 ? { label: 'Bon', color: '#3b82f6', width: '75%' } :
                 { label: 'Excellent', color: '#22c55e', width: '100%' };

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: config.width, backgroundColor: config.color }}
        />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs" style={{ color: config.color }}>
          Sécurité : {config.label}
        </p>
        <p className="text-xs text-gray-400">
          {password.length >= 8 ? '✓ 8 car. min' : '✗ 8 car. min'}
        </p>
      </div>
    </div>
  );
}

// ─── Badge de statut d'instance ───────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
  active:    { label: 'En cours',  className: 'bg-green-100 text-green-700' },
  paused:    { label: 'En pause',  className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Terminée', className: 'bg-blue-100 text-blue-700' },
  archived:  { label: 'Archivée', className: 'bg-gray-100 text-gray-500' },
};

const ROLE_LABELS: Record<string, string> = {
  admin:    'Administrateur',
  manager:  'Gestionnaire',
  observer: 'Observateur',
  voter:    'Votant',
};

function InstanceRow({ instance }: { instance: UserInstanceSummary }) {
  const status = STATUS_LABELS[instance.instance_status] ?? STATUS_LABELS.draft;
  const isAdmin = instance.context === 'admin_instance';
  const href = isAdmin
    ? `/instance/${instance.instance_id}`
    : `/instance/${instance.instance_id}/vote`;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${instance.primary_color || '#22c55e'}20` }}
      >
        {isAdmin
          ? <Shield className="w-4 h-4" style={{ color: instance.primary_color || '#22c55e' }} />
          : <Vote className="w-4 h-4" style={{ color: instance.primary_color || '#22c55e' }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{instance.instance_name}</p>
        <p className="text-xs text-gray-500">{ROLE_LABELS[instance.role] ?? instance.role}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>
          {status.label}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </Link>
  );
}

// ─── Section : Changement de mot de passe ────────────────────────────────────

function PasswordSection({ userEmail }: { userEmail: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    if (currentPassword === newPassword) {
      setError('Le nouveau mot de passe doit être différent de l\'actuel');
      return;
    }

    setLoading(true);

    try {
      // 1. Vérifier le mot de passe actuel en tentant une connexion
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setError('Mot de passe actuel incorrect');
        setLoading(false);
        return;
      }

      // 2. Mettre à jour avec le nouveau mot de passe
      const result = await updateUserPassword(newPassword);

      if (!result.success) {
        setError(result.error || 'Erreur lors de la mise à jour');
        setLoading(false);
        return;
      }

      // 3. Marquer password_set_at côté serveur (pour les votants)
      await fetch('/api/auth/set-password-confirmed', { method: 'POST' });

      // 4. Réinitialiser le formulaire et afficher le succès
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);

      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setError('Une erreur inattendue est survenue');
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({
    label,
    value,
    onChange,
    show,
    onToggle,
    placeholder,
    autoFocus = false,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder?: string;
    autoFocus?: boolean;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10 text-black"
          required
          disabled={loading}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-indigo-600" />
          </div>
          <CardTitle className="text-base">Sécurité — Mot de passe</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {success && (
          <Alert variant="success" className="mb-4">
            <CheckCircle className="w-4 h-4" />
            Mot de passe mis à jour avec succès.
          </Alert>
        )}
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="Mot de passe actuel"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent(p => !p)}
            placeholder="Votre mot de passe actuel"
            autoFocus
          />

          <PasswordInput
            label="Nouveau mot de passe"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew(p => !p)}
            placeholder="Minimum 8 caractères"
          />
          {newPassword && <PasswordStrength password={newPassword} />}

          <PasswordInput
            label="Confirmer le nouveau mot de passe"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm(p => !p)}
            placeholder="Répétez le nouveau mot de passe"
          />
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Les mots de passe ne correspondent pas
            </p>
          )}
          {confirmPassword && confirmPassword === newPassword && newPassword.length >= 8 && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Les mots de passe correspondent
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword ||
              newPassword.length < 8 ||
              loading
            }
            className="w-full sm:w-auto"
          >
            Mettre à jour le mot de passe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Page principale Profil ───────────────────────────────────────────────────

export default function ProfilePage() {
  const { authUser, adminInstances, voterInstances } = useAuth();

  if (!authUser) return null;

  const allInstances = [...(adminInstances ?? []), ...(voterInstances ?? [])];
  const hasInstances = allInstances.length > 0;

  const roleLabel = {
    super_admin: 'Super Administrateur',
    admin: 'Administrateur',
    manager: 'Gestionnaire',
    observer: 'Observateur',
    voter: 'Votant',
  }[authUser.role] ?? authUser.role;

  const initials = authUser.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* En-tête de profil */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-theme-primary-lighter flex items-center justify-center flex-shrink-0 border-2 border-theme-primary-light">
          <span className="text-2xl font-bold text-theme-primary">{initials}</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-sm text-gray-500">{authUser.email}</p>
        </div>
      </div>

      {/* Informations du compte */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <CardTitle className="text-base">Informations du compte</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-sm font-medium text-gray-500">Adresse email</dt>
              <dd className="text-sm text-gray-900 font-medium">{authUser.email}</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-sm font-medium text-gray-500">Rôle principal</dt>
              <dd className="text-sm text-gray-900">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-theme-primary-lighter text-theme-primary">
                  {roleLabel}
                </span>
              </dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-sm font-medium text-gray-500">Espaces accessibles</dt>
              <dd className="text-sm text-gray-900 font-medium">{allInstances.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Changement de mot de passe */}
      <PasswordSection userEmail={authUser.email} />

      {/* Mes instances */}
      {hasInstances && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <Vote className="w-5 h-5 text-green-600" />
              </div>
              <CardTitle className="text-base">Mes espaces</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-2 py-0">
            <div className="divide-y divide-gray-50">
              {allInstances.map((instance) => (
                <InstanceRow key={`${instance.context}-${instance.instance_id}`} instance={instance} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
