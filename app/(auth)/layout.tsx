import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="w-full py-3 sm:py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <a href="/" className="text-lg sm:text-xl font-bold text-gray-900 hover:text-theme-primary transition-colors">
            MDev_Election
          </a>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
      <footer className="w-full py-3 sm:py-4 px-4 sm:px-6 text-center text-xs sm:text-sm text-gray-500">
        © {new Date().getFullYear()} MDev_Election - Système d&apos;Élection
      </footer>
    </div>
  );
}
