<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { t } from '@/lib/translations';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarOff,
  AlertTriangle,
} from 'lucide-vue-next';

definePageMeta({
  layout: 'admin',
});

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  availability: {
    isOpen: boolean;
    slots: Array<{ startTime: string; endTime: string }>;
    source: 'default' | 'override';
    reason?: string | null;
  };
  bookings: any[];
}

// ──────────────────────────────────────
// Generate all half-hour time slots
// ──────────────────────────────────────

const ALL_TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let h = 7; h <= 21; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  slots.push('22:00');
  return slots;
})();

// ──────────────────────────────────────
// State
// ──────────────────────────────────────

const today = new Date();
const calendarDays = ref<CalendarDay[]>([]);
const loading = ref(true);
const selectedDateStr = ref<string | null>(null);
const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

// Edited time slots for the selected date (local state before save)
const editedSlots = ref<Array<{ startTime: string; endTime: string }>>([]);
const isDayOpen = ref(true);
const hasChanges = ref(false);

// Date strip scroll
const dateScrollRef = ref<HTMLElement | null>(null);

// ──────────────────────────────────────
// Generate dates (next 28 days)
// ──────────────────────────────────────

const dates = computed(() => {
  const result: Date[] = [];
  for (let i = 0; i < 28; i++) {
    result.push(addDays(today, i));
  }
  return result;
});

// ──────────────────────────────────────
// Fetch calendar data
// ──────────────────────────────────────

const fetchCalendarData = async (silent = false) => {
  try {
    if (!silent) loading.value = true;

    // Fetch 5 weeks of data
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weeks = [];
    for (let w = 0; w < 5; w++) {
      const start = format(addDays(weekStart, w * 7), 'yyyy-MM-dd');
      weeks.push($fetch<CalendarDay[]>(`/api/admin/calendar-week?start=${start}`));
    }
    const results = await Promise.all(weeks);
    calendarDays.value = results.flat();

    // Auto-select today (only on initial load)
    if (!silent) {
      const todayStr = format(today, 'yyyy-MM-dd');
      handleDateSelect(todayStr);
    }
  } catch (err) {
    console.error('Error fetching calendar data:', err);
  } finally {
    if (!silent) loading.value = false;
  }
};

// ──────────────────────────────────────
// Date selection
// ──────────────────────────────────────

const getCalendarDay = (dateStr: string) => {
  return calendarDays.value.find(d => d.date === dateStr);
};

const handleDateSelect = (dateStr: string) => {
  selectedDateStr.value = dateStr;
  hasChanges.value = false;
  error.value = null;

  // Load existing slots into edit state
  const day = getCalendarDay(dateStr);
  if (day?.availability.isOpen && day.availability.slots.length > 0) {
    editedSlots.value = JSON.parse(JSON.stringify(day.availability.slots));
    isDayOpen.value = true;
  } else {
    editedSlots.value = [];
    isDayOpen.value = day?.availability.isOpen ?? false;
  }
};

const toggleDayOpen = () => {
  isDayOpen.value = !isDayOpen.value;
  if (!isDayOpen.value) {
    editedSlots.value = [];
  }
  hasChanges.value = true;
};

const selectedDay = computed(() => {
  if (!selectedDateStr.value) return null;
  return getCalendarDay(selectedDateStr.value);
});

const isDateOpen = (dateStr: string) => {
  const day = getCalendarDay(dateStr);
  return day?.availability.isOpen ?? false;
};

const isDateOverridden = (dateStr: string) => {
  const day = getCalendarDay(dateStr);
  return day?.availability.source === 'override';
};

// ──────────────────────────────────────
// Time slot toggle (local edit state)
// ──────────────────────────────────────

const isTimeOpen = (time: string) => {
  return editedSlots.value.some(slot => time >= slot.startTime && time < slot.endTime);
};

const toggleTimeSlot = (time: string) => {
  if (isTimeOpen(time)) {
    removeTimeFromSlots(time);
  } else {
    addTimeToSlots(time);
  }
  hasChanges.value = true;
};

