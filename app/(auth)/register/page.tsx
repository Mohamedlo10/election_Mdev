'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus, Mail, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [instanceName, setInstanceName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
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

      setSuccess(true);
      setInstanceName(data.instanceName || '');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Compte créé !
          </h2>
          <p className="text-gray-600 mb-6">
            Un email contenant votre code de connexion a été envoyé à{' '}
            <span className="font-medium">{email}</span>
          </p>
          {instanceName && (
            <p className="text-sm text-gray-500 mb-6">
              Instance : {instanceName}
            </p>
          )}
          <Link href="/login">
            <Button className="w-full">
              Aller à la page de connexion
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle>Inscription</CardTitle>
        <CardDescription>
          Entrez votre email pour recevoir votre code de connexion
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <Alert variant="info" className="mb-4">
          Seuls les emails autorisés par l&apos;administrateur peuvent s&apos;inscrire.
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="email"
              placeholder="votremail@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={loading}
          >
            S&apos;inscrire
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 text-center">
        <p className="text-sm text-gray-600">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-green-600 hover:text-green-700 font-medium">
            Se connecter
          </Link>
        </p>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          Retour à l&apos;accueil
        </Link>
      </CardFooter>
    </Card>
  );
}
