<script setup lang="ts">
import SalonHeader from '@/components/booking/SalonHeader.vue';
import ServiceList from '@/components/booking/ServiceList.vue';
import { t } from '@/lib/translations';

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

const loading = ref(true);
const categories = ref<CategoryWithServices[]>([]);
const error = ref<string | null>(null);

const fetchServices = async () => {
  try {
    loading.value = true;
    const response = await $fetch<CategoryWithServices[]>('/api/services');
    categories.value = response;
    error.value = null;
  } catch (err: any) {
    error.value = 'Erreur lors du chargement des prestations';
    console.error('Error fetching services:', err);
  } finally {
    loading.value = false;
  }
};

const handleChoose = (serviceId: number) => {
  navigateTo(`/book/${serviceId}`);
};

const handleBook = () => {
  // Scroll to services section
  const servicesSection = document.getElementById('services');
  if (servicesSection) {
    servicesSection.scrollIntoView({ behavior: 'smooth' });
  }
};

onMounted(() => {
  fetchServices();
});
</script>

<template>
  <div class="min-h-screen bg-white">
    <SalonHeader @book="handleBook" />
    
    <main class="max-w-6xl mx-auto px-4 py-12">
      <div id="services">
        <h2 class="text-3xl font-bold mb-8 text-center text-gray-900">
          {{ t.booking.selectService }}
        </h2>
        
        <div v-if="error" class="text-center py-8">
          <p class="text-red-500">{{ error }}</p>
        </div>
        
        <ServiceList
          :categories="categories"
          :loading="loading"
          @choose="handleChoose"
        />
      </div>
    </main>
  </div>
</template>
