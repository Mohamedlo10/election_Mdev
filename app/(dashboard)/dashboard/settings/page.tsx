'use client';

import { useState } from 'react';
import { Settings, Play, Pause, StopCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useElection } from '@/hooks/useElection';
import {
  updateInstance,
  startElection,
  pauseElection,
  endElection,
} from '@/lib/services/election.service';
import type { ElectionStatus } from '@/types';

const statusConfig: Record<ElectionStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  active: { label: 'Active', variant: 'success' },
  paused: { label: 'En pause', variant: 'warning' },
  completed: { label: 'Terminée', variant: 'info' },
  archived: { label: 'Archivée', variant: 'error' },
};

export default function SettingsPage() {
  const { authUser } = useAuth();
  const { currentInstance, setCurrentInstance } = useElection();

  const [formData, setFormData] = useState({
    name: currentInstance?.name || '',
    primary_color: currentInstance?.primary_color || '#22c55e',
    secondary_color: currentInstance?.secondary_color || '#1f2937',
    accent_color: currentInstance?.accent_color || '#eab308',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'start' | 'pause' | 'end' | null>(null);

  async function handleSave() {
    if (!currentInstance) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const result = await updateInstance(currentInstance.id, formData);

    if (result.success && result.data) {
      setCurrentInstance(result.data);
      setSuccess('Paramètres enregistrés avec succès');
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
        result = await startElection(currentInstance.id);
        break;
      case 'pause':
        result = await pauseElection(currentInstance.id);
        break;
      case 'end':
        result = await endElection(currentInstance.id);
        break;
    }

    if (result?.success && result.data) {
      setCurrentInstance(result.data);
      setSuccess('Statut mis à jour avec succès');
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
        return 'Êtes-vous sûr de vouloir démarrer l\'élection ? Les votants pourront commencer à voter.';
      case 'pause':
        return 'Êtes-vous sûr de vouloir mettre en pause l\'élection ? Les votes seront temporairement suspendus.';
      case 'end':
        return 'Êtes-vous sûr de vouloir terminer l\'élection ? Cette action est définitive et les votes ne seront plus possibles.';
      default:
        return '';
    }
  };

  if (!currentInstance && authUser?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune instance sélectionnée</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600 mt-1">Gérez les paramètres de votre instance d&apos;élection</p>
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
      {currentInstance && (
        <Card>
          <CardHeader>
            <CardTitle>Contrôle de l&apos;élection</CardTitle>
            <CardDescription>Gérez le statut de votre élection</CardDescription>
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
                    Démarrer
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>Modifiez les informations de base de l&apos;élection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nom de l'élection"
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
            ? 'Démarrer l\'élection'
            : actionType === 'pause'
            ? 'Mettre en pause'
            : 'Terminer l\'élection'
        }
        size="sm"
      >
        <div className="space-y-4">
          {actionType === 'end' && (
            <Alert variant="warning">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Cette action est irréversible
            </Alert>
          )}
          <p className="text-gray-600">{getActionMessage()}</p>
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
    </div>
  );
}
