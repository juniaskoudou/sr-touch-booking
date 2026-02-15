<script setup lang="ts">
import AppSidebar from '@/components/admin/AppSidebar.vue';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset class="min-w-0 overflow-hidden">
      <header class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          <Separator orientation="vertical" class="mr-2 !h-4" />
        </div>
      </header>
      <div class="flex-1 overflow-auto px-6 pb-8">
        <div class="mx-auto w-full max-w-5xl">
          <slot />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
