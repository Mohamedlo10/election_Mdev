'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Vote, Mail, Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';

function RegisterForm() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Validation dynamique de la force du mot de passe
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
    setSuccess('');

    if (!email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

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
      // 1. Appeler l'API d'inscription
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'inscription');
        setLoading(false);
        return;
      }

      setSuccess('Compte créé avec succès ! Se connecter...');

      // 2. Connecter automatiquement l'utilisateur
      const loginResult = await signIn(email.trim(), password);

      if (loginResult.error) {
        // En cas d'échec de la connexion auto, rediriger vers /login
        setTimeout(() => {
          router.push('/login');
        }, 1500);
        return;
      }

      // 3. Rediriger directement vers le Dashboard unifié
      router.push('/dashboard');

    } catch {
      setError('Erreur de connexion au serveur');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-theme-primary-lighter rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <Vote className="w-7 h-7 sm:w-8 sm:h-8 text-theme-primary" />
        </div>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>
          Inscrivez-vous pour créer vos élections et accéder à votre espace
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                placeholder="votremail@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 text-black text-sm"
                required
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 text-black text-sm"
                required
                disabled={loading}
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

            {/* Jauge de sécurité */}
            {passwordStrength && (
              <div className="mt-1.5">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: strengthConfig[passwordStrength].width,
                      backgroundColor: strengthConfig[passwordStrength].color,
                    }}
                  />
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: strengthConfig[passwordStrength].color }}>
                  Sécurité : {strengthConfig[passwordStrength].label}
                </p>
              </div>
            )}
          </div>

          {/* Confirmer mot de passe */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Répétez votre mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`pl-10 pr-10 text-black text-sm ${
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
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            loading={loading}
            disabled={
              !email ||
              !password ||
              !confirmPassword ||
              password !== confirmPassword ||
              password.length < 8 ||
              loading
            }
          >
            Créer mon compte
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 text-center border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="font-semibold text-theme-primary hover:underline">
            Se connecter
          </Link>
        </p>
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 mt-1">
          Retour à l&apos;accueil
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
        </CardContent>
      </Card>
    }>
      <RegisterForm />
    </Suspense>
  );
}
