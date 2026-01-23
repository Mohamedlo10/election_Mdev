'use client';

import { useState } from 'react';
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
    roles: ['super_admin', 'admin'],
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
  const { authUser } = useAuth();
  const { currentInstance } = useInstance();

  const basePath = `/instance/${instanceId}`;
  const userRole = authUser?.role;
  const isSuperAdmin = userRole === 'super_admin';

  const instanceName = currentInstance?.name || 'Instance';
  const instanceLogo = currentInstance?.logo_url;

  return (
    <SidebarContainer collapsed={collapsed}>
      <SidebarHeader
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        title={instanceName}
        homeHref={basePath}
        logoColor="bg-theme-primary"
        instanceLogo={instanceLogo}
      />

      <SidebarNav
        items={navItems}
        collapsed={collapsed}
        userRole={userRole}
        basePath={basePath}
        activeColor="bg-theme-primary-light text-theme-primary"
      />

      {isSuperAdmin && <ExitToSuperAdmin collapsed={collapsed} />}

      <SidebarUserSection collapsed={collapsed} />
    </SidebarContainer>
  );
}

export default InstanceSidebar;
