<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TimePicker } from '@/components/ui/time-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-vue-next';
import {
  startOfWeek,
  addDays,
  format,
  isToday as checkIsToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

interface DayBooking {
  id: number;
  customerName: string;
  customerEmail: string;
  bookingTime: string;
  status: string;
  serviceName: string;
  serviceDuration: number;
}

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  availability: {
    isOpen: boolean;
    slots: AvailabilitySlot[];
    source: 'default' | 'override';
    reason?: string | null;
  };
  bookings: DayBooking[];
}

// ──────────────────────────────────────
// Props & Emits
// ──────────────────────────────────────

const props = defineProps<{
  initialDate?: string; // yyyy-MM-dd to jump to a specific week
}>();

const emit = defineEmits<{
  (e: 'booking-click', booking: DayBooking): void;
}>();

// ──────────────────────────────────────
// State
// ──────────────────────────────────────

const currentDate = ref(props.initialDate ? new Date(props.initialDate + 'T12:00:00') : new Date());
const weekStart = computed(() => startOfWeek(currentDate.value, { weekStartsOn: 1 }));
const weekStartStr = computed(() => format(weekStart.value, 'yyyy-MM-dd'));
const weekDays = computed(() => {
  const days = [];
  for (let i = 0; i < 7; i++) days.push(addDays(weekStart.value, i));
  return days;
});

const calendarDays = ref<CalendarDay[]>([]);
const loading = ref(true);

// Time slots 8:00–20:00
const timeSlots = computed(() => {
  const slots = [];
  for (let h = 8; h <= 20; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
});

// Day editor modal
const showDayEditor = ref(false);
const editingDay = ref<CalendarDay | null>(null);
const editForm = ref({
  isOpen: true,
  slots: [{ startTime: '09:00', endTime: '18:00' }] as AvailabilitySlot[],
});
const savingDay = ref(false);
const dayError = ref<string | null>(null);

// ──────────────────────────────────────
// Fetching
// ──────────────────────────────────────

const fetchWeek = async () => {
  try {
    loading.value = true;
    const data = await $fetch<CalendarDay[]>(`/api/admin/calendar-week?start=${weekStartStr.value}`);
    calendarDays.value = data;
  } catch (err) {
    console.error('Error fetching calendar week:', err);
  } finally {
    loading.value = false;
  }
};

// ──────────────────────────────────────
// Navigation
// ──────────────────────────────────────

const goToPrevWeek = () => { currentDate.value = addDays(currentDate.value, -7); };
const goToNextWeek = () => { currentDate.value = addDays(currentDate.value, 7); };
const goToToday = () => { currentDate.value = new Date(); };

const weekRangeLabel = computed(() => {
  return `${format(weekStart.value, 'd', { locale: fr })} – ${format(addDays(weekStart.value, 6), 'd MMMM yyyy', { locale: fr })}`;
});

watch(weekStartStr, () => fetchWeek());

// ──────────────────────────────────────
// Availability helpers
// ──────────────────────────────────────

const getCalendarDay = (date: Date): CalendarDay | undefined => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return calendarDays.value.find((d) => d.date === dateStr);
};

const isDayOpen = (date: Date) => {
  const day = getCalendarDay(date);
  return day?.availability.isOpen ?? false;
};

const isOverridden = (date: Date) => {
  const day = getCalendarDay(date);
  return day?.availability.source === 'override';
};

const getDaySlots = (date: Date) => {
  const day = getCalendarDay(date);
  return day?.availability.slots ?? [];
};

// Check if a time slot falls within the availability window
const isTimeInAvailability = (date: Date, time: string) => {
  const slots = getDaySlots(date);
  if (slots.length === 0) return false;
  return slots.some((s) => time >= s.startTime && time < s.endTime);
};

// ──────────────────────────────────────
// Bookings helpers
// ──────────────────────────────────────

const getBookingsForSlot = (date: Date, time: string) => {
  const day = getCalendarDay(date);
  if (!day) return [];
  return day.bookings.filter((b) => b.bookingTime === time);
};

const isBookingStart = (booking: DayBooking, time: string) => {
  return booking.bookingTime === time;
};

const getBookingSlotSpan = (booking: DayBooking) => {
  return Math.ceil((booking.serviceDuration || 30) / 30);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100';
    case 'confirmed':
      return 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100';
    case 'cancelled':
      return 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-200';
    case 'completed':
      return 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-200';
    default:
      return 'bg-accent border-border text-foreground';
  }
};

// ──────────────────────────────────────
// Day editor
// ──────────────────────────────────────

const openDayEditor = (date: Date) => {
  const day = getCalendarDay(date);
  if (!day) return;
  editingDay.value = day;
  editForm.value = {
    isOpen: day.availability.isOpen,
    slots: day.availability.isOpen && day.availability.slots.length > 0
      ? JSON.parse(JSON.stringify(day.availability.slots))
      : [{ startTime: '09:00', endTime: '18:00' }],
  };
  dayError.value = null;
  showDayEditor.value = true;
};

