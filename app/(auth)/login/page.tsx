'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Vote, Mail, ArrowLeft, Loader2, Lock, Clock, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';

type Step = 'email' | 'code' | 'password' | 'waiting';

function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);

    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const checkEmailAndRequestCode = async () => {
    setError('');
    setInfo('');
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

      // Détecter le type d'utilisateur
      if (data.user_type === 'admin') {
        setStep('password');
      } else if (data.election_not_started) {
        // Élection pas encore démarrée
        setInstanceName(data.instance_name);
        setStep('waiting');
      } else if (data.election_ended) {
        // Élection terminée
        setStep('code');
        setCode(['', '', '', '', '', '']);
        
        if (data.has_existing_code) {
          setInfo(`L'élection "${data.instance_name}" est terminée. Votre dernier code est toujours valide pour consulter les résultats.`);
        } else {
          setError(data.message || 'Aucun code disponible pour cette élection terminée.');
          return;
        }

        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        // Voter - élection active
        setStep('code');
        setCode(['', '', '', '', '', '']);

        if (data.has_existing_code) {
          // Code existant valide pour élection active
          const timeInfo = data.minutes_remaining ? `(${data.minutes_remaining} min restantes)` : '';
          setInfo(`Votre code précédent est toujours valide ${timeInfo}. Entrez-le ci-dessous.`);
        } else {
          // Nouveau code envoyé
          setInfo('');
        }

        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError('');
    setInfo('');
    setLoading(true);

    const codeString = code.join('');

    if (codeString.length !== 6) {
      setError('Veuillez entrer les 6 chiffres du code');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeString }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Code invalide');
        setLoading(false);
        return;
      }

      // Se connecter avec les credentials
      if (data.credentials) {
        const result = await signIn(data.credentials.email, data.credentials.password);
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
      }

      router.push('/dashboard');
    } catch {
      setError('Erreur de connexion au serveur');
      setLoading(false);
    }
  };

  const loginWithPassword = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.error) {
        setError('Email ou mot de passe incorrect');
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
      await checkEmailAndRequestCode();
    } else if (step === 'code') {
      await verifyCode();
    } else if (step === 'password') {
      await loginWithPassword();
    }
  };

  const handleBack = () => {
    setStep('email');
    setCode(['', '', '', '', '', '']);
    setPassword('');
    setError('');
    setInfo('');
    setInstanceName('');
  };

  const getDescription = () => {
    if (step === 'email') {
      return 'Entrez votre email pour vous connecter';
    }
    if (step === 'code') {
      return `Entrez le code reçu par email`;
    }
    if (step === 'password') {
      return 'Entrez votre mot de passe';
    }
    if (step === 'waiting') {
      return '';
    }
    return '';
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-theme-primary-lighter rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          {step === 'waiting' ? (
            <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-theme-primary" />
          ) : (
            <Vote className="w-7 h-7 sm:w-8 sm:h-8 text-theme-primary" />
          )}
        </div>
        <CardTitle>{step === 'waiting' ? 'Inscription confirmée' : 'Connexion'}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {info && (
          <Alert variant="info" className="mb-4">
            {info}
          </Alert>
        )}

        {step === 'waiting' ? (
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
                Votre code de connexion vous sera envoyé par email dès que l&apos;élection démarrera.
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'email' && (
              <>
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

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={!email || loading}
                >
                  Continuer
                </Button>
              </>
            )}

            {step === 'code' && (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Changer d&apos;email
                </button>

                <div className="text-center mb-2">
                  <p className="text-sm text-gray-500">{email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                    Code à 6 chiffres
                  </label>
                  <div className="flex gap-2 sm:gap-3 justify-center">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className="w-10 h-10 sm:w-12 sm:h-12 text-black text-center text-xl sm:text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-light outline-none transition-all"
                        required
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={code.join('').length !== 6 || loading}
                >
                  Se connecter
                </Button>
              </>
            )}

            {step === 'password' && (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Changer d&apos;email
                </button>

                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600">{email}</p>
                </div>

                <div className="relative mx-4">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 text-black"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={!password || loading}
                >
                  Se connecter
                </Button>
              </>
            )}
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
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
