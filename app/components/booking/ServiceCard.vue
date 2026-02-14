<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { t } from '@/lib/translations';

interface Service {
  id: number;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
}

interface Props {
  service: Service;
}

const props = defineProps<Props>();

const formatPrice = (priceInCents: number) => {
  const euros = priceInCents / 100;
  return euros % 1 === 0 ? euros.toFixed(0) : euros.toFixed(2);
};

const emit = defineEmits<{
  choose: [serviceId: number];
}>();

const handleChoose = () => {
  emit('choose', props.service.id);
};
</script>

<template>
  <!-- Desktop: single row -->
  <div class="hidden sm:flex items-center justify-between py-6">
    <div class="min-w-0 mr-6">
      <span class="text-base text-gray-900">{{ service.name }}</span>
      <p v-if="service.description" class="text-sm text-gray-400 mt-0.5 line-clamp-1">{{ service.description }}</p>
    </div>

    <div class="flex items-center gap-4 shrink-0">
      <span class="text-sm text-gray-400">{{ service.durationMinutes }}min</span>
      <span class="text-gray-300">·</span>
      <span class="text-base font-semibold text-gray-900">{{ formatPrice(service.price) }} €</span>

      <Button
        @click="handleChoose"
        class="rounded-full px-5 py-2 text-sm"
        variant="default"
      >
        {{ t.common.choose }}
      </Button>
    </div>
  </div>

  <!-- Mobile: stacked layout -->
  <div class="sm:hidden py-5">
    <p class="text-base font-medium text-gray-900">{{ service.name }}</p>
    <p v-if="service.description" class="text-sm text-gray-400 mt-0.5 mb-2 line-clamp-2">{{ service.description }}</p>
    <div class="flex items-center justify-between" :class="{ 'mt-2': !service.description }">
      <div class="flex items-center gap-2">
        <span class="text-base font-semibold text-gray-900">{{ formatPrice(service.price) }} €</span>
        <span class="text-gray-300">·</span>
        <span class="text-sm text-gray-400">{{ service.durationMinutes }}min</span>
      </div>

      <Button
        @click="handleChoose"
        class="rounded-full px-5 py-2 text-sm"
        variant="default"
      >
        {{ t.common.choose }}
      </Button>
    </div>
  </div>
</template>