const addEditSlot = () => {
  const last = editForm.value.slots[editForm.value.slots.length - 1];
  let start = '14:00';
  let end = '18:00';
  if (last) {
    const [h] = last.endTime.split(':').map(Number);
    start = `${Math.min(h + 1, 22).toString().padStart(2, '0')}:00`;
    end = `${Math.min(h + 5, 23).toString().padStart(2, '0')}:00`;
  }
  editForm.value.slots.push({ startTime: start, endTime: end });
};

const removeEditSlot = (index: number) => {
  editForm.value.slots.splice(index, 1);
};

const saveDayAvailability = async () => {
  if (!editingDay.value) return;
  dayError.value = null;

  if (editForm.value.isOpen) {
    for (const slot of editForm.value.slots) {
      if (slot.startTime >= slot.endTime) {
        dayError.value = `L'heure de fin doit être après l'heure de début (${slot.startTime} → ${slot.endTime})`;
        return;
      }
    }
    const sorted = [...editForm.value.slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endTime > sorted[i + 1].startTime) {
        dayError.value = 'Les créneaux se chevauchent';
        return;
      }
    }
  }

  try {
    savingDay.value = true;
    await $fetch('/api/admin/availability-overrides', {
      method: 'POST',
      body: {
        date: editingDay.value.date,
        isClosed: !editForm.value.isOpen,
        slots: editForm.value.isOpen ? editForm.value.slots : [],
        reason: null,
      },
    });
    showDayEditor.value = false;
    await fetchWeek();
  } catch (err: any) {
    dayError.value = err.data?.message || 'Erreur lors de la sauvegarde';
  } finally {
    savingDay.value = false;
  }
};

const resetDayToDefault = async () => {
  if (!editingDay.value) return;
  try {
    savingDay.value = true;
    await $fetch('/api/admin/availability-overrides/reset-day', {
      method: 'POST',
      body: { date: editingDay.value.date },
    });
    showDayEditor.value = false;
    await fetchWeek();
  } catch {
    dayError.value = 'Erreur lors de la réinitialisation';
  } finally {
    savingDay.value = false;
  }
};

const quickToggleDay = async (date: Date) => {
  const day = getCalendarDay(date);
  if (!day) return;

  if (day.availability.isOpen) {
    await $fetch('/api/admin/availability-overrides', {
      method: 'POST',
      body: { date: day.date, isClosed: true, slots: [], reason: null },
    });
  } else {
    const slots = day.availability.slots.length > 0
      ? day.availability.slots
      : [{ startTime: '09:00', endTime: '18:00' }];
    await $fetch('/api/admin/availability-overrides', {
      method: 'POST',
      body: { date: day.date, isClosed: false, slots, reason: null },
    });
  }
  await fetchWeek();
};

// ──────────────────────────────────────
// Expose for parent
// ──────────────────────────────────────

defineExpose({ fetchWeek });

// ──────────────────────────────────────
// Init
// ──────────────────────────────────────

onMounted(() => {
  fetchWeek();
});
</script>

