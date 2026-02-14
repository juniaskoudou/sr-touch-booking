<script setup lang="ts">
import ServiceCategory from './ServiceCategory.vue';

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

interface CategoryWithServices {
  category: Category;
  services: Service[];
}

interface Props {
  categories: CategoryWithServices[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  choose: [serviceId: number];
}>();

const handleChoose = (serviceId: number) => {
  emit('choose', serviceId);
};
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Chargement des prestations...</p>
    </div>
    
    <div v-else-if="categories.length === 0" class="text-center py-12">
      <p class="text-gray-500">Aucune prestation disponible pour le moment.</p>
    </div>
    
    <div v-else>
      <ServiceCategory
        v-for="categoryData in categories"
        :key="categoryData.category.id"
        :category="categoryData.category"
        :services="categoryData.services"
        @choose="handleChoose"
      />
    </div>
  </div>
</template>
