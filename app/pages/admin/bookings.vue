<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import WeekCalendar from '@/components/admin/WeekCalendar.vue';
import { t } from '@/lib/translations';
import { format, addDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, List, Settings, Plus, Trash2, Save, Check, CheckCircle, XCircle, Clock, CalendarClock } from 'lucide-vue-next';

definePageMeta({
  layout: 'admin',
});

// ──────────────────────────────────────
// Bookings (for list view)
// ──────────────────────────────────────

const bookings = ref<any[]>([]);
const loadingBookings = ref(true);
const viewMode = ref<'calendar' | 'list'>('calendar');
const statusFilter = ref<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
const selectedBooking = ref<any>(null);
const showBookingDetail = ref(false);
const actionLoading = ref(false);
const actionError = ref<string | null>(null);

const filteredBookings = computed(() => {
  if (statusFilter.value === 'all') return bookings.value;
  return bookings.value.filter((b: any) => b.status === statusFilter.value);
});

// Reschedule state
const showRescheduleModal = ref(false);
const rescheduleDate = ref('');
const rescheduleTime = ref('');

const fetchBookings = async () => {
  try {
    loadingBookings.value = true;
    const data = await $fetch('/api/admin/bookings');
    bookings.value = data;
  } catch (err) {
    console.error('Error fetching bookings:', err);
  } finally {
    loadingBookings.value = false;
  }
};

const onBookingClick = (booking: any) => {
  selectedBooking.value = booking;
  actionError.value = null;
  showBookingDetail.value = true;
};

const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'EEEE d MMMM yyyy', { locale: fr });
};

const formatDateShort = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'd MMM yyyy', { locale: fr });
};

const formatPrice = (cents: number) => (cents / 100).toFixed(2);

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return t.status.pending;
    case 'confirmed': return t.status.confirmed;
    case 'cancelled': return t.status.cancelled;
    case 'completed': return t.status.completed;
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'confirmed': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    case 'completed': return 'bg-green-50 text-green-700 border-green-200';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

// ──────────────────────────────────────
// Admin booking actions
// ──────────────────────────────────────

const handleBookingAction = async (action: 'confirm' | 'cancel' | 'complete', bookingId: number) => {
  actionError.value = null;
  try {
    actionLoading.value = true;
    const updated = await $fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      body: { action },
    });
    selectedBooking.value = { ...selectedBooking.value, ...updated };
    // Refresh lists
    await fetchBookings();
    calendarRef.value?.fetchWeek?.();
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
    await fetchBookings();
    calendarRef.value?.fetchWeek?.();
  } catch (err: any) {
    console.error('Error rescheduling booking:', err);
    actionError.value = err.data?.message || 'Erreur lors du report';
  } finally {
    actionLoading.value = false;
  }
};

// ──────────────────────────────────────
// Default schedule modal
// ──────────────────────────────────────

const showDefaultsModal = ref(false);
const savingDefaults = ref(false);
const defaultsSaved = ref(false);

const DAYS_CONFIG = [
  { key: 1, label: 'Lundi' },
  { key: 2, label: 'Mardi' },
  { key: 3, label: 'Mercredi' },
  { key: 4, label: 'Jeudi' },
  { key: 5, label: 'Vendredi' },
  { key: 6, label: 'Samedi' },
  { key: 0, label: 'Dimanche' },
];

interface AvailSlot { startTime: string; endTime: string; }
interface DaySchedule { enabled: boolean; slots: AvailSlot[]; }
type DefaultSchedule = Record<number, DaySchedule>;

const defaultSchedule = ref<DefaultSchedule>({});
const calendarRef = ref<InstanceType<typeof WeekCalendar> | null>(null);

const fetchDefaults = async () => {
  try {
    const data = await $fetch<any[]>('/api/admin/availability');
    const s: DefaultSchedule = {};
    for (const d of DAYS_CONFIG) s[d.key] = { enabled: false, slots: [] };
    for (const record of data) {
      if (s[record.dayOfWeek]) {
        s[record.dayOfWeek].enabled = record.isAvailable;
        s[record.dayOfWeek].slots.push({
          startTime: record.startTime.substring(0, 5),
          endTime: record.endTime.substring(0, 5),
        });
      }
    }
    for (const d of DAYS_CONFIG) {
      if (s[d.key].slots.length === 0) s[d.key].enabled = false;
    }
    defaultSchedule.value = s;
  } catch (err) {
    console.error('Error fetching defaults:', err);
  }
};

const openDefaultsModal = () => {
  fetchDefaults();
  showDefaultsModal.value = true;
};

const toggleDefault = (dayKey: number) => {
  const day = defaultSchedule.value[dayKey];
  day.enabled = !day.enabled;
  if (day.enabled && day.slots.length === 0) {
    day.slots.push({ startTime: '09:00', endTime: '18:00' });
  }
};

const addDefaultSlot = (dayKey: number) => {
  const day = defaultSchedule.value[dayKey];
  const last = day.slots[day.slots.length - 1];
  let start = '14:00';
  let end = '18:00';
  if (last) {
    const [h] = last.endTime.split(':').map(Number);
    start = `${Math.min(h + 1, 22).toString().padStart(2, '0')}:00`;
    end = `${Math.min(h + 5, 23).toString().padStart(2, '0')}:00`;
  }
  day.slots.push({ startTime: start, endTime: end });
};

