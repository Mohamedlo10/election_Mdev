'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Vote,
  LayoutDashboard,
  Building2,
  Users,
  FolderKanban,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'observer', 'voter'],
  },
  {
    label: 'Instances',
    href: '/dashboard/instances',
    icon: Building2,
    roles: ['super_admin'],
  },
  {
    label: 'Catégories',
    href: '/dashboard/categories',
    icon: FolderKanban,
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Candidats',
    href: '/dashboard/candidates',
    icon: Users,
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Votants',
    href: '/dashboard/voters',
    icon: UserCheck,
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Voter',
    href: '/dashboard/vote',
    icon: Vote,
    roles: ['voter'],
  },
  {
    label: 'Résultats',
    href: '/dashboard/results',
    icon: BarChart3,
    roles: ['super_admin', 'admin', 'observer'],
  },
  {
    label: 'Paramètres',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['super_admin', 'admin'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { authUser, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNavItems = navItems.filter(
    (item) => authUser && item.roles.includes(authUser.role)
  );

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Bouton hamburger pour mobile */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-theme-primary-lighter hover:border-theme-primary text-gray-700 hover:text-theme-primary transition-colors"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay pour mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-full bg-white border-r border-gray-200
          transition-all duration-300 z-40
          ${collapsed && !mobileOpen ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-theme-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Vote className="w-6 h-6 text-white" />
              </div>
              {(!collapsed || mobileOpen) && (
                <span className="text-xl font-bold text-gray-900">MDev_Election</span>
              )}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Toggle sidebar"
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-theme-primary-lighter text-theme-primary border-l-4 border-theme-primary'
                      : 'text-gray-600 hover:bg-theme-primary-lighter hover:text-theme-primary'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-theme-primary' : ''}`} />
                  {(!collapsed || mobileOpen) && <span className="font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-gray-100">
            <div className={`flex items-center gap-3 px-3 py-2 ${(collapsed && !mobileOpen) ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">
                  {authUser?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {authUser?.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {authUser?.role?.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className={`
                flex items-center gap-3 w-full px-3 py-2.5 mt-2 rounded-lg
                text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors
                ${(collapsed && !mobileOpen) ? 'justify-center' : ''}
              `}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {(!collapsed || mobileOpen) && <span className="font-medium">Déconnexion</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
