'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Palette, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';

export default function AdminSetupPage() {
  const router = useRouter();
  const { authUser, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    primary_color: '#22c55e',
    secondary_color: '#1f2937',
    accent_color: '#eab308',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Rediriger dans useEffect pour eviter l'erreur React
  useEffect(() => {
    if (authLoading) return;

    // Rediriger si l'utilisateur a deja une instance
    if (authUser?.instance_id) {
      router.push(`/instance/${authUser.instance_id}`);
      return;
    }

    // Rediriger si l'utilisateur n'est pas admin
    if (authUser?.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [authUser, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Le nom de l\'instance est requis');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.instance_id) {
        // Forcer un rechargement complet pour rafraichir le contexte auth
        window.location.href = `/instance/${data.instance_id}`;
      } else {
        setError(data.error || 'Erreur lors de la creation de l\'instance');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    setLoading(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenue, {authUser?.email}</h1>
          <p className="text-gray-600 mt-2">
            Creez votre instance d&apos;election pour commencer
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nouvelle instance</CardTitle>
            <CardDescription>
              Configurez les informations de base de votre election
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="error">
                  {error}
                  <button onClick={() => setError('')} className="ml-2 underline">
                    Fermer
                  </button>
                </Alert>
              )}

              <Input
                label="Nom de l'election"
                placeholder="Ex: Election du bureau 2024"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Palette className="w-4 h-4" />
                  Personnalisation des couleurs
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Primaire</label>
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) =>
                        setFormData({ ...formData, primary_color: e.target.value })
                      }
                      className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Secondaire</label>
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) =>
                        setFormData({ ...formData, secondary_color: e.target.value })
                      }
                      className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Accent</label>
                    <input
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) =>
                        setFormData({ ...formData, accent_color: e.target.value })
                      }
                      className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: formData.primary_color + '20' }}
              >
                <p className="text-sm text-gray-600 mb-2">Apercu des couleurs</p>
                <div className="flex gap-2">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: formData.primary_color }}
                  />
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: formData.secondary_color }}
                  />
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: formData.accent_color }}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                Creer mon instance
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Vous pourrez modifier ces parametres a tout moment dans les reglages.
        </p>
      </div>
    </div>
  );
}
