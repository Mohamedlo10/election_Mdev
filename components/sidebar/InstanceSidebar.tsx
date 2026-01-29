'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderTree,
  Users,
  Vote,
  BarChart3,
  Settings,
  UserCheck,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInstance } from '@/contexts/InstanceContext';
import {
  SidebarContainer,
  SidebarHeader,
  SidebarNav,
  SidebarUserSection,
  ExitToSuperAdmin,
  MobileMenuButton,
  NavItem,
} from './SidebarBase';

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'observer', 'voter'],
  },
  {
    label: 'Categories',
    href: '/categories',
    icon: FolderTree,
    roles: ['super_admin', 'admin'],
  },
  {
    label: 'Candidats',
    href: '/candidates',
    icon: UserCheck,
    roles: ['super_admin', 'admin'],
  },
  {
    label: 'Votants',
    href: '/voters',
    icon: Users,
    roles: ['super_admin', 'admin','observer'],
  },
  {
    label: 'Observateurs',
    href: '/observers',
    icon: Eye,
    roles: ['super_admin', 'admin'],
  },
  {
    label: 'Voter',
    href: '/vote',
    icon: Vote,
    roles: ['voter'],
  },
  {
    label: 'Resultats',
    href: '/results',
    icon: BarChart3,
    roles: ['super_admin', 'admin', 'observer'],
  },
  {
    label: 'Parametres',
    href: '/settings',
    icon: Settings,
    roles: ['super_admin', 'admin'],
  },
];

interface InstanceSidebarProps {
  instanceId: string;
}

export function InstanceSidebar({ instanceId }: InstanceSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { authUser } = useAuth();
  const { currentInstance } = useInstance();
  const pathname = usePathname();

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const basePath = `/instance/${instanceId}`;
  const userRole = authUser?.role;
  const isSuperAdmin = userRole === 'super_admin';

  const instanceName = currentInstance?.name || 'Instance';
  const instanceLogo = currentInstance?.logo_url;

  return (
    <>
      <MobileMenuButton
        mobileOpen={mobileOpen}
        onToggle={() => setMobileOpen(!mobileOpen)}
      />
      <SidebarContainer
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      >
        <SidebarHeader
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={() => setCollapsed(!collapsed)}
          title={instanceName}
          homeHref={basePath}
          logoColor="bg-theme-primary"
          instanceLogo={instanceLogo}
        />

        <SidebarNav
          items={navItems}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          userRole={userRole}
          basePath={basePath}
          activeColor="bg-theme-primary-light text-theme-primary"
        />

        {isSuperAdmin && <ExitToSuperAdmin collapsed={collapsed} mobileOpen={mobileOpen} />}

        <SidebarUserSection collapsed={collapsed} mobileOpen={mobileOpen} />
      </SidebarContainer>
    </>
  );
}

export default InstanceSidebar;
