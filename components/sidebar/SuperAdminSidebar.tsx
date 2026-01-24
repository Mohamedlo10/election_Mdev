'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  MobileMenuButton,
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
          title="MDev_Election"
          homeHref="/super-admin"
          logoColor="bg-green-500"
        />
        <SidebarNav
          items={superAdminNavItems}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          activeColor="bg-green-50 text-green-700"
        />
        <SidebarUserSection collapsed={collapsed} mobileOpen={mobileOpen} />
      </SidebarContainer>
    </>
  );
}
