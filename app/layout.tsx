import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { getInitialAuthState } from "@/lib/supabase/workspace";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MDev_Election - Système d'Élection",
  description: "Plateforme d'élection multi-instances sécurisée",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Résolution de la session côté serveur : le client démarre avec ses données,
  // sans écran de chargement ni aller-retour /api/auth/me au premier rendu.
  // Aucun appel réseau si aucun cookie de session (pages publiques).
  const { user, authUser } = await getInitialAuthState();

  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <AuthProvider initialUser={user} initialAuthUser={authUser}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
