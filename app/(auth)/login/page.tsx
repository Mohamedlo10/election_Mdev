'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Vote, Mail, ArrowLeft, Loader2, Lock, Clock, CheckCircle, Send, Eye, EyeOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import GoogleAuthButton from '@/components/ui/GoogleAuthButton';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef } from 'react';

// Étapes du flux de connexion
// - 'email'       : saisie de l'email (point d'entrée unique)
// - 'password'    : saisie du mot de passe (admin/manager/observer + votants avec mdp défini)
// - 'reset-sent'  : lien de réinitialisation/définition envoyé (première connexion votant)
// - 'waiting'     : élection pas encore démarrée
type Step = 'email' | 'password' | 'reset-sent' | 'waiting';

function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [instanceName, setInstanceName] = useState('');

  // Cooldown 60s sur "Renvoyer le lien"
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Étape 1 : Vérification de l'email
   *
   * Logique de routage :
   * - Admin/Manager/Observer avec mdp défini → step 'password'
   * - Votant avec mdp défini (password_set_at != null) → step 'password'
   * - Votant sans mdp défini (première connexion) → envoie lien reset → step 'reset-sent'
   * - Élection pas démarrée → step 'waiting'
   * - Email inconnu → erreur
   */
  const handleEmailSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue');
        setLoading(false);
        return;
      }

      if (data.user_type === 'admin') {
        // Admin/Manager/Observer → connexion par mot de passe
        setStep('password');

      } else if (data.election_not_started) {
        // Élection pas encore démarrée
        setInstanceName(data.instance_name || '');
        setStep('waiting');

      } else if (data.user_type === 'voter') {
        // Votant : vérifier si le mot de passe est déjà défini
        if (data.password_set) {
          // Mot de passe déjà défini → connexion classique
          setStep('password');
        } else {
          // Première connexion → envoyer le lien expirable
          await sendResetLink();
        }
      } else {
        setError('Situation inattendue. Contactez l\'administrateur.');
      }

    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envoie le lien expirable de définition de mot de passe
   * (utilisé pour la première connexion d'un votant)
   */
  const sendResetLink = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'envoi de l\'email');
        return;
      }

      setStep('reset-sent');
      startCooldown();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Étape 2 : Connexion avec mot de passe
   */
  const loginWithPassword = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.error) {
        if (result.error.toLowerCase().includes('not confirmed') || result.error.toLowerCase().includes('confirm')) {
          setError('Votre adresse email n\'a pas encore été confirmée. Veuillez cliquer sur le lien reçu par mail.');
        } else {
          setError('Email ou mot de passe incorrect');
        }
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Erreur de connexion au serveur');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'email') {
      await handleEmailSubmit();
    } else if (step === 'password') {
      await loginWithPassword();
    }
  };

  const handleBack = () => {
    setStep('email');
    setPassword('');
    setError('');
    setInstanceName('');
  };

  // ─── Rendu du titre/description selon l'étape ─────────────────────────────
  const stepConfig: Record<Step, { title: string; description: string }> = {
    email: { title: 'Connexion', description: 'Entrez votre adresse email pour continuer' },
    password: { title: 'Mot de passe', description: `Connectez-vous en tant que ${email}` },
    'reset-sent': { title: 'Email envoyé !', description: '' },
    waiting: { title: 'Inscription confirmée', description: '' },
  };

  const { title, description } = stepConfig[step];

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-theme-primary-lighter rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          {step === 'waiting' || step === 'reset-sent' ? (
            step === 'reset-sent'
              ? <Send className="w-7 h-7 sm:w-8 sm:h-8 text-theme-primary" />
              : <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-theme-primary" />
          ) : (
            <Vote className="w-7 h-7 sm:w-8 sm:h-8 text-theme-primary" />
          )}
        </div>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* ── ÉTAPE : Élection en attente ──────────────────────────────── */}
        {step === 'waiting' && (
          <div className="text-center py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <p className="text-gray-700 font-medium mb-2">
                Vous êtes inscrit pour l&apos;élection
              </p>
              <p className="text-theme-primary font-semibold text-lg mb-3">
                &quot;{instanceName}&quot;
              </p>
              <p className="text-gray-600 text-sm">
                Votre lien de connexion vous sera envoyé par email dès que l&apos;élection démarrera.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Retour
            </button>
          </div>
        )}

        {/* ── ÉTAPE : Lien de connexion envoyé ────────────────────────── */}
        {step === 'reset-sent' && (
          <div className="text-center py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <Mail className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <p className="text-gray-700 font-medium mb-2">
                Un lien de connexion a été envoyé à
              </p>
              <p className="text-theme-primary font-semibold text-lg mb-3">
                {email}
              </p>
              <p className="text-gray-600 text-sm">
                Cliquez sur le lien dans l&apos;email pour définir votre mot de passe et accéder à votre espace.
                Le lien est valable <strong>1 heure</strong>.
              </p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Vous n&apos;avez pas reçu l&apos;email ?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={sendResetLink}
                loading={loading}
                disabled={loading || cooldown > 0}
                className="w-full"
              >
                {cooldown > 0
                  ? `Renvoyer dans ${cooldown}s`
                  : 'Renvoyer le lien'
                }
              </Button>
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Changer d&apos;email
              </button>
            </div>
          </div>
        )}

        {/* ── FORMULAIRE (email ou password) ──────────────────────────── */}
        {(step === 'email' || step === 'password') && (
          <div className="space-y-4">
            {step === 'email' && (
              <>
                <div className="mx-4">
                  <GoogleAuthButton
                    label="Continuer avec Google"
                    onError={(err) => setError(err)}
                    disabled={loading}
                  />
                </div>

                <div className="relative mx-4 my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400 font-medium">Ou avec votre email</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Étape email */}
              {step === 'email' && (
                <div className="relative mx-4">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="votremail@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 text-black"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              )}

            {/* Étape mot de passe */}
            {step === 'password' && (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Changer d&apos;email
                </button>

                <div className="relative mx-4">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mot de passe"
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
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Lien mot de passe oublié */}
                <div className="text-right mx-4">
                  <button
                    type="button"
                    onClick={sendResetLink}
                    disabled={loading || cooldown > 0}
                    className="text-xs font-medium text-theme-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cooldown > 0 ? `Renvoi possible dans ${cooldown}s` : 'Mot de passe oublié ?'}
                  </button>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={
                (step === 'email' && !email) ||
                (step === 'password' && !password) ||
                loading
              }
            >
              {step === 'email' ? 'Continuer' : 'Se connecter'}
            </Button>
          </form>
        </div>
      )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 text-center border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-semibold text-theme-primary hover:underline">
            S&apos;inscrire
          </Link>
        </p>
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 mt-1">
          Retour à l&apos;accueil
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
        </CardContent>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  );
}