<template>
  <div class="w-full">
    <!-- Calendar Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-foreground">{{ weekRangeLabel }}</h2>
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="sm" @click="goToToday" class="text-xs mr-1">
          Aujourd'hui
        </Button>
        <Button variant="ghost" size="icon" class="h-8 w-8" @click="goToPrevWeek">
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" class="h-8 w-8" @click="goToNextWeek">
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="border border-border/50 rounded-lg p-12 text-center">
      <p class="text-sm text-muted-foreground">Chargement du calendrier...</p>
    </div>

    <!-- Calendar Grid -->
    <div v-else class="border border-border/50 rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <div class="min-w-[800px]">
          <!-- Day Headers with availability -->
          <div class="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50">
            <div class="p-2 bg-accent/20"></div>
            <div
              v-for="(day, i) in weekDays"
              :key="day.toISOString()"
              :class="[
                'border-l border-border/50 text-center',
                checkIsToday(day) ? 'bg-primary/5' : 'bg-accent/20',
              ]"
            >
              <!-- Date -->
              <div class="px-2 pt-2 pb-1">
                <div class="text-xs text-muted-foreground uppercase tracking-wider">
                  {{ format(day, 'EEE', { locale: fr }) }}
                </div>
                <div
                  :class="[
                    'text-lg font-semibold mt-0.5',
                    checkIsToday(day) ? 'text-primary' : 'text-foreground',
                  ]"
                >
                  {{ format(day, 'd') }}
                </div>
              </div>

              <!-- Availability status bar (click to edit) -->
              <button
                @click="openDayEditor(day)"
                class="w-full px-2 pb-2 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-accent/40 transition-colors rounded-b"
                title="Modifier les horaires"
              >
                <div
                  :class="[
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    isDayOpen(day) ? 'bg-green-500' : 'bg-red-400',
                  ]"
                />
                <span
                  :class="[
                    'text-[10px] font-medium',
                    isDayOpen(day) ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400',
                  ]"
                >
                  {{ isDayOpen(day) ? 'Ouvert' : 'Fermé' }}
                </span>
                <span
                  v-if="isOverridden(day)"
                  class="text-[8px] px-1 rounded bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300"
                >
                  modifié
                </span>
              </button>
            </div>
          </div>

          <!-- Time Rows -->
          <div class="relative">
            <div
              v-for="time in timeSlots"
              :key="time"
              class="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30 last:border-0"
              :class="time.endsWith(':00') ? 'border-border/50' : ''"
            >
              <!-- Time Label -->
              <div class="p-1 pr-2 text-right">
                <span v-if="time.endsWith(':00')" class="text-xs text-muted-foreground">
                  {{ time }}
                </span>
              </div>

              <!-- Day Cells -->
              <div
                v-for="(day, i) in weekDays"
                :key="`${day.toISOString()}-${time}`"
                :class="[
                  'border-l border-border/30 min-h-[32px] relative',
                  !isDayOpen(day)
                    ? 'bg-muted/40 closed-cell'
                    : isTimeInAvailability(day, time)
                      ? (checkIsToday(day) ? 'bg-primary/[0.04]' : 'bg-background')
                      : 'bg-muted/30 closed-cell',
                ]"
              >
                <!-- Closed day label (only on first row) -->
                <div
                  v-if="!isDayOpen(day) && time === '08:00'"
                  class="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
                  style="height: 832px"
                >
                  <span class="text-xs text-muted-foreground/15 font-medium -rotate-90 select-none tracking-widest uppercase">Fermé</span>
                </div>

                <!-- Bookings -->
                <template v-for="booking in getBookingsForSlot(day, time)" :key="booking.id">
                  <button
                    v-if="isBookingStart(booking, time)"
                    @click="emit('booking-click', booking)"
                    :class="[
                      'absolute inset-x-0.5 z-10 rounded px-1.5 py-0.5 text-left border cursor-pointer transition-opacity hover:opacity-80 overflow-hidden',
                      getStatusColor(booking.status),
                    ]"
                    :style="{ height: `${getBookingSlotSpan(booking) * 32 - 2}px` }"
                  >
                    <div class="text-[11px] font-medium truncate leading-tight flex items-center gap-1">
                      <span v-if="booking.status === 'pending'" class="text-[9px]">⏳</span>
                      {{ booking.customerName }}
                    </div>
                    <div class="text-[10px] opacity-70 truncate leading-tight">
                      {{ booking.serviceName }}
                    </div>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== DAY EDITOR MODAL ===== -->
    <Dialog v-model:open="showDayEditor">
      <DialogContent v-if="editingDay" class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {{ format(new Date(editingDay.date + 'T12:00:00'), 'EEEE d MMMM', { locale: fr }) }}
          </DialogTitle>
          <DialogDescription>Modifier les horaires pour cette journée</DialogDescription>
        </DialogHeader>

        <div class="space-y-4 mt-2">
          <div v-if="dayError" class="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {{ dayError }}
          </div>

          <!-- Open/Close toggle -->
          <div class="flex items-center justify-between">
            <Label>Salon ouvert</Label>
            <button @click="editForm.isOpen = !editForm.isOpen">
              <div
                :class="[
                  'relative w-10 h-6 rounded-full transition-colors duration-200',
                  editForm.isOpen ? 'bg-primary' : 'bg-muted-foreground/20',
                ]"
              >
                <div
                  :class="[
                    'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                    editForm.isOpen ? 'translate-x-[20px]' : 'translate-x-1',
                  ]"
                />
              </div>
            </button>
          </div>

          <!-- Time slots -->
          <div v-if="editForm.isOpen" class="space-y-3">
            <Label>Créneaux</Label>
            <div
              v-for="(slot, idx) in editForm.slots"
              :key="idx"
              class="flex items-center gap-2"
            >
              <TimePicker v-model="slot.startTime" class="flex-1" />
              <span class="text-xs text-muted-foreground">à</span>
              <TimePicker v-model="slot.endTime" class="flex-1" />
              <button
                v-if="editForm.slots.length > 1"
                @click="removeEditSlot(idx)"
                class="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              @click="addEditSlot"
              class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus class="h-3 w-3" />
              Ajouter un créneau
            </button>
          </div>

          <!-- Reset to default -->
          <div v-if="editingDay.availability.source === 'override'" class="pt-2 border-t border-border/30">
            <button
              @click="resetDayToDefault"
              class="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <RotateCcw class="h-3 w-3" />
              Réinitialiser aux horaires par défaut
            </button>
          </div>

          <div class="flex gap-2 pt-2">
            <Button @click="saveDayAvailability" :disabled="savingDay" class="flex-1">
              {{ savingDay ? 'Enregistrement...' : 'Enregistrer' }}
            </Button>
            <Button variant="ghost" @click="showDayEditor = false">Annuler</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.closed-cell {
  background-image: repeating-linear-gradient(
    135deg,
    transparent,
    transparent 8px,
    rgba(0, 0, 0, 0.03) 8px,
    rgba(0, 0, 0, 0.03) 9px
  );
}
</style>
