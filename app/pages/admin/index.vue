<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { t } from '@/lib/translations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, TrendingUp, Users, ArrowRight, Clock, CheckCircle, XCircle, CalendarClock } from 'lucide-vue-next';

definePageMeta({
  layout: 'admin',
});

const stats = ref({
  pendingBookings: 0,
  todayBookings: 0,
  upcomingBookings: 0,
  totalBookings: 0,
  firstUpcomingDate: null as string | null,
});

const recentBookings = ref<any[]>([]);
const loading = ref(true);

// Booking detail modal
const selectedBooking = ref<any>(null);
const showBookingDetail = ref(false);
const actionLoading = ref(false);
const actionError = ref<string | null>(null);

// Reschedule state
const showRescheduleModal = ref(false);
const rescheduleDate = ref('');
const rescheduleTime = ref('');

const fetchStats = async () => {
  try {
    const data = await $fetch('/api/admin/stats');
    stats.value = data;
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
};

const fetchRecentBookings = async () => {
  try {
    const data = await $fetch('/api/admin/bookings?limit=5');
    recentBookings.value = data;
  } catch (err) {
    console.error('Error fetching recent bookings:', err);
  } finally {
    loading.value = false;
  }
};

const onBookingClick = (booking: any) => {
  selectedBooking.value = booking;
  actionError.value = null;
  showBookingDetail.value = true;
};

const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'd MMM yyyy');
};

const formatDateLong = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'EEEE d MMMM yyyy', { locale: fr });
};

const formatPrice = (cents: number) => (cents / 100).toFixed(2);

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'confirmed':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'En attente';
    case 'confirmed': return 'Confirmée';
    case 'cancelled': return 'Annulée';
    case 'completed': return 'Terminée';
    default: return status;
  }
};

// Admin actions
const handleBookingAction = async (action: 'confirm' | 'cancel' | 'complete', bookingId: number) => {
  actionError.value = null;
  try {
    actionLoading.value = true;
    const updated = await $fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      body: { action },
    });
    selectedBooking.value = { ...selectedBooking.value, ...updated };
    await fetchRecentBookings();
    await fetchStats();
  } catch (err: any) {
    console.error(`Error ${action} booking:`, err);
    actionError.value = err.data?.message || `Erreur lors de l'action`;
  } finally {
    actionLoading.value = false;
  }
};

const openRescheduleModal = () => {
  if (!selectedBooking.value) return;
  const bDate = new Date(selectedBooking.value.bookingDate);
  rescheduleDate.value = format(bDate, 'yyyy-MM-dd');
  rescheduleTime.value = (selectedBooking.value.bookingTime || '').substring(0, 5);
  actionError.value = null;
  showRescheduleModal.value = true;
};

const handleReschedule = async () => {
  if (!selectedBooking.value || !rescheduleDate.value || !rescheduleTime.value) return;
  actionError.value = null;
  try {
    actionLoading.value = true;
    const updated = await $fetch(`/api/admin/bookings/${selectedBooking.value.id}`, {
      method: 'PATCH',
      body: {
        action: 'reschedule',
        bookingDate: rescheduleDate.value,
        bookingTime: rescheduleTime.value,
      },
    });
    selectedBooking.value = { ...selectedBooking.value, ...updated };
    showRescheduleModal.value = false;
    await fetchRecentBookings();
    await fetchStats();
  } catch (err: any) {
    console.error('Error rescheduling booking:', err);
    actionError.value = err.data?.message || 'Erreur lors du report';
  } finally {
    actionLoading.value = false;
  }
};

