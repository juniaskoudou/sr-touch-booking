<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { t } from '@/lib/translations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Clock, ArrowLeft } from 'lucide-vue-next';

const route = useRoute();
const token = route.query.token as string;

const loading = ref(true);
const booking = ref<any>(null);
const service = ref<any>(null);
const bookingUrl = ref('');

const fetchBooking = async () => {
  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token is required',
    });
  }

  try {
    const data = await $fetch<{ booking: any; service: any }>(`/api/bookings/${token}`);
    booking.value = data.booking;
    service.value = data.service;
    bookingUrl.value = `/booking/${token}`;
  } catch (err: any) {
    throw createError({
      statusCode: 404,
      message: 'Booking not found',
    });
  } finally {
    loading.value = false;
  }
};

const formatPrice = (priceInCents: number) => {
  const euros = priceInCents / 100;
  return euros % 1 === 0 ? euros.toFixed(0) : euros.toFixed(2);
};

const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'EEEE d MMMM yyyy', { locale: fr });
};

// PayPal link — replace with actual PayPal.me link
const PAYPAL_LINK = 'https://paypal.me/VOTRE_COMPTE/10';

onMounted(() => {
  fetchBooking();
});
</script>

<template>
  <div class="min-h-screen bg-white">
    <div class="max-w-2xl mx-auto px-4 py-6">
      <!-- Back -->
      <button
        @click="navigateTo('/')"
        class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
      >
        <ArrowLeft class="w-4 h-4" />
        {{ t.common.back }}
      </button>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <div class="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>

      <div v-else-if="booking && service">
        <!-- Status icon + message -->
        <div class="text-center mb-8">
          <template v-if="booking.status === 'pending'">
            <div class="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock class="w-7 h-7 text-amber-500" />
            </div>
            <h1 class="text-2xl font-semibold text-gray-900 mb-1">{{ t.booking.bookingPending }}</h1>
            <p class="text-sm text-gray-500 max-w-sm mx-auto">{{ t.booking.bookingPendingMessage }}</p>
          </template>
          <template v-else>
            <div class="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check class="w-7 h-7 text-emerald-500" />
            </div>
            <h1 class="text-2xl font-semibold text-gray-900 mb-1">{{ t.booking.bookingConfirmed }}</h1>
            <p class="text-sm text-gray-500">Votre réservation est confirmée par le salon.</p>
          </template>
        </div>

        <!-- Booking details -->
        <div class="p-4 rounded-xl bg-gray-50 border border-gray-100 mb-6">
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Prestation</span>
              <span class="font-medium text-gray-900">{{ service.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Date</span>
              <span class="font-medium text-gray-900 capitalize">{{ formatDate(booking.bookingDate) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Heure</span>
              <span class="font-medium text-gray-900">{{ booking.bookingTime?.substring(0, 5) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Client</span>
              <span class="font-medium text-gray-900">{{ booking.customerName }}</span>
            </div>
            <div class="border-t border-gray-200 pt-3 mt-3 flex justify-between">
              <span class="text-gray-500">Total</span>
              <span class="font-semibold text-gray-900">{{ formatPrice(service.price) }} €</span>
            </div>
          </div>
        </div>

        <!-- Acompte PayPal -->
        <div class="p-4 rounded-xl bg-amber-50 border border-amber-100 mb-6">
          <h2 class="text-sm font-semibold text-gray-900 mb-1">Acompte obligatoire : 10 €</h2>
          <p class="text-xs text-gray-500 mb-4">
            Pour valider votre réservation, veuillez régler l'acompte de 10 € via PayPal.
          </p>
          <a
            :href="PAYPAL_LINK"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center w-full gap-2 px-4 py-3 rounded-xl bg-[#0070ba] hover:bg-[#005ea6] text-white text-sm font-medium transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.418 5.137-2.248 8.108-7.556 8.108H10.87c-.524 0-.968.382-1.05.9L8.71 21.844a.641.641 0 0 0 .633.74h3.467c.458 0 .85-.334.922-.788l.038-.186.73-4.627.047-.254c.072-.454.464-.788.922-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.78-4.469z"/>
            </svg>
            Payer l'acompte via PayPal
          </a>
          <p class="text-[11px] text-gray-400 text-center mt-2">
            Vous serez redirigé vers PayPal pour effectuer le paiement
          </p>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <Button
            @click="navigateTo(bookingUrl)"
            class="w-full rounded-xl py-5 text-sm font-medium"
          >
            {{ t.booking.viewBooking }}
          </Button>
          <button
            @click="navigateTo('/')"
            class="w-full text-center text-sm text-gray-500 hover:text-gray-900 transition-colors py-2"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