const removeDefaultSlot = (dayKey: number, idx: number) => {
  const day = defaultSchedule.value[dayKey];
  day.slots.splice(idx, 1);
  if (day.slots.length === 0) day.enabled = false;
};

const applyTemplate = (name: string) => {
  const s: DefaultSchedule = {};
  for (const d of DAYS_CONFIG) s[d.key] = { enabled: false, slots: [] };
  if (name === 'classic') {
    for (const k of [1, 2, 3, 4, 5]) {
      s[k] = { enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '14:00', endTime: '19:00' }] };
    }
    s[6] = { enabled: true, slots: [{ startTime: '09:00', endTime: '17:00' }] };
  } else if (name === 'full') {
    for (const k of [1, 2, 3, 4, 5, 6]) {
      s[k] = { enabled: true, slots: [{ startTime: '09:00', endTime: '19:00' }] };
    }
  } else if (name === 'light') {
    for (const k of [1, 2, 3, 4, 5]) {
      s[k] = { enabled: true, slots: [{ startTime: '10:00', endTime: '18:00' }] };
    }
  }
  defaultSchedule.value = s;
};

const saveDefaults = async () => {
  const slots: Array<{ dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }> = [];
  for (const d of DAYS_CONFIG) {
    const ds = defaultSchedule.value[d.key];
    if (!ds?.enabled) continue;
    for (const slot of ds.slots) {
      slots.push({ dayOfWeek: d.key, startTime: slot.startTime, endTime: slot.endTime, isAvailable: true });
    }
  }
  try {
    savingDefaults.value = true;
    await $fetch('/api/admin/availability', { method: 'PUT', body: { slots } });
    defaultsSaved.value = true;
    setTimeout(() => {
      defaultsSaved.value = false;
      showDefaultsModal.value = false;
    }, 1200);
    // Refresh calendar
    calendarRef.value?.fetchWeek?.();
  } catch (err) {
    console.error('Error saving defaults:', err);
  } finally {
    savingDefaults.value = false;
  }
};

// ──────────────────────────────────────
// Init
// ──────────────────────────────────────

const route = useRoute();
const initialWeek = computed(() => {
  const w = route.query.week as string | undefined;
  return w || undefined;
});

