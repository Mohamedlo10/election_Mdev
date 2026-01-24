'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Vote,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
}

export function SidebarHeader({
  collapsed,
  onToggle,
  title,
  homeHref,
  logoColor = 'bg-theme-primary',
  instanceLogo,
}: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100">
      <Link href={homeHref} className="flex items-center gap-2">
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
        {!collapsed && (
          <span className="text-xl font-bold text-gray-900 truncate max-w-[140px]">
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
}

export function SidebarNav({
  items,
  collapsed,
  userRole,
  basePath = '',
  activeColor = 'bg-theme-primary-lighter text-theme-primary border-l-4 border-theme-primary',
}: SidebarNavProps) {
  const pathname = usePathname();

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
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

interface SidebarUserSectionProps {
  collapsed: boolean;
}

export function SidebarUserSection({ collapsed }: SidebarUserSectionProps) {
  const { authUser, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="p-3 border-t border-gray-100">
      <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-gray-600">
            {authUser?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        {!collapsed && (
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
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="font-medium">Deconnexion</span>}
      </button>
    </div>
  );
}

interface ExitToSuperAdminProps {
  collapsed: boolean;
}

export function ExitToSuperAdmin({ collapsed }: ExitToSuperAdminProps) {
  return (
    <div className="p-3">
      <Link
        href="/super-admin"
        className={`
          flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
          text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors
          border border-gray-200
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <ArrowLeft className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="font-medium">Retour Super Admin</span>}
      </Link>
    </div>
  );
}

interface SidebarContainerProps {
  collapsed: boolean;
  children: React.ReactNode;
}

export function SidebarContainer({ collapsed, children }: SidebarContainerProps) {
  return (
    <aside
      className={`
        fixed left-0 top-0 h-full bg-white border-r border-gray-200
        transition-all duration-300 z-40
        ${collapsed ? 'w-16' : 'w-64'}
        lg:translate-x-0
      `}
    >
      <div className="flex flex-col h-full">
        {children}
      </div>
    </aside>
  );
}
