'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { Download, CheckCircle } from 'lucide-react';
import type { ElectionInstance } from '@/types';

interface ExportVotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (instanceId: string, instanceName: string) => void;
}

export default function ExportVotesModal({
  isOpen,
  onClose,
  onExport,
}: ExportVotesModalProps) {
  const [instances, setInstances] = useState<ElectionInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadInstances();
    }
  }, [isOpen]);

  const loadInstances = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('election_instances')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setInstances(data);
    }
    setLoading(false);
  };

  const handleExport = () => {
    if (selectedInstanceId) {
      const instance = instances.find(i => i.id === selectedInstanceId);
      onExport(selectedInstanceId, instance?.name || 'Instance');
      onClose();
      setSelectedInstanceId('');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-blue-100 text-blue-700',
      archived: 'bg-gray-100 text-gray-500',
    };
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      active: 'Active',
      paused: 'En pause',
      completed: 'Terminée',
      archived: 'Archivée',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exporter les votes" size="lg">
      <div className="px-6 py-4">
        <p className="text-sm text-gray-600 mb-4">
          Sélectionnez l&apos;instance d&apos;élection dont vous souhaitez exporter les votes.
        </p>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="text-sm text-gray-500 mt-2">Chargement des instances...</p>
          </div>
        ) : instances.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucune instance disponible</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {instances.map((instance) => (
              <button
                key={instance.id}
                onClick={() => setSelectedInstanceId(instance.id)}
                className={`
                  w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all
                  ${selectedInstanceId === instance.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: instance.primary_color }}
                  />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{instance.name}</p>
                    <p className="text-xs text-gray-500">
                      Créée le {new Date(instance.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(instance.status)}
                  {selectedInstanceId === instance.id && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            onClose();
            setSelectedInstanceId('');
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleExport}
          disabled={!selectedInstanceId}
          className="inline-flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exporter
        </Button>
      </div>
    </Modal>
  );
}
