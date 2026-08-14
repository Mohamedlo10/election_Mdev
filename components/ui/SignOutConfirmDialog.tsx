'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SignOutConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignOutConfirmDialog({ isOpen, onClose }: SignOutConfirmDialogProps) {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isSigningOut ? () => {} : onClose} title="Déconnexion" size="sm">
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Êtes-vous sûr de vouloir vous déconnecter ?
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Vous devrez vous reconnecter pour accéder à votre espace.
        </p>
        
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSigningOut}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
          >
            {isSigningOut ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              'Se déconnecter'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
