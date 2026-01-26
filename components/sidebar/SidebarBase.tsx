'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Vote,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
  title: string;
  homeHref: string;
  logoColor?: string;
  instanceLogo?: string | null;
  mobileOpen?: boolean;
}

export function SidebarHeader({
  collapsed,
  onToggle,
  title,
  homeHref,
  logoColor = 'bg-theme-primary',
  instanceLogo,
  mobileOpen,
}: SidebarHeaderProps) {
  const showFull = !collapsed || mobileOpen;

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100">
      <Link href={homeHref} className="flex items-center gap-2 min-w-0">
        {instanceLogo ? (
          <img
            src={instanceLogo}
            alt={title}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className={`w-10 h-10 ${logoColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Vote className="w-6 h-6 text-white" />
          </div>
        )}
        {showFull && (
          <span className="text-xl font-bold text-gray-900 truncate max-w-[160px]">
            {title}
          </span>
        )}
      </Link>
      <button
        onClick={onToggle}
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
  );
}

interface SidebarNavProps {
  items: NavItem[];
  collapsed: boolean;
  userRole?: string;
  basePath?: string;
  activeColor?: string;
  mobileOpen?: boolean;
}

export function SidebarNav({
  items,
  collapsed,
  userRole,
  basePath = '',
  activeColor = 'bg-theme-primary-lighter text-theme-primary border-l-4 border-theme-primary',
  mobileOpen,
}: SidebarNavProps) {
  const pathname = usePathname();
  const showFull = !collapsed || mobileOpen;

  const filteredItems = items.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {filteredItems.map((item) => {
        const fullHref = basePath ? `${basePath}${item.href}` : item.href;
        const isActive = pathname === fullHref ||
          (fullHref !== basePath && pathname.startsWith(fullHref));

        return (
          <Link
            key={fullHref}
            href={fullHref}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${isActive
                ? activeColor
                : 'text-gray-600 hover:bg-theme-primary-lighter hover:text-theme-primary'
              }
            `}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-theme-primary' : ''}`} />
            {showFull && <span className="font-medium">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

interface SidebarUserSectionProps {
  collapsed: boolean;
  mobileOpen?: boolean;
}

export function SidebarUserSection({ collapsed, mobileOpen }: SidebarUserSectionProps) {
  const { authUser, signOut } = useAuth();
  const showFull = !collapsed || mobileOpen;

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div className="p-3 border-t border-gray-100">
      <div className={`flex items-center gap-3 px-3 py-2 ${!showFull ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-gray-600">
            {authUser?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        {showFull && (
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
          ${!showFull ? 'justify-center' : ''}
        `}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {showFull && <span className="font-medium">Deconnexion</span>}
      </button>
    </div>
  );
}

interface ExitToSuperAdminProps {
  collapsed: boolean;
  mobileOpen?: boolean;
}

export function ExitToSuperAdmin({ collapsed, mobileOpen }: ExitToSuperAdminProps) {
  const showFull = !collapsed || mobileOpen;

  return (
    <div className="p-3">
      <Link
        href="/super-admin"
        className={`
          flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
          text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors
          border border-gray-200
          ${!showFull ? 'justify-center' : ''}
        `}
      >
        <ArrowLeft className="w-5 h-5 flex-shrink-0" />
        {showFull && <span className="font-medium">Retour Super Admin</span>}
      </Link>
    </div>
  );
}

interface SidebarContainerProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  children: React.ReactNode;
}

export function SidebarContainer({ collapsed, mobileOpen, onMobileClose, children }: SidebarContainerProps) {
  const pathname = usePathname();

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    if (onMobileClose) {
      onMobileClose();
    }
  }, [pathname]);

  return (
    <>
      {/* Bouton hamburger pour mobile */}
      <button
        onClick={onMobileClose ? () => {} : undefined}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-green-50 hover:border-green-500 text-gray-700 hover:text-green-600 transition-colors"
        aria-label="Toggle menu"
        style={{ display: 'none' }}
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay pour mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-full bg-white border-r border-gray-200
          transition-all duration-300 z-40 overflow-hidden
          ${mobileOpen ? 'w-72 max-w-[85vw]' : collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {children}
        </div>
      </aside>
    </>
  );
}

// Composant bouton hamburger exporté séparément
interface MobileMenuButtonProps {
  mobileOpen: boolean;
  onToggle: () => void;
}

export function MobileMenuButton({ mobileOpen, onToggle }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-green-50 hover:border-green-500 text-gray-700 hover:text-green-600 transition-colors"
      aria-label="Toggle menu"
    >
      {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
  );
}