const getNextHalfHour = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  if (m === 0) return `${h.toString().padStart(2, '0')}:30`;
  return `${(h + 1).toString().padStart(2, '0')}:00`;
};

const addTimeToSlots = (time: string) => {
  const nextTime = getNextHalfHour(time);

  for (const slot of editedSlots.value) {
    if (slot.endTime === time) {
      slot.endTime = nextTime;
      mergeSlots();
      return;
    }
    if (slot.startTime === nextTime) {
      slot.startTime = time;
      mergeSlots();
      return;
    }
  }

  editedSlots.value.push({ startTime: time, endTime: nextTime });
  editedSlots.value.sort((a, b) => a.startTime.localeCompare(b.startTime));
  mergeSlots();
};

const removeTimeFromSlots = (time: string) => {
  const nextTime = getNextHalfHour(time);
  const newSlots: Array<{ startTime: string; endTime: string }> = [];

  for (const slot of editedSlots.value) {
    if (time >= slot.startTime && time < slot.endTime) {
      if (slot.startTime < time) {
        newSlots.push({ startTime: slot.startTime, endTime: time });
      }
      if (nextTime < slot.endTime) {
        newSlots.push({ startTime: nextTime, endTime: slot.endTime });
      }
    } else {
      newSlots.push(slot);
    }
  }

  editedSlots.value = newSlots;
};

const mergeSlots = () => {
  if (editedSlots.value.length <= 1) return;
  editedSlots.value.sort((a, b) => a.startTime.localeCompare(b.startTime));
  const merged: Array<{ startTime: string; endTime: string }> = [editedSlots.value[0]];
  for (let i = 1; i < editedSlots.value.length; i++) {
    const last = merged[merged.length - 1];
    const curr = editedSlots.value[i];
    if (last.endTime >= curr.startTime) {
      last.endTime = curr.endTime > last.endTime ? curr.endTime : last.endTime;
    } else {
      merged.push(curr);
    }
  }
  editedSlots.value = merged;
};

// ──────────────────────────────────────
// Quick actions
// ──────────────────────────────────────

const selectPreset = (preset: 'morning' | 'afternoon' | 'full' | 'clear') => {
  if (preset === 'clear') {
    editedSlots.value = [];
  } else if (preset === 'morning') {
    // Add 09:00–12:00 without removing existing
    addRange('09:00', '12:00');
  } else if (preset === 'afternoon') {
    addRange('14:00', '18:00');
  } else if (preset === 'full') {
    editedSlots.value = [{ startTime: '09:00', endTime: '19:00' }];
  }
  hasChanges.value = true;
};

const addRange = (start: string, end: string) => {
  editedSlots.value.push({ startTime: start, endTime: end });
  mergeSlots();
};

// ──────────────────────────────────────
// Save
// ──────────────────────────────────────

const saveDate = async () => {
  if (!selectedDateStr.value) return;
  error.value = null;

  // Validation (only when day is open and has slots)
  if (isDayOpen.value && editedSlots.value.length > 0) {
    for (const slot of editedSlots.value) {
      if (slot.startTime >= slot.endTime) {
        error.value = `L'heure de fin doit être après l'heure de début (${slot.startTime} → ${slot.endTime})`;
        return;
      }
    }
  }

  try {
    saving.value = true;
    const isClosed = !isDayOpen.value || editedSlots.value.length === 0;

    await $fetch('/api/admin/availability-overrides', {
      method: 'POST',
      body: {
        date: selectedDateStr.value,
        isClosed,
        slots: isClosed ? [] : editedSlots.value,
        reason: null,
      },
    });

    // Re-fetch from server to confirm persistence and update all date statuses
    const savedDate = selectedDateStr.value;
    await fetchCalendarData(true);
    // Re-select the same date to reflect the freshly-fetched data
    if (savedDate) {
      handleDateSelect(savedDate);
    }

    saved.value = true;
    hasChanges.value = false;
    setTimeout(() => { saved.value = false; }, 1500);
  } catch (err: any) {
    error.value = err.data?.message || 'Erreur lors de la sauvegarde';
  } finally {
    saving.value = false;
  }
};

// ──────────────────────────────────────
// Date strip scroll
// ──────────────────────────────────────

