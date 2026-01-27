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
      <header className="w-full py-4 px-4 sm:px-6 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-theme-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Vote className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900">MDev_Election</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            {loading ? (
              <div className="w-20 sm:w-24 h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : authUser ? (
              <Link href="/dashboard">
                <Button size="sm" className="text-sm">
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Accès</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="sm" className="text-sm">
                  <span className="hidden sm:inline">Se connecter</span>
                  <span className="sm:hidden">Connexion</span>
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto w-full">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-theme-primary-lighter text-theme-primary px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Vote className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Plateforme d&apos;élection nouvelle génération</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              Organisez vos élections en toute{' '}
              <span className="text-theme-primary">simplicité</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed px-2">
              MDev_Election est une plateforme complète pour gérer vos élections :
              créez des catégories, ajoutez des candidats, importez vos votants
              et suivez les résultats en temps réel.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  Commencer maintenant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
              Pourquoi choisir MDev_Election ?
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
              Une solution moderne et intuitive pour tous vos besoins en matière d&apos;élections
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-5 sm:p-6 rounded-xl border border-gray-100 hover:border-theme-primary hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 bg-theme-primary-lighter rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-theme-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
                Tout ce dont vous avez besoin
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-theme-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
              <div className="aspect-video bg-gradient-theme-primary-light rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-theme-primary mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600 font-medium">Dashboard intuitif</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-theme-secondary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Prêt à organiser votre élection ?
          </h2>
          <p className="text-sm sm:text-base text-white mb-6 sm:mb-8 px-2">
            Connectez-vous et commencez à utiliser MDev_Election dès maintenant.
          </p>
          <Link href="/login" className="inline-block">
            <Button size="lg" className="bg-theme-primary hover:bg-theme-primary-dark">
              Se connecter
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-theme-primary rounded-lg flex items-center justify-center">
              <Vote className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm sm:text-base">MDev_Election</span>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm text-center sm:text-left">
            © {new Date().getFullYear()} MDev_Election - Système d&apos;Élection. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
