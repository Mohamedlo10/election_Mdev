'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateUserPassword } from '@/lib/services/auth.service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { Lock, CheckCircle, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

type PageState = 'loading' | 'form' | 'success' | 'error';

function ResetPasswordForm() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  useEffect(() => {
    // Supabase injecte le token de récupération via onAuthStateChange avec l'event PASSWORD_RECOVERY
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Le token est valide, afficher le formulaire
        setPageState('form');
      } else if (event === 'SIGNED_IN') {
        // Cas où la session est déjà restaurée depuis l'URL
        setPageState('form');
      }
    });

    // Timeout de sécurité : si après 5s aucun événement PASSWORD_RECOVERY, lien invalide/expiré
    const timeout = setTimeout(() => {
      setPageState(prev => {
        if (prev === 'loading') {
          setErrorDetail('Le lien a peut-être expiré ou est invalide. Demandez un nouveau lien depuis la page de connexion.');
          return 'error';
        }
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Validation du mot de passe
  const passwordStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 8) return 'weak';
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score >= 2 && password.length >= 10) return 'strong';
    return 'medium';
  })();

  const strengthConfig = {
    weak: { label: 'Faible', color: '#ef4444', width: '33%' },
    medium: { label: 'Moyen', color: '#eab308', width: '66%' },
    strong: { label: 'Fort', color: '#22c55e', width: '100%' },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations côté client
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      // 1. Mettre à jour le mot de passe via Supabase Auth
      const result = await updateUserPassword(password);

      if (!result.success) {
        setError(result.error || 'Erreur lors de la mise à jour du mot de passe');
        setLoading(false);
        return;
      }

      // 2. Confirmer côté serveur (marquer password_set_at dans voters)
      await fetch('/api/auth/set-password-confirmed', {
        method: 'POST',
      });

      // 3. Afficher le succès
      setPageState('success');

      // 4. Redirection automatique vers le dashboard après 3 secondes
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch {
      setError('Une erreur inattendue est survenue. Réessayez.');
      setLoading(false);
    }
  };

  // ─── État : Chargement ──────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-theme-primary" />
          <p className="text-gray-500 text-sm">Vérification du lien en cours...</p>
        </CardContent>
      </Card>
    );
  }

  // ─── État : Erreur / Lien expiré ───────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <CardTitle>Lien invalide ou expiré</CardTitle>
          <CardDescription>
            {errorDetail || 'Ce lien de connexion n\'est plus valide.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Demander un nouveau lien
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── État : Succès ─────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <CardTitle>Mot de passe défini !</CardTitle>
          <CardDescription>
            Votre mot de passe a été enregistré. Vous allez être redirigé vers votre espace...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
        </CardContent>
      </Card>
    );
  }

  // ─── État : Formulaire ─────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-theme-primary-lighter rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-theme-primary" />
        </div>
        <CardTitle>Définissez votre mot de passe</CardTitle>
        <CardDescription>
          Choisissez un mot de passe sécurisé que vous utiliserez pour toutes vos prochaines connexions.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 text-black"
                required
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Indicateur de force du mot de passe */}
            {passwordStrength && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: strengthConfig[passwordStrength].width,
                      backgroundColor: strengthConfig[passwordStrength].color,
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: strengthConfig[passwordStrength].color }}>
                  Sécurité : {strengthConfig[passwordStrength].label}
                </p>
              </div>
            )}
          </div>

          {/* Confirmation du mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`pl-10 pr-10 text-black ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-400 focus:border-red-500'
                    : confirmPassword && confirmPassword === password
                    ? 'border-green-400 focus:border-green-500'
                    : ''
                }`}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
            {confirmPassword && confirmPassword === password && (
              <p className="text-xs text-green-500 mt-1">✓ Les mots de passe correspondent</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={
              !password ||
              !confirmPassword ||
              password !== confirmPassword ||
              password.length < 8 ||
              loading
            }
          >
            Définir mon mot de passe
          </Button>
        </form>
      </CardContent>

      <CardFooter className="text-center">
        <p className="text-xs text-gray-400">
          Vous utiliserez ce mot de passe pour toutes vos prochaines connexions.
        </p>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
        </CardContent>
      </Card>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
