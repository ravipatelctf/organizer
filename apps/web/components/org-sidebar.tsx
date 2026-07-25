'use client';

import { PERMS } from '@repo/permissions';
import { LayoutDashboard, ListChecks, LogOut, Settings, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { PermissionGate } from '@/components/permission-gate';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { logout } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/auth';
import type { Organization } from '@/lib/types/auth';

const NAV_ITEMS = [
  {
    href: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    gate: { anyOf: [PERMS.dashboard.view, PERMS.dashboard.viewOwn] },
  },
  {
    href: 'projects',
    label: 'Projects',
    icon: ListChecks,
    gate: { anyOf: [PERMS.project.view, PERMS.project.viewOwn] },
  },
  {
    href: 'members',
    label: 'Members',
    icon: Users,
    gate: { permission: PERMS.member.view },
  },
  {
    href: 'roles',
    label: 'Roles',
    icon: ShieldCheck,
    gate: { permission: PERMS.role.view },
  },
  {
    href: 'settings',
    label: 'Settings',
    icon: Settings,
    gate: { permission: PERMS.organization.edit },
  },
] as const;

export function OrgSidebar({ organization }: { organization: Organization }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      useAuthStore.getState().clear();
      router.replace('/login');
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex flex-col gap-0.5 px-2 py-1">
          <span className="text-sm font-semibold leading-none">{organization.name}</span>
          <span className="text-xs text-muted-foreground">/{organization.slug}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => {
            const href = `/orgs/${organization.slug}/${item.href}`;
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <PermissionGate key={item.href} {...item.gate}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                    <Link href={href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </PermissionGate>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <span className="truncate text-sm">
                {user ? `${user.firstName} ${user.lastName}` : ''}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Log out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
