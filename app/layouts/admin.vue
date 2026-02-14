<script setup lang="ts">
import { t } from '@/lib/translations';
import { Calendar, Scissors, LayoutDashboard } from 'lucide-vue-next';

const route = useRoute();

const navItems = [
  { label: t.admin.dashboard, href: '/admin', icon: LayoutDashboard },
  { label: t.admin.bookings, href: '/admin/bookings', icon: Calendar },
  { label: t.admin.services, href: '/admin/services', icon: Scissors },
];

const isActive = (href: string) => {
  if (href === '/admin') return route.path === '/admin';
  return route.path.startsWith(href);
};
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Top Navbar -->
    <header class="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="max-w-7xl mx-auto flex h-14 items-center px-6">
        <!-- Logo -->
        <NuxtLink to="/admin" class="flex items-center gap-2 mr-8">
          <span class="text-base font-semibold text-foreground tracking-tight">SR-TOUCH</span>
          <span class="text-xs text-muted-foreground font-normal border border-border/60 rounded px-1.5 py-0.5">Admin</span>
        </NuxtLink>

        <!-- Nav Links -->
        <nav class="flex items-center gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150',
              isActive(item.href)
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            ]"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <!-- Right side -->
        <div class="ml-auto flex items-center gap-2">
          <button
            @click="navigateTo('/')"
            class="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent/50"
          >
            Voir le site
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-7xl mx-auto px-6 py-8">
      <slot />
    </main>
  </div>
</template>