onMounted(() => {
  fetchStats();
  fetchRecentBookings();
});
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-foreground mb-1">{{ t.admin.dashboard }}</h1>
      <p class="text-sm text-muted-foreground">Vue d'ensemble de votre salon</p>
    </div>

    <!-- Pending Alert -->
    <div
      v-if="stats.pendingBookings > 0"
      class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
      @click="navigateTo('/admin/bookings')"
    >
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-full bg-amber-100">
          <Clock class="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <div class="text-sm font-semibold text-amber-800">
            {{ stats.pendingBookings }} réservation{{ stats.pendingBookings > 1 ? 's' : '' }} en attente
          </div>
          <div class="text-xs text-amber-600">À confirmer ou refuser</div>
        </div>
      </div>
      <ArrowRight class="h-4 w-4 text-amber-600" />
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div
        class="border border-border/50 rounded-lg p-5 hover:border-border hover:bg-accent/30 transition-all duration-200 cursor-pointer"
        @click="navigateTo('/admin/bookings')"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="p-2 rounded bg-accent/50">
            <Calendar class="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div class="text-2xl font-semibold text-foreground mb-1">{{ stats.todayBookings }}</div>
        <div class="text-xs text-muted-foreground">{{ t.admin.todayBookings }}</div>
      </div>

      <div
        class="border border-border/50 rounded-lg p-5 hover:border-border hover:bg-accent/30 transition-all duration-200 cursor-pointer"
        @click="navigateTo(stats.firstUpcomingDate ? `/admin/bookings?week=${stats.firstUpcomingDate.substring(0, 10)}` : '/admin/bookings')"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="p-2 rounded bg-accent/50">
            <TrendingUp class="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div class="text-2xl font-semibold text-foreground mb-1">{{ stats.upcomingBookings }}</div>
        <div class="text-xs text-muted-foreground">{{ t.admin.upcomingBookings }}</div>
      </div>

      <div
        class="border border-border/50 rounded-lg p-5 hover:border-border hover:bg-accent/30 transition-all duration-200 cursor-pointer"
        @click="navigateTo('/admin/bookings')"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="p-2 rounded bg-accent/50">
            <Users class="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div class="text-2xl font-semibold text-foreground mb-1">{{ stats.totalBookings }}</div>
        <div class="text-xs text-muted-foreground">Total réservations</div>
      </div>
    </div>

    <!-- Recent Bookings -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Réservations récentes</h2>
        <Button
          variant="ghost"
          size="sm"
          @click="navigateTo('/admin/bookings')"
          class="text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          Voir tout
          <ArrowRight class="h-3 w-3" />
        </Button>
      </div>

      <div class="border border-border/50 rounded-lg overflow-hidden">
        <div v-if="loading" class="p-8 text-center">
          <p class="text-sm text-muted-foreground">{{ t.common.loading }}</p>
        </div>
        <div v-else-if="recentBookings.length === 0" class="p-8 text-center">
          <p class="text-sm text-muted-foreground">Aucune réservation récente</p>
        </div>
        <div v-else>
          <div
            v-for="booking in recentBookings"
            :key="booking.id"
            class="px-4 py-3 hover:bg-accent/30 transition-colors duration-150 border-b border-border/50 last:border-0 flex items-center justify-between cursor-pointer"
            @click="onBookingClick(booking)"
          >
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm text-foreground mb-0.5">{{ booking.customerName }}</div>
              <div class="text-xs text-muted-foreground truncate">{{ booking.service?.name }}</div>
            </div>
            <div class="flex items-center gap-3 ml-4">
              <span :class="['px-2 py-0.5 text-[10px] font-medium rounded border', getStatusColor(booking.status)]">
                {{ getStatusLabel(booking.status) }}
              </span>
              <div class="text-right">
                <div class="text-xs font-medium text-foreground">{{ formatDate(booking.bookingDate) }}</div>
                <div class="text-xs text-muted-foreground">{{ booking.bookingTime?.substring(0, 5) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Booking Detail Dialog -->
    <Dialog v-model:open="showBookingDetail">
      <DialogContent class="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Détails de la réservation</DialogTitle>
          <DialogDescription>Gérer cette réservation</DialogDescription>
        </DialogHeader>
        <div v-if="selectedBooking" class="space-y-4 mt-2">
          <!-- Status banner for pending -->
          <div v-if="selectedBooking.status === 'pending'" class="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
            <Clock class="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <div class="text-sm font-medium text-amber-800">En attente de confirmation</div>
              <div class="text-xs text-amber-600">Cette réservation attend votre confirmation.</div>
            </div>
          </div>

          <div class="space-y-1.5">
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</div>
            <div class="text-sm font-medium text-foreground">{{ selectedBooking.customerName }}</div>
            <div class="text-xs text-muted-foreground">{{ selectedBooking.customerEmail }}</div>
          </div>
          <div class="h-px bg-border/50" />
          <div class="space-y-1.5">
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prestation</div>
            <div class="text-sm font-medium text-foreground">{{ selectedBooking.service?.name }}</div>
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{{ selectedBooking.service?.durationMinutes }} min</span>
              <span v-if="selectedBooking.service?.price">{{ formatPrice(selectedBooking.service.price) }} €</span>
            </div>
          </div>
          <div class="h-px bg-border/50" />
          <div class="space-y-1.5">
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date & heure</div>
            <div class="text-sm text-foreground">{{ selectedBooking.bookingDate ? formatDateLong(selectedBooking.bookingDate) : '' }}</div>
            <div class="text-sm text-foreground">{{ (selectedBooking.bookingTime || '').substring(0, 5) }}</div>
          </div>
          <div class="h-px bg-border/50" />
          <div class="space-y-1.5">
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</div>
            <span :class="['inline-flex px-2 py-0.5 text-xs font-medium rounded border', getStatusColor(selectedBooking.status)]">
              {{ getStatusLabel(selectedBooking.status) }}
            </span>
          </div>

          <!-- Error message -->
          <div v-if="actionError" class="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {{ actionError }}
          </div>

          <!-- Admin Actions -->
          <div class="h-px bg-border/50" />
          <div class="space-y-2">
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</div>

            <!-- Pending → Confirm or Cancel -->
            <div v-if="selectedBooking.status === 'pending'" class="flex gap-2">
              <Button
                @click="handleBookingAction('confirm', selectedBooking.id)"
                :disabled="actionLoading"
                class="flex-1 gap-2"
                size="sm"
              >
                <CheckCircle class="h-4 w-4" />
                {{ actionLoading ? 'Chargement...' : 'Confirmer' }}
              </Button>
              <Button
                @click="handleBookingAction('cancel', selectedBooking.id)"
                :disabled="actionLoading"
                variant="destructive"
                class="flex-1 gap-2"
                size="sm"
              >
                <XCircle class="h-4 w-4" />
                Refuser
              </Button>
            </div>

            <!-- Confirmed → Reschedule, Complete, or Cancel -->
            <div v-if="selectedBooking.status === 'confirmed'" class="flex flex-col gap-2">
              <div class="flex gap-2">
                <Button
                  @click="openRescheduleModal"
                  :disabled="actionLoading"
                  variant="outline"
                  class="flex-1 gap-2"
                  size="sm"
                >
                  <CalendarClock class="h-4 w-4" />
                  Reporter
                </Button>
                <Button
                  @click="handleBookingAction('complete', selectedBooking.id)"
                  :disabled="actionLoading"
                  variant="outline"
                  class="flex-1 gap-2"
                  size="sm"
                >
                  <CheckCircle class="h-4 w-4" />
                  Terminée
                </Button>
              </div>
              <Button
                @click="handleBookingAction('cancel', selectedBooking.id)"
                :disabled="actionLoading"
                variant="ghost"
                class="gap-2 text-destructive hover:text-destructive"
                size="sm"
              >
                <XCircle class="h-4 w-4" />
                Annuler la réservation
              </Button>
            </div>

            <!-- Cancelled or Completed: no actions -->
            <div v-if="selectedBooking.status === 'cancelled'" class="text-xs text-muted-foreground italic">
              Cette réservation a été annulée.
            </div>
            <div v-if="selectedBooking.status === 'completed'" class="text-xs text-muted-foreground italic">
              Cette réservation est terminée.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Reschedule Modal -->
    <Dialog v-model:open="showRescheduleModal">
      <DialogContent class="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Reporter la réservation</DialogTitle>
          <DialogDescription>
            Choisir une nouvelle date et heure pour {{ selectedBooking?.customerName }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="handleReschedule" class="space-y-4 mt-2">
          <div v-if="actionError" class="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {{ actionError }}
          </div>
          <div class="space-y-2">
            <Label>Nouvelle date</Label>
            <DatePicker v-model="rescheduleDate" placeholder="Choisir une date" />
          </div>
          <div class="space-y-2">
            <Label for="reschedule-time">Nouvelle heure</Label>
            <TimePicker v-model="rescheduleTime" class="w-full" />
          </div>
          <div class="flex gap-2 pt-2">
            <Button type="submit" :disabled="actionLoading || !rescheduleDate || !rescheduleTime" class="flex-1">
              {{ actionLoading ? 'Chargement...' : 'Reporter et confirmer' }}
            </Button>
            <Button type="button" variant="ghost" @click="showRescheduleModal = false">
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
