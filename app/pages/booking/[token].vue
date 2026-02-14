<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { t } from '@/lib/translations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Clock, Check, XCircle, CheckCircle2 } from 'lucide-vue-next';

const route = useRoute();
const token = route.params.token as string;

const loading = ref(true);
const booking = ref<any>(null);
const service = ref<any>(null);
const addons = ref<any[]>([]);
const cancelling = ref(false);
const showCancelConfirm = ref(false);

const fetchBooking = async () => {
  try {
    const data = await $fetch<{ booking: any; service: any; addons: any[] }>(`/api/bookings/${token}`);
    booking.value = data.booking;
    service.value = data.service;
    addons.value = data.addons || [];
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

const totalPrice = computed(() => {
  if (!service.value) return 0;
  return service.value.price + addons.value.reduce((sum: number, a: any) => sum + a.price, 0);
});

const handleCancel = async () => {
  try {
    cancelling.value = true;
    await $fetch(`/api/bookings/${token}`, {
      method: 'PATCH',
      body: { action: 'cancel' },
    });
    showCancelConfirm.value = false;
    await fetchBooking();
  } catch (err: any) {
    console.error('Error cancelling booking:', err);
  } finally {
    cancelling.value = false;
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: t.status.pending, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: Clock };
    case 'confirmed':
      return { label: t.status.confirmed, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: Check };
    case 'cancelled':
      return { label: t.status.cancelled, bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-100', icon: XCircle };
    case 'completed':
      return { label: t.status.completed, bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-100', icon: CheckCircle2 };
    default:
      return { label: status, bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-100', icon: Clock };
  }
};

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
        <!-- Header with status -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-semibold text-gray-900">Ma réservation</h1>
            <span
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
                getStatusConfig(booking.status).bg,
                getStatusConfig(booking.status).text,
                'border',
                getStatusConfig(booking.status).border
              ]"
            >
              <component :is="getStatusConfig(booking.status).icon" class="w-3.5 h-3.5" />
              {{ getStatusConfig(booking.status).label }}
            </span>
          </div>
        </div>

        <!-- Status message -->
        <div
          v-if="booking.status === 'pending'"
          class="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-100"
        >
          <p class="text-sm text-amber-700">
            {{ t.booking.bookingPendingMessage }}
          </p>
        </div>

        <div
          v-if="booking.status === 'cancelled'"
          class="mb-6 p-4 rounded-xl bg-red-50 border border-red-100"
        >
          <p class="text-sm text-red-600">
            Cette réservation a été annulée.
          </p>
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
              <div class="text-right">
                <span class="font-medium text-gray-900">{{ booking.customerName }}</span>
                <p class="text-xs text-gray-400">{{ booking.customerEmail }}</p>
              </div>
            </div>

            <!-- Add-ons -->
            <template v-if="addons.length > 0">
              <div class="border-t border-gray-200 pt-3 mt-3 space-y-2">
                <div class="flex justify-between text-gray-600">
                  <span>{{ service.name }}</span>
                  <span>{{ formatPrice(service.price) }} €</span>
                </div>
                <div v-for="addon in addons" :key="addon.id" class="flex justify-between text-gray-400">
                  <span>+ {{ addon.name }}</span>
                  <span>+{{ formatPrice(addon.price) }} €</span>
                </div>
              </div>
            </template>

            <div class="border-t border-gray-200 pt-3 mt-3 flex justify-between">
              <span class="text-gray-500">Total</span>
              <span class="font-semibold text-gray-900">{{ formatPrice(totalPrice) }} €</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="booking.status === 'pending' || booking.status === 'confirmed'" class="space-y-3">
          <Button
            v-if="booking.status === 'confirmed'"
            @click="navigateTo(`/book/${service.id}`)"
            variant="outline"
            class="w-full rounded-xl py-5 text-sm font-medium"
          >
            {{ t.booking.rescheduleBooking }}
          </Button>

          <!-- Cancel flow -->
          <template v-if="!showCancelConfirm">
            <button
              @click="showCancelConfirm = true"
              class="w-full text-center text-sm text-red-500 hover:text-red-700 transition-colors py-2"
            >
              {{ t.booking.cancelBooking }}
            </button>
          </template>

          <div v-else class="p-4 rounded-xl border border-red-100 bg-red-50">
            <p class="text-sm text-red-700 mb-3">Êtes-vous sûr de vouloir annuler cette réservation ?</p>
            <div class="flex gap-3">
              <Button
                @click="handleCancel"
                :disabled="cancelling"
                variant="destructive"
                class="flex-1 rounded-xl text-sm"
              >
                {{ cancelling ? t.common.loading : 'Oui, annuler' }}
              </Button>
              <Button
                @click="showCancelConfirm = false"
                variant="outline"
                class="flex-1 rounded-xl text-sm"
              >
                Non, garder
              </Button>
            </div>
          </div>
        </div>

        <!-- Back to home for cancelled/completed -->
        <button
          v-if="booking.status === 'cancelled' || booking.status === 'completed'"
          @click="navigateTo('/')"
          class="w-full text-center text-sm text-gray-500 hover:text-gray-900 transition-colors py-2"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  </div>
</template>
