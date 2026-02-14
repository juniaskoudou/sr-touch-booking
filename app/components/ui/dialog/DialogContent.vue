<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import { X } from 'lucide-vue-next';

interface Props {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();

const dialogClose = inject<(() => void) | undefined>('dialogClose', undefined);

const emit = defineEmits<{
  close: [];
}>();

const handleClose = () => {
  if (dialogClose) {
    dialogClose();
  }
  emit('close');
};
</script>

<template>
  <div :class="cn('relative w-full max-w-lg bg-background rounded-lg border border-border shadow-lg p-6', props.class)">
    <button
      @click="handleClose"
      class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <X class="h-4 w-4" />
      <span class="sr-only">Close</span>
    </button>
    <slot />
  </div>
</template>
