'use client';

import Link from 'next/link';
import { Vote, Shield, Users, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { authUser, loading } = useAuth();

  const features = [
    {
      icon: Shield,
      title: 'Sécurisé',
      description: 'Authentification par code unique et votes chiffrés',
    },
    {
      icon: Users,
      title: 'Multi-instances',
      description: 'Gérez plusieurs élections simultanément',
    },
    {
      icon: BarChart3,
      title: 'Temps réel',
      description: 'Suivez les résultats en direct',
    },
  ];

  const benefits = [
    'Votes par catégories personnalisables',
    'Import des votants par fichier Excel',
    'Gestion des rôles (Admin, Observateur, Votant)',
    'Dashboard de suivi des tendances',
    'Couleurs personnalisables par instance',
    'Interface mobile-first',
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Vote className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ESEA</span>
          </div>
          <nav className="flex items-center gap-4">
            {loading ? (
              <div className="w-24 h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : authUser ? (
              <Link href="/dashboard">
                <Button>
                  Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Connexion</Button>
                </Link>
                <Link href="/register">
                  <Button>S&apos;inscrire</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center py-16 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto w-full">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Vote className="w-4 h-4" />
              Plateforme d&apos;élection nouvelle génération
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Organisez vos élections en toute{' '}
              <span className="text-green-500">simplicité</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
              ESEA est une plateforme complète pour gérer vos élections :
              créez des catégories, ajoutez des candidats, importez vos votants
              et suivez les résultats en temps réel.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg">
                  Commencer maintenant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Se connecter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir ESEA ?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Une solution moderne et intuitive pour tous vos besoins en matière d&apos;élections
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Tout ce dont vous avez besoin
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
              <div className="aspect-video bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Dashboard intuitif</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à organiser votre élection ?
          </h2>
          <p className="text-gray-400 mb-8">
            Inscrivez-vous gratuitement et commencez à utiliser ESEA dès maintenant.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-green-500 hover:bg-green-600">
              Créer mon compte
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Vote className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">ESEA</span>
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} ESEA - Système d&apos;Élection. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
