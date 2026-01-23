'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
} from 'lucide-react';
import {
  SidebarContainer,
  SidebarHeader,
  SidebarNav,
  SidebarUserSection,
  NavItem,
} from './SidebarBase';

const superAdminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/super-admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Instances',
    href: '/super-admin/instances',
    icon: Building2,
  },
  {
    label: 'Comptes',
    href: '/super-admin/accounts',
    icon: Users,
  },
];

export default function SuperAdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContainer collapsed={collapsed}>
      <SidebarHeader
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        title="MDev_Election"
        homeHref="/super-admin"
        logoColor="bg-green-500"
      />
      <SidebarNav
        items={superAdminNavItems}
        collapsed={collapsed}
        activeColor="bg-green-50 text-green-700"
      />
      <SidebarUserSection collapsed={collapsed} />
    </SidebarContainer>
  );
}
