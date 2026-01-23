'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Vote, Mail, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, code);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Vote className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>
          Entrez votre email et votre code à 6 chiffres
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

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

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="password"
              placeholder="Code à 6 chiffres"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              pattern="[0-9]{6}"
              className="pl-10 tracking-widest"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={loading}
          >
            Se connecter
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 text-center">
        <p className="text-sm text-gray-600">
          Pas encore inscrit ?{' '}
          <Link href="/register" className="text-green-600 hover:text-green-700 font-medium">
            Créer un compte
          </Link>
        </p>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          Retour à l&apos;accueil
        </Link>
      </CardFooter>
    </Card>
  );
}
