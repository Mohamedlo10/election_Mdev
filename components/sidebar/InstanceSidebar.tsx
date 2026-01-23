'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCheck,
  Vote,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInstance } from '@/contexts/InstanceContext';
import {
  SidebarContainer,
  SidebarHeader,
  SidebarNav,
  SidebarUserSection,
  ExitToSuperAdmin,
  NavItem,
} from './SidebarBase';

const instanceNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'observer', 'voter'],
  },
  {
    label: 'Categories',
    href: '/categories',
    icon: FolderKanban,
    roles: ['super_admin', 'admin'],
  },
  {
    label: 'Candidats',
    href: '/candidates',
    icon: Users,
    roles: ['super_admin', 'admin'],
  },
  {
    label: 'Votants',
    href: '/voters',
    icon: UserCheck,
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

export default function InstanceSidebar({ instanceId }: InstanceSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { authUser } = useAuth();
  const { currentInstance, theme } = useInstance();

  const basePath = `/instance/${instanceId}`;
  const isSuperAdmin = authUser?.role === 'super_admin';

  return (
    <SidebarContainer collapsed={collapsed}>
      <SidebarHeader
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        title={currentInstance?.name || 'Instance'}
        homeHref={basePath}
        logoColor="bg-theme-primary"
        instanceLogo={currentInstance?.logo_url}
      />

      <SidebarNav
        items={instanceNavItems}
        collapsed={collapsed}
        userRole={authUser?.role}
        basePath={basePath}
        activeColor="bg-theme-primary-light text-theme-primary"
      />

      {/* Bouton retour super admin */}
      {isSuperAdmin && <ExitToSuperAdmin collapsed={collapsed} />}

      <SidebarUserSection collapsed={collapsed} />
    </SidebarContainer>
  );
}
