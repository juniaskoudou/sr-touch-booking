<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { t } from '@/lib/translations';

const emit = defineEmits<{
  book: [];
}>();

const handleBook = () => {
  emit('book');
};
</script>

<template>
  <div class="bg-gradient-to-r from-gray-50 to-gray-100 py-12 px-4">
    <div class="max-w-6xl mx-auto text-center">
      <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        {{ t.salon.name }}
      </h1>
      <p class="text-lg text-gray-600 mb-8">
        Réservez votre rendez-vous en ligne
      </p>
      <Button 
        @click="handleBook"
        size="lg"
        class="text-lg px-8 py-6"
      >
        {{ t.booking.bookAppointment }}
      </Button>
    </div>
  </div>
</template>