onMounted(() => {
  fetchBookings();
});
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-foreground mb-1">{{ t.admin.bookings }}</h1>
        <p class="text-sm text-muted-foreground">Réservations et disponibilités</p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Default schedule button -->
        <Button variant="outline" size="sm" @click="openDefaultsModal" class="gap-1.5 text-xs text-muted-foreground">
          <Settings class="h-3.5 w-3.5" />
          Horaires par défaut
        </Button>

        <!-- View Toggle -->
        <div class="flex items-center gap-1 border border-border/50 rounded-lg p-0.5">
          <button
            @click="viewMode = 'calendar'"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === 'calendar' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            <CalendarDays class="h-3.5 w-3.5" />
            Calendrier
          </button>
          <button
            @click="viewMode = 'list'"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            <List class="h-3.5 w-3.5" />
            Liste
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar View -->
    <WeekCalendar
      v-if="viewMode === 'calendar'"
      ref="calendarRef"
      :initial-date="initialWeek"
      @booking-click="onBookingClick"
    />

    <!-- List View -->
    <div v-else>
      <div class="mb-4 flex gap-2 flex-wrap">
        <Button
          :variant="statusFilter === 'all' ? 'default' : 'ghost'"
          size="sm" class="text-xs"
          @click="statusFilter = 'all'"
        >Toutes</Button>
        <Button
          :variant="statusFilter === 'pending' ? 'default' : 'ghost'"
          size="sm" class="text-xs"
          @click="statusFilter = 'pending'"
        >En attente</Button>
        <Button
          :variant="statusFilter === 'confirmed' ? 'default' : 'ghost'"
          size="sm" class="text-xs"
          @click="statusFilter = 'confirmed'"
        >Confirmées</Button>
        <Button
          :variant="statusFilter === 'completed' ? 'default' : 'ghost'"
          size="sm" class="text-xs"
          @click="statusFilter = 'completed'"
        >Terminées</Button>
        <Button
          :variant="statusFilter === 'cancelled' ? 'default' : 'ghost'"
          size="sm" class="text-xs"
          @click="statusFilter = 'cancelled'"
        >Annulées</Button>
      </div>

      <div class="border border-border/50 rounded-lg overflow-hidden">
        <div v-if="loadingBookings" class="p-12 text-center">
          <p class="text-sm text-muted-foreground">{{ t.common.loading }}</p>
        </div>
        <div v-else-if="filteredBookings.length === 0" class="p-12 text-center">
          <p class="text-sm text-muted-foreground">Aucune réservation</p>
        </div>
        <table v-else class="w-full">
          <thead>
            <tr class="border-b border-border/50 bg-accent/20">
              <th class="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Prestation</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Heure</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="booking in filteredBookings"
              :key="booking.id"
              class="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
              @click="onBookingClick(booking)"
            >
              <td class="py-3.5 px-4">
                <div class="text-sm font-medium text-foreground">{{ booking.customerName }}</div>
                <div class="text-xs text-muted-foreground mt-0.5">{{ booking.customerEmail }}</div>
              </td>
              <td class="py-3.5 px-4 text-sm text-foreground">{{ booking.service?.name }}</td>
              <td class="py-3.5 px-4 text-sm text-foreground">{{ formatDate(booking.bookingDate) }}</td>
              <td class="py-3.5 px-4 text-sm text-foreground">{{ booking.bookingTime?.substring(0, 5) }}</td>
              <td class="py-3.5 px-4">
                <span :class="['px-2 py-0.5 text-xs font-medium rounded border', getStatusColor(booking.status)]">
                  {{ getStatusLabel(booking.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
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
            <div class="text-sm font-medium text-foreground">{{ selectedBooking.serviceName || selectedBooking.service?.name }}</div>
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{{ selectedBooking.serviceDuration || selectedBooking.service?.durationMinutes }} min</span>
              <span v-if="selectedBooking.service?.price">{{ formatPrice(selectedBooking.service.price) }} €</span>
            </div>
          </div>
          <div class="h-px bg-border/50" />
          <div class="space-y-1.5">
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date & heure</div>
            <div class="text-sm text-foreground">{{ selectedBooking.bookingDate ? formatDate(selectedBooking.bookingDate) : '' }}</div>
            <div class="text-sm text-foreground">{{ (selectedBooking.bookingTime || '')?.substring(0, 5) }}</div>
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

    <!-- ===== DEFAULT SCHEDULE MODAL ===== -->
    <Dialog v-model:open="showDefaultsModal">
      <DialogContent class="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horaires par défaut</DialogTitle>
          <DialogDescription>
            Ces horaires s'appliquent automatiquement chaque semaine. Cliquez sur un jour dans le calendrier pour modifier ponctuellement.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 mt-2">
          <!-- Quick templates -->
          <div>
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Modèles</div>
            <div class="flex gap-2 flex-wrap">
              <button
                @click="applyTemplate('classic')"
                class="px-2.5 py-1 text-xs rounded-md border border-border/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Classique
              </button>
              <button
                @click="applyTemplate('full')"
                class="px-2.5 py-1 text-xs rounded-md border border-border/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Journée continue
              </button>
              <button
                @click="applyTemplate('light')"
                class="px-2.5 py-1 text-xs rounded-md border border-border/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Semaine légère
              </button>
            </div>
          </div>

          <!-- Day rows -->
          <div class="space-y-1.5">
            <div
              v-for="day in DAYS_CONFIG"
              :key="day.key"
              :class="[
                'rounded-lg border p-3 transition-all',
                defaultSchedule[day.key]?.enabled ? 'border-border bg-background' : 'border-border/30 bg-accent/10',
              ]"
            >
              <div class="flex items-start gap-3">
                <button @click="toggleDefault(day.key)" class="flex items-center gap-2 min-w-[110px] pt-0.5">
                  <div
                    :class="[
                      'relative w-8 h-[18px] rounded-full transition-colors shrink-0',
                      defaultSchedule[day.key]?.enabled ? 'bg-primary' : 'bg-muted-foreground/20',
                    ]"
                  >
                    <div
                      :class="[
                        'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform',
                        defaultSchedule[day.key]?.enabled ? 'translate-x-[16px]' : 'translate-x-[2px]',
                      ]"
                    />
                  </div>
                  <span :class="['text-xs font-medium', defaultSchedule[day.key]?.enabled ? 'text-foreground' : 'text-muted-foreground']">
                    {{ day.label }}
                  </span>
                </button>

                <div v-if="defaultSchedule[day.key]?.enabled" class="flex-1 space-y-1.5">
                  <div
                    v-for="(slot, idx) in defaultSchedule[day.key].slots"
                    :key="idx"
                    class="flex items-center gap-1.5"
                  >
                    <TimePicker v-model="slot.startTime" />
                    <span class="text-[10px] text-muted-foreground">à</span>
                    <TimePicker v-model="slot.endTime" />
                    <button
                      v-if="defaultSchedule[day.key].slots.length > 1"
                      @click="removeDefaultSlot(day.key, idx)"
                      class="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 class="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    @click="addDefaultSlot(day.key)"
                    class="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus class="h-2.5 w-2.5" />
                    Créneau
                  </button>
                </div>
                <div v-else class="text-xs text-muted-foreground italic pt-0.5">Fermé</div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <Button @click="saveDefaults" :disabled="savingDefaults" class="flex-1 gap-2">
              <Check v-if="defaultsSaved" class="h-4 w-4" />
              <Save v-else class="h-4 w-4" />
              {{ savingDefaults ? 'Enregistrement...' : defaultsSaved ? 'Enregistré !' : 'Enregistrer' }}
            </Button>
            <Button variant="ghost" @click="showDefaultsModal = false">Fermer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