const scrollDates = (direction: 'left' | 'right') => {
  if (!dateScrollRef.value) return;
  dateScrollRef.value.scrollBy({
    left: direction === 'right' ? 280 : -280,
    behavior: 'smooth',
  });
};

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

const slotsSummary = computed(() => {
  if (!isDayOpen.value || editedSlots.value.length === 0) return 'Fermé';
  return editedSlots.value.map(s => `${s.startTime} – ${s.endTime}`).join(', ');
});

const formatSelectedDate = computed(() => {
  if (!selectedDateStr.value) return '';
  const d = new Date(selectedDateStr.value + 'T12:00:00');
  return format(d, 'EEEE d MMMM yyyy', { locale: fr });
});

// ──────────────────────────────────────
// Init
// ──────────────────────────────────────

onMounted(() => {
  fetchCalendarData();
});
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-foreground mb-1">Horaires d'ouverture</h1>
        <p class="text-sm text-muted-foreground">
          Sélectionnez une date, puis cliquez sur les créneaux pour indiquer vos horaires
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="border border-border/50 rounded-lg p-12 text-center">
      <p class="text-sm text-muted-foreground">{{ t.common.loading }}</p>
    </div>

    <template v-else>
      <!-- ═══════════════════════════════════ -->
      <!-- Date selection strip               -->
      <!-- ═══════════════════════════════════ -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Choisir la date</h2>
          <div class="flex items-center gap-1">
            <button
              @click="scrollDates('left')"
              class="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <button
              @click="scrollDates('right')"
              class="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref="dateScrollRef" class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          <button
            v-for="date in dates"
            :key="format(date, 'yyyy-MM-dd')"
            @click="handleDateSelect(format(date, 'yyyy-MM-dd'))"
            :class="[
              'flex flex-col items-center min-w-[4.5rem] px-3 py-3 rounded-xl transition-all shrink-0',
              selectedDateStr === format(date, 'yyyy-MM-dd')
                ? 'bg-foreground text-background shadow-lg'
                : isDateOpen(format(date, 'yyyy-MM-dd'))
                  ? 'bg-accent/60 hover:bg-accent text-foreground'
                  : 'bg-accent/20 text-muted-foreground hover:bg-accent/40',
            ]"
          >
            <span class="text-[11px] uppercase font-medium" :class="[
              selectedDateStr === format(date, 'yyyy-MM-dd')
                ? 'opacity-60'
                : isDateOpen(format(date, 'yyyy-MM-dd')) ? 'text-muted-foreground' : 'opacity-50'
            ]">
              {{ format(date, 'EEE', { locale: fr }) }}
            </span>
            <span class="text-lg font-semibold mt-0.5">
              {{ format(date, 'd') }}
            </span>
            <span class="text-[10px]" :class="[
              selectedDateStr === format(date, 'yyyy-MM-dd')
                ? 'opacity-50'
                : 'opacity-40'
            ]">
              {{ format(date, 'MMM', { locale: fr }) }}
            </span>
            <!-- Status dot -->
            <div
              class="w-1.5 h-1.5 rounded-full mt-1.5"
              :class="[
                selectedDateStr === format(date, 'yyyy-MM-dd')
                  ? (isDateOpen(format(date, 'yyyy-MM-dd')) ? 'bg-green-400' : 'bg-red-400')
                  : (isDateOpen(format(date, 'yyyy-MM-dd')) ? 'bg-green-500' : 'bg-red-300/50'),
              ]"
            />
          </button>
        </div>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Selected date detail               -->
      <!-- ═══════════════════════════════════ -->
      <template v-if="selectedDateStr">
        <!-- Date header + toggle -->
        <div class="mb-4">
          <div class="flex items-center gap-4">
            <div class="flex-1">
              <h2 class="text-lg font-semibold text-foreground capitalize">{{ formatSelectedDate }}</h2>
              <p class="text-sm mt-0.5">
                <template v-if="isDayOpen && editedSlots.length > 0">
                  <span class="text-green-600 dark:text-green-400 font-medium">Ouvert</span>
                  <span class="text-muted-foreground"> · {{ slotsSummary }}</span>
                </template>
                <template v-else>
                  <span class="text-red-500 font-medium">Fermé</span>
                </template>
              </p>
            </div>
            <!-- Open/Close toggle with label -->
            <button
              @click="toggleDayOpen"
              class="flex items-center gap-2.5 cursor-pointer group"
              role="switch"
              :aria-checked="isDayOpen"
            >
              <span class="text-sm font-medium" :class="isDayOpen ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'">
                {{ isDayOpen ? 'Ouvert' : 'Fermé' }}
              </span>
              <span
                :class="[
                  'relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2',
                  isDayOpen ? 'bg-green-500' : 'bg-muted',
                ]"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                    isDayOpen ? 'translate-x-4' : 'translate-x-0',
                  ]"
                />
              </span>
            </button>
          </div>
        </div>

        <!-- Success -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="saved" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 dark:bg-green-950 dark:border-green-800">
            <Check class="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
            <span class="text-sm text-green-700 dark:text-green-300">Horaires enregistrés pour le {{ formatSelectedDate }}.</span>
          </div>
        </Transition>

        <!-- Error -->
        <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 dark:bg-red-950 dark:border-red-800">
          <AlertTriangle class="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <span class="text-sm text-red-700 dark:text-red-300">{{ error }}</span>
        </div>

        <!-- Time slots section (only when day is open) -->
        <template v-if="isDayOpen">
          <!-- Quick presets -->
          <div class="flex gap-2 flex-wrap mb-4">
            <button
              @click="selectPreset('morning')"
              class="px-3 py-1.5 text-xs rounded-lg border border-border/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all"
            >
              Matin <span class="text-[10px] opacity-60">9h–12h</span>
            </button>
            <button
              @click="selectPreset('afternoon')"
              class="px-3 py-1.5 text-xs rounded-lg border border-border/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all"
            >
              Après-midi <span class="text-[10px] opacity-60">14h–18h</span>
            </button>
            <button
              @click="selectPreset('full')"
              class="px-3 py-1.5 text-xs rounded-lg border border-border/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all"
            >
              Journée <span class="text-[10px] opacity-60">9h–19h</span>
            </button>
            <button
              v-if="editedSlots.length > 0"
              @click="selectPreset('clear')"
              class="px-3 py-1.5 text-xs rounded-lg border border-red-200/50 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all dark:border-red-800/50 dark:hover:bg-red-950"
            >
              Tout effacer
            </button>
          </div>

          <!-- ═══════════════════════════════════ -->
          <!-- Time slot grid                     -->
          <!-- ═══════════════════════════════════ -->
          <div class="mb-6">
            <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Sélectionnez les créneaux
            </h3>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="time in ALL_TIME_SLOTS"
                :key="time"
                @click="toggleTimeSlot(time)"
                :class="[
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isTimeOpen(time)
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-accent/40 text-muted-foreground hover:bg-accent/70 hover:text-foreground',
                ]"
              >
                {{ time }}
              </button>
            </div>
          </div>
        </template>

        <!-- Closed message -->
        <div v-else class="mb-6 py-8 text-center rounded-lg border border-dashed border-border/50">
          <CalendarOff class="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p class="text-sm text-muted-foreground">Ce jour est fermé</p>
          <p class="text-xs text-muted-foreground/60 mt-1">Activez le toggle pour définir des créneaux</p>
        </div>

        <!-- Unsaved changes bar -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-2"
        >
          <div
            v-if="hasChanges"
            class="p-3 rounded-lg border border-amber-200 bg-amber-50 flex items-center justify-between dark:bg-amber-950 dark:border-amber-800"
          >
            <div class="flex items-center gap-2">
              <AlertTriangle class="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span class="text-sm text-amber-700 dark:text-amber-300">Modifications non enregistrées</span>
            </div>
            <Button @click="saveDate" :disabled="saving" size="sm" class="gap-2">
              <Check v-if="saved" class="h-3.5 w-3.5" />
              <Save v-else class="h-3.5 w-3.5" />
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </Button>
          </div>
        </Transition>
      </template>
    </template>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
