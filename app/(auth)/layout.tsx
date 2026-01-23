import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="w-full py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <a href="/" className="text-xl font-bold text-gray-900">
            ESEA
          </a>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
      <footer className="w-full py-4 px-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} ESEA - Système d&apos;Élection
      </footer>
    </div>
  );
}
