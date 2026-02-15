<script setup lang="ts">
import { t } from '@/lib/translations';
import { authClient } from '@/lib/auth-client';
import {
  Calendar,
  Scissors,
  LayoutDashboard,
  LogOut,
  Clock,
  ExternalLink,
} from 'lucide-vue-next';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';

const route = useRoute();
const router = useRouter();

const userEmail = ref<string | null>(null);
const loggingOut = ref(false);

const navItems = [
  { title: t.admin.dashboard, url: '/admin', icon: LayoutDashboard },
  { title: t.admin.bookings, url: '/admin/bookings', icon: Calendar },
  { title: t.admin.services, url: '/admin/services', icon: Scissors },
  { title: t.admin.hours, url: '/admin/hours', icon: Clock },
];

const isActive = (href: string) => {
  if (href === '/admin') return route.path === '/admin';
  return route.path.startsWith(href);
};

onMounted(async () => {
  try {
    const session = await $fetch('/api/auth/get-session');
    userEmail.value = session?.user?.email || null;
  } catch {
    // Middleware should have caught this
  }
});

const handleLogout = async () => {
  try {
    loggingOut.value = true;
    await authClient.signOut();
    router.push('/admin/login');
  } catch (err) {
    console.error('Error logging out:', err);
  } finally {
    loggingOut.value = false;
  }
};
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <NuxtLink to="/admin">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span class="text-xs font-bold">SR</span>
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">SR-TOUCH</span>
                <span class="truncate text-xs">Admin</span>
              </div>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navItems" :key="item.title">
              <SidebarMenuButton as-child :is-active="isActive(item.url)">
                <NuxtLink :to="item.url">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as-child>
            <NuxtLink to="/" target="_blank">
              <ExternalLink />
              <span>Voir le site</span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarSeparator />
        <SidebarMenuItem>
          <SidebarMenuButton @click="handleLogout" :disabled="loggingOut">
            <LogOut />
            <span>{{ t.admin.logout }}</span>
          </SidebarMenuButton>
          <p v-if="userEmail" class="truncate px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {{ userEmail }}
          </p>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
