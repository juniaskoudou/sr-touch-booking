<script setup lang="ts">
import ServiceCard from './ServiceCard.vue';

interface Category {
  id: number;
  name: string;
  displayOrder: number;
}

interface Service {
  id: number;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
}

interface Props {
  category: Category;
  services: Service[];
  initialVisible?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialVisible: 5,
});

const emit = defineEmits<{
  choose: [serviceId: number];
}>();

const expanded = ref(false);

const visibleServices = computed(() => {
  if (expanded.value || props.services.length <= props.initialVisible) {
    return props.services;
  }
  return props.services.slice(0, props.initialVisible);
});

const hiddenCount = computed(() => {
  return props.services.length - props.initialVisible;
});

const showToggle = computed(() => {
  return props.services.length > props.initialVisible;
});

const handleChoose = (serviceId: number) => {
  emit('choose', serviceId);
};
</script>

<template>
  <div class="mb-10">
    <div class="bg-white rounded-2xl border border-gray-100 px-6">
      <div class="divide-y divide-gray-100">
        <ServiceCard
          v-for="service in visibleServices"
          :key="service.id"
          :service="service"
          @choose="handleChoose"
        />
      </div>

      <div v-if="showToggle" class="py-4">
        <button
          @click="expanded = !expanded"
          class="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors"
        >
          <template v-if="!expanded">
            Voir les {{ hiddenCount }} autres prestations
          </template>
          <template v-else>
            Voir moins
          </template>
        </button>
      </div>
    </div>
  </div>
</template>
