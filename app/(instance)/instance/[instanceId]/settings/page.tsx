'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Settings, Play, Pause, StopCircle, AlertTriangle, XCircle, UserX, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import ImageUpload from '@/components/ui/ImageUpload';
import { useInstance } from '@/contexts/InstanceContext';
import {
  updateInstance,
  startElection,
  pauseElection,
  endElection,
  uploadLogo,
  deleteElectionVotersAuth,
} from '@/lib/services/election.service';
import type { ElectionStatus } from '@/types';

const statusConfig: Record<ElectionStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  active: { label: 'Active', variant: 'success' },
  paused: { label: 'En pause', variant: 'warning' },
  completed: { label: 'Terminee', variant: 'info' },
  archived: { label: 'Archivee', variant: 'error' },
};

export default function InstanceSettingsPage() {
  const params = useParams();
  const instanceId = params.instanceId as string;
  const { currentInstance, refreshInstance } = useInstance();

  const [formData, setFormData] = useState({
    name: '',
    primary_color: '#22c55e',
    secondary_color: '#1f2937',
    accent_color: '#eab308',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'start' | 'pause' | 'end' | null>(null);

  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    if (currentInstance) {
      setFormData({
        name: currentInstance.name || '',
        primary_color: currentInstance.primary_color || '#22c55e',
        secondary_color: currentInstance.secondary_color || '#1f2937',
        accent_color: currentInstance.accent_color || '#eab308',
      });
      setCurrentLogoUrl(currentInstance.logo_url);
    }
  }, [currentInstance]);

  async function handlePurgeAuth() {
    if (!currentInstance) return;
    setPurging(true);
    setError('');
    setSuccess('');

    const result = await deleteElectionVotersAuth(instanceId);
    if (result.success && result.data) {
      setSuccess(result.data.message || 'Comptes d\'authentification supprimés avec succès');
      await refreshInstance();
    } else {
      setError(result.error || 'Erreur lors de la suppression des comptes');
    }

    setShowPurgeModal(false);
    setPurging(false);
  }

  async function handleSave() {
    if (!currentInstance) return;

    setSaving(true);
    setError('');
    setSuccess('');

    // Upload new logo if selected
    let logoUrl = currentLogoUrl;
    if (logoFile) {
      const logoResult = await uploadLogo(logoFile, instanceId);
      if (logoResult.success && logoResult.data) {
        logoUrl = logoResult.data;
      }
    }

    const result = await updateInstance(instanceId, {
      ...formData,
      logo_url: logoUrl,
    });

    if (result.success) {
      await refreshInstance();
      setLogoFile(null);
      setSuccess('Parametres enregistres avec succes');
    } else {
      setError(result.error || 'Erreur lors de la sauvegarde');
    }

    setSaving(false);
  }

  async function handleStatusAction() {
    if (!currentInstance || !actionType) return;

    setSaving(true);
    let result;

    switch (actionType) {
      case 'start':
        result = await startElection(instanceId);
        break;
      case 'pause':
        result = await pauseElection(instanceId);
        break;
      case 'end':
        result = await endElection(instanceId);
        break;
    }

    if (result?.success) {
      await refreshInstance();
      if (actionType === 'start' && result.data) {
        const startData = result.data as { notified?: number; errors?: string[] };
        const notified = startData.notified ?? 0;
        const errs = startData.errors ?? [];
        if (errs.length > 0) {
          setSuccess(
            `Election lancée ! ${notified} votant(s) notifié(s) par email. ${errs.length} erreur(s) d'envoi (voir console).`
          );
        } else {
          setSuccess(`Election lancée ! ${notified} votant(s) notifié(s) par email.`);
        }
      } else {
        setSuccess('Statut mis a jour avec succes');
      }
    } else {
      setError(result?.error || 'Erreur lors du changement de statut');
    }

    setShowActionModal(false);
    setActionType(null);
    setSaving(false);
  }


  function openActionModal(action: 'start' | 'pause' | 'end') {
    setActionType(action);
    setShowActionModal(true);
  }

  const getActionMessage = () => {
    switch (actionType) {
      case 'start':
        return 'Etes-vous sur de vouloir demarrer l\'election ? Un email de connexion sera automatiquement envoyé à tous les votants enregistrés.';

      case 'pause':
        return 'Etes-vous sur de vouloir mettre en pause l\'election ? Les votes seront temporairement suspendus.';
      case 'end':
        return 'Etes-vous sur de vouloir terminer l\'election ? Cette action est definitive et les votes ne seront plus possibles.';
      default:
        return '';
    }
  };

  if (!currentInstance) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Parametres</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Gerez les parametres de votre instance d&apos;election</p>
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
          <button onClick={() => setSuccess('')} className="ml-2 underline">Fermer</button>
        </Alert>
      )}

      {/* Status Control */}
      <Card>
        <CardHeader>
          <CardTitle>Controle de l&apos;election</CardTitle>
          <CardDescription>Gerez le statut de votre election</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Statut actuel</p>
              <Badge variant={statusConfig[currentInstance.status].variant} size="md">
                {statusConfig[currentInstance.status].label}
              </Badge>
            </div>
            <div className="flex gap-2">
              {currentInstance.status === 'draft' && (
                <Button onClick={() => openActionModal('start')}>
                  <Play className="w-4 h-4 mr-2" />
                  Demarrer
                </Button>
              )}
              {currentInstance.status === 'active' && (
                <>
                  <Button variant="outline" onClick={() => openActionModal('pause')}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                  <Button variant="danger" onClick={() => openActionModal('end')}>
                    <StopCircle className="w-4 h-4 mr-2" />
                    Terminer
                  </Button>
                </>
              )}
              {currentInstance.status === 'paused' && (
                <>
                  <Button onClick={() => openActionModal('start')}>
                    <Play className="w-4 h-4 mr-2" />
                    Reprendre
                  </Button>
                  <Button variant="danger" onClick={() => openActionModal('end')}>
                    <StopCircle className="w-4 h-4 mr-2" />
                    Terminer
                  </Button>
                </>
              )}
              {(currentInstance.status === 'completed' || currentInstance.status === 'archived') && (
                currentInstance.auth_purged_at ? (
                  <Badge variant="success" size="md">
                    <CheckCircle className="w-4 h-4 mr-1.5 inline" />
                    Comptes Auth purgés
                  </Badge>
                ) : (
                  <Button variant="danger" onClick={() => setShowPurgeModal(true)}>
                    <UserX className="w-4 h-4 mr-2" />
                    Supprimer les comptes Auth
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nettoyage des comptes d'accès si élection terminée */}
      {(currentInstance.status === 'completed' || currentInstance.status === 'archived') && (
        currentInstance.auth_purged_at ? (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-green-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Purge des comptes d&apos;accès effectuée
              </CardTitle>
              <CardDescription className="text-green-700">
                Les comptes d&apos;authentification Supabase Auth de cette élection ont été définitivement purgés.
                <span className="block mt-1 text-xs text-green-800 font-medium">
                  Date de purge : {new Date(currentInstance.auth_purged_at).toLocaleDateString('fr-FR')} à {new Date(currentInstance.auth_purged_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="md">
                  <CheckCircle className="w-4 h-4 mr-1.5 inline" />
                  Comptes Auth réinitialisés (Emails et noms conservés)
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-200 bg-red-50/40">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-600" />
                Purge des comptes d&apos;accès des votants
              </CardTitle>
              <CardDescription className="text-red-700">
                L&apos;élection est terminée. Vous pouvez supprimer définitivement les comptes d&apos;authentification Supabase Auth créés par les votants. Leurs e-mails et noms resteront conservés dans la liste des votants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="danger" onClick={() => setShowPurgeModal(true)}>
                <UserX className="w-4 h-4 mr-2" />
                Supprimer les comptes Auth des votants
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Informations generales</CardTitle>
          <CardDescription>Modifiez les informations de base de l&apos;election</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUpload
            label="Logo de l'election"
            currentImageUrl={currentLogoUrl}
            onImageSelect={(file) => setLogoFile(file)}
            onImageRemove={() => {
              setLogoFile(null);
              setCurrentLogoUrl(null);
            }}
            shape="square"
            size="lg"
            fallbackIcon="image"
          />
          <Input
            label="Nom de l'election"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur primaire
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="h-10 w-10 rounded-lg border border-gray-300 cursor-pointer bg-transparent"
                />
                <div className="flex-1">
                  <div
                    className="h-10 w-full rounded-lg border border-gray-200"
                    style={{ backgroundColor: formData.primary_color }}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">{formData.primary_color.toUpperCase()}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur secondaire
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="h-10 w-10 rounded-lg border border-gray-300 cursor-pointer bg-transparent"
                />
                <div className="flex-1">
                  <div
                    className="h-10 w-full rounded-lg border border-gray-200"
                    style={{ backgroundColor: formData.secondary_color }}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">{formData.secondary_color.toUpperCase()}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur accent
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="h-10 w-10 rounded-lg border border-gray-300 cursor-pointer bg-transparent"
                />
                <div className="flex-1">
                  <div
                    className="h-10 w-full rounded-lg border border-gray-200"
                    style={{ backgroundColor: formData.accent_color }}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">{formData.accent_color.toUpperCase()}</p>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} loading={saving}>
              Enregistrer les modifications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setActionType(null);
        }}
        title={
          actionType === 'start'
            ? 'Demarrer l\'election'
            : actionType === 'pause'
            ? 'Mettre en pause'
            : 'Terminer l\'election'
        }
        size={actionType === 'start' ? 'md' : 'sm'}
      >
        <div className="space-y-4">
          {actionType === 'start' && (
            <>
              <Alert variant="warning">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Attention: Cette action a des consequences importantes
              </Alert>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-3">
                  Une fois l&apos;election demarree:
                </h4>
                <ul className="space-y-2 text-sm text-yellow-700">
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>Les <strong>categories</strong> ne peuvent plus etre modifiees ni ajoutees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>Les <strong>candidats</strong> ne peuvent plus etre modifies ni ajoutes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>Les <strong>votants</strong> ne peuvent plus etre modifies ni ajoutes</span>
                  </li>
                </ul>
              </div>

              <p className="text-gray-600 text-sm">
                Les votants pourront commencer a voter des que l&apos;election sera active.
              </p>
            </>
          )}

          {actionType === 'end' && (
            <Alert variant="warning">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Cette action est irreversible
            </Alert>
          )}

          {actionType !== 'start' && (
            <p className="text-gray-600">{getActionMessage()}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowActionModal(false);
                setActionType(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant={actionType === 'end' ? 'danger' : 'primary'}
              onClick={handleStatusAction}
              loading={saving}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Purge Auth */}
      <Modal
        isOpen={showPurgeModal}
        onClose={() => setShowPurgeModal(false)}
        title="Supprimer les comptes d'accès des votants"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Cette action supprimera définitivement les comptes Supabase Auth des votants de cette élection.</span>
          </Alert>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 text-xs text-gray-700 space-y-2">
            <p className="font-semibold text-gray-900">Conséquences de l&apos;opération :</p>
            <p className="flex items-center gap-1.5">• <span>Les identifiants d&apos;authentification des votants sont supprimés.</span></p>
            <p className="flex items-center gap-1.5">• <strong>Les noms et adresses e-mails restent conservés dans la liste des votants.</strong></p>
            <p className="flex items-center gap-1.5">• <span>Les bulletins de vote et les statistiques ne sont pas affectés.</span></p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowPurgeModal(false)} disabled={purging}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handlePurgeAuth} loading={purging}>
              Confirmer la suppression
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
