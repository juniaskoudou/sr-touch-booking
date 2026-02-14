<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { t } from '@/lib/translations';
import { format, addDays, startOfDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-vue-next';

interface AddonService {
  id: number;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
}

interface Service {
  id: number;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface OpenDate {
  date: string;
  isOpen: boolean;
  hasAvailableSlots: boolean;
}

const route = useRoute();
const serviceId = computed(() => parseInt(route.params.id as string));

const loading = ref(true);
const service = ref<Service | null>(null);
const addons = ref<AddonService[]>([]);
const selectedDate = ref<Date | null>(null);
const selectedTime = ref<string | null>(null);
const timeSlots = ref<TimeSlot[]>([]);
const loadingSlots = ref(false);
const selectedAddonIds = ref<Set<number>>(new Set());
const openDates = ref<OpenDate[]>([]);
const loadingDates = ref(true);

// Pre-populate customer info from query params (e.g. when rescheduling)
const query = route.query;
const customerName = ref((query.name as string) || '');
const customerPhone = ref((query.phone as string) || '');
const customerEmail = ref((query.email as string) || '');
const phoneTouched = ref(false);
const submitting = ref(false);
const bookingError = ref<string | null>(null);
const acceptedConditions = ref(false);

// Step management: 1 = select date/time/addons, 2 = customer info + confirm
const step = ref(1);

const goToConfirm = () => {
  step.value = 2;
};

const goBack = () => {
  step.value = 1;
};

const formatPrice = (priceInCents: number) => {
  const euros = priceInCents / 100;
  return euros % 1 === 0 ? euros.toFixed(0) : euros.toFixed(2);
};

const fetchService = async () => {
  try {
    loading.value = true;
    const [serviceData, addonsData] = await Promise.all([
      $fetch<Service>(`/api/services/${serviceId.value}`),
      $fetch<AddonService[]>('/api/services/addons'),
    ]);
    service.value = serviceData;
    addons.value = addonsData;
  } catch (err) {
    console.error('Error fetching service:', err);
    throw createError({
      statusCode: 404,
      message: 'Service not found',
    });
  } finally {
    loading.value = false;
  }
};

const fetchOpenDates = async () => {
  try {
    loadingDates.value = true;
    const data = await $fetch<OpenDate[]>(`/api/bookings/open-dates?serviceId=${serviceId.value}`);
    openDates.value = data;

    // Auto-select the first date with available slots
    const firstAvailable = data.find(d => d.hasAvailableSlots);
    if (firstAvailable) {
      handleDateSelect(firstAvailable.date);
    }
  } catch (err) {
    console.error('Error fetching open dates:', err);
  } finally {
    loadingDates.value = false;
  }
};

const fetchTimeSlots = async (date: Date) => {
  if (!date) return;

  try {
    loadingSlots.value = true;
    const dateStr = format(date, 'yyyy-MM-dd');
    const slots = await $fetch<TimeSlot[]>(`/api/bookings/availability?date=${dateStr}&serviceId=${serviceId.value}`);
    timeSlots.value = slots;
  } catch (err) {
    console.error('Error fetching time slots:', err);
    timeSlots.value = [];
  } finally {
    loadingSlots.value = false;
  }
};

const availableSlots = computed(() => timeSlots.value.filter(s => s.available));

const handleDateSelect = (dateStr: string) => {
  selectedDate.value = parseISO(dateStr);
  selectedTime.value = null;
  fetchTimeSlots(selectedDate.value);
};

const handleTimeSelect = (time: string) => {
  selectedTime.value = time;
};

const toggleAddon = (addonId: number) => {
  const newSet = new Set(selectedAddonIds.value);
  if (newSet.has(addonId)) {
    newSet.delete(addonId);
  } else {
    newSet.add(addonId);
  }
  selectedAddonIds.value = newSet;
};

const selectedAddonsList = computed(() => {
  return addons.value.filter(a => selectedAddonIds.value.has(a.id));
});

const totalPrice = computed(() => {
  if (!service.value) return 0;
  let total = service.value.price;
  for (const addon of selectedAddonsList.value) {
    total += addon.price;
  }
  return total;
});

const totalDuration = computed(() => {
  if (!service.value) return 0;
  let total = service.value.durationMinutes;
  for (const addon of selectedAddonsList.value) {
    total += addon.durationMinutes;
  }
  return total;
});

// Validate French phone: 0X XX XX XX XX or +33 X XX XX XX XX (spaces optional)
const isValidFrenchPhone = computed(() => {
  const cleaned = customerPhone.value.replace(/\s/g, '');
  return /^0[1-9]\d{8}$/.test(cleaned) || /^\+33[1-9]\d{8}$/.test(cleaned);
});

const canSubmit = computed(() => {
  return service.value &&
    selectedDate.value &&
    selectedTime.value &&
    customerName.value.trim() &&
    customerPhone.value.trim() &&
    isValidFrenchPhone.value &&
    customerEmail.value.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.value) &&
    acceptedConditions.value;
});

const handleSubmit = async () => {
  if (!canSubmit.value || !selectedDate.value || !selectedTime.value) return;

  try {
    submitting.value = true;
    bookingError.value = null;
    const bookingDate = format(selectedDate.value, 'yyyy-MM-dd');

    const result = await $fetch<{ booking: any; token: string; bookingUrl: string }>('/api/bookings', {
      method: 'POST',
      body: {
        serviceId: service.value!.id,
        customerName: customerName.value.trim(),
        customerEmail: customerEmail.value.trim(),
        customerPhone: customerPhone.value.trim() || undefined,
        bookingDate,
        bookingTime: selectedTime.value,
        addonIds: Array.from(selectedAddonIds.value),
      },
    });

    navigateTo(`/book/confirm?token=${result.token}`);
  } catch (err: any) {
    console.error('Error creating booking:', err);
    bookingError.value = 'Erreur lors de la création de la réservation. Veuillez réessayer.';
  } finally {
    submitting.value = false;
  }
};

// Date scroll container ref
const dateScrollRef = ref<HTMLElement | null>(null);

const scrollDates = (direction: 'left' | 'right') => {
  if (!dateScrollRef.value) return;
  const scrollAmount = 260;
  dateScrollRef.value.scrollBy({
    left: direction === 'right' ? scrollAmount : -scrollAmount,
    behavior: 'smooth',
  });
};

watch(serviceId, () => {
  fetchService();
  fetchOpenDates();
}, { immediate: true });
</script>

<template>
  <div class="min-h-screen bg-white">
    <div class="max-w-2xl mx-auto px-4 py-6">
      <!-- Back button -->
      <button
        @click="step === 2 ? goBack() : navigateTo('/')"
        class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <ArrowLeft class="w-4 h-4" />
        {{ t.common.back }}
      </button>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <div class="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>

      <div v-else-if="service">

        <!-- ════════════════════════════════════ -->
        <!-- STEP 1: Service, addons, date, time -->
        <!-- ════════════════════════════════════ -->
        <template v-if="step === 1">
          <!-- Service header -->
          <div class="mb-8">
            <h1 class="text-2xl font-semibold text-gray-900">{{ service.name }}</h1>
            <p v-if="service.description" class="text-gray-500 mt-1">{{ service.description }}</p>
            <div class="flex items-center gap-2 mt-2 text-sm text-gray-400">
              <span class="font-medium text-gray-900">{{ formatPrice(service.price) }} €</span>
              <span>·</span>
              <span>{{ service.durationMinutes }} min</span>
            </div>
          </div>

          <!-- Add-ons -->
          <div v-if="addons.length > 0" class="mb-8">
            <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Suppléments</h2>
            <div class="space-y-2">
              <button
                v-for="addon in addons"
                :key="addon.id"
                @click="toggleAddon(addon.id)"
                :class="[
                  'w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all',
                  selectedAddonIds.has(addon.id)
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                ]"
              >
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      selectedAddonIds.has(addon.id)
                        ? 'bg-gray-900 border-gray-900'
                        : 'border-gray-300'
                    ]"
                  >
                    <Check v-if="selectedAddonIds.has(addon.id)" class="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-900">{{ addon.name }}</span>
                    <span v-if="addon.durationMinutes > 0" class="text-xs text-gray-400 ml-1.5">+{{ addon.durationMinutes }} min</span>
                  </div>
                </div>
                <span class="text-sm font-medium text-gray-500">+{{ formatPrice(addon.price) }} €</span>
              </button>
            </div>
          </div>

          <!-- Date Selection -->
          <div class="mb-8">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide">{{ t.booking.selectDate }}</h2>
              <div v-if="openDates.length > 0" class="flex items-center gap-1">
                <button
                  @click="scrollDates('left')"
                  class="p-1 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft class="w-4 h-4" />
                </button>
                <button
                  @click="scrollDates('right')"
                  class="p-1 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div v-if="loadingDates" class="py-4 text-center">
              <div class="inline-block w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            </div>

            <div v-else-if="openDates.length === 0" class="py-4 text-center text-sm text-gray-400">
              Aucune date disponible
            </div>

            <div v-else ref="dateScrollRef" class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              <button
                v-for="openDate in openDates"
                :key="openDate.date"
                @click="handleDateSelect(openDate.date)"
                :class="[
                  'flex flex-col items-center min-w-[4rem] px-3 py-3 rounded-xl transition-all shrink-0',
                  selectedDate && format(selectedDate, 'yyyy-MM-dd') === openDate.date
                    ? 'bg-gray-900 text-white'
                    : openDate.hasAvailableSlots
                      ? 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                      : 'bg-gray-50 text-gray-300 cursor-default'
                ]"
                :disabled="!openDate.hasAvailableSlots"
              >
                <span class="text-[11px] uppercase font-medium" :class="[
                  selectedDate && format(selectedDate, 'yyyy-MM-dd') === openDate.date
                    ? 'text-gray-300'
                    : openDate.hasAvailableSlots ? 'text-gray-400' : 'text-gray-300'
                ]">
                  {{ format(parseISO(openDate.date), 'EEE', { locale: fr }) }}
                </span>
                <span class="text-lg font-semibold mt-0.5">
                  {{ format(parseISO(openDate.date), 'd') }}
                </span>
                <span class="text-[10px]" :class="[
                  selectedDate && format(selectedDate, 'yyyy-MM-dd') === openDate.date
                    ? 'text-gray-400'
                    : openDate.hasAvailableSlots ? 'text-gray-400' : 'text-gray-300'
                ]">
                  {{ format(parseISO(openDate.date), 'MMM', { locale: fr }) }}
                </span>
                <!-- Availability dot -->
                <div
                  v-if="openDate.hasAvailableSlots"
                  class="w-1.5 h-1.5 rounded-full mt-1.5"
                  :class="[
                    selectedDate && format(selectedDate, 'yyyy-MM-dd') === openDate.date
                      ? 'bg-white'
                      : 'bg-emerald-400'
                  ]"
                />
                <div v-else class="w-1.5 h-1.5 mt-1.5" />
              </button>
            </div>
          </div>

          <!-- Time Selection -->
          <div v-if="selectedDate" class="mb-8">
            <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">{{ t.booking.selectTime }}</h2>

            <div v-if="loadingSlots" class="py-4 text-center">
              <div class="inline-block w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            </div>

            <div v-else-if="availableSlots.length === 0" class="py-4 text-center text-sm text-gray-400">
              {{ t.booking.noAvailableSlots }}
            </div>

            <div v-else class="flex flex-wrap gap-2">
              <button
                v-for="slot in availableSlots"
                :key="slot.time"
                @click="handleTimeSelect(slot.time)"
                :class="[
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  selectedTime === slot.time
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                ]"
              >
                {{ slot.time }}
              </button>
            </div>
          </div>

          <!-- Continue button -->
          <Button
            v-if="selectedTime"
            @click="goToConfirm"
            class="w-full rounded-xl py-6 text-base font-medium"
          >
            {{ t.common.next }}
          </Button>
        </template>

        <!-- ════════════════════════════════════ -->
        <!-- STEP 2: Customer info + confirm     -->
        <!-- ════════════════════════════════════ -->
        <template v-if="step === 2">
          <!-- Summary -->
          <div class="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-600">
                <span>{{ service.name }}</span>
                <span>{{ formatPrice(service.price) }} €</span>
              </div>
              <div v-for="addon in selectedAddonsList" :key="addon.id" class="flex justify-between text-gray-400">
                <span>+ {{ addon.name }}</span>
                <span>+{{ formatPrice(addon.price) }} €</span>
              </div>
              <div class="border-t border-gray-200 pt-2 mt-2 flex justify-between text-gray-600">
                <span>{{ selectedDate ? format(selectedDate, 'EEEE d MMMM', { locale: fr }) : '' }}</span>
                <span>{{ selectedTime }}</span>
              </div>
              <div class="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>{{ formatPrice(totalPrice) }} €</span>
              </div>
            </div>
          </div>

          <!-- Customer Info -->
          <div class="mb-6">
            <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">{{ t.booking.customerInfo }}</h2>
            <div class="space-y-3">
              <input
                v-model="customerName"
                type="text"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow placeholder:text-gray-400"
                :placeholder="t.booking.customerName"
              />
              <div>
                <input
                  v-model="customerPhone"
                  type="tel"
                  inputmode="numeric"
                  pattern="[0-9+\s]*"
                  @input="customerPhone = customerPhone.replace(/[^0-9+\s]/g, '')"
                  @blur="phoneTouched = true"
                  :class="[
                    'w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow placeholder:text-gray-400',
                    phoneTouched && customerPhone.trim() && !isValidFrenchPhone
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-200 focus:ring-gray-900'
                  ]"
                  placeholder="06 12 34 56 78"
                />
                <p v-if="phoneTouched && customerPhone.trim() && !isValidFrenchPhone" class="text-xs text-red-500 mt-1">
                  Numéro français requis (ex: 06 12 34 56 78)
                </p>
              </div>
              <input
                v-model="customerEmail"
                type="email"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow placeholder:text-gray-400"
                :placeholder="t.booking.customerEmail"
              />
            </div>
          </div>

          <!-- Conditions -->
          <div class="mb-6">
            <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Conditions importantes</h2>
            <div class="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <ul class="space-y-2 text-sm text-gray-700">
                <li class="flex items-start gap-2">
                  <span class="text-amber-500 mt-0.5">•</span>
                  <span>Acompte de <strong>10 €</strong> obligatoire</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-amber-500 mt-0.5">•</span>
                  <span>Aucun accompagnateur</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-amber-500 mt-0.5">•</span>
                  <span>Retard : <strong>+5 €</strong> dès 10 min</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-amber-500 mt-0.5">•</span>
                  <span>+30 min de retard = RDV annulé</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-amber-500 mt-0.5">•</span>
                  <span>Perruque propre et en bon état</span>
                </li>
              </ul>
            </div>

            <label class="flex items-center gap-3 mt-3 cursor-pointer">
              <button
                @click="acceptedConditions = !acceptedConditions"
                :class="[
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  acceptedConditions
                    ? 'bg-gray-900 border-gray-900'
                    : 'border-gray-300'
                ]"
              >
                <Check v-if="acceptedConditions" class="h-3 w-3 text-white" />
              </button>
              <span class="text-sm text-gray-600">J'accepte les conditions ci-dessus</span>
            </label>
          </div>

          <!-- Error -->
          <div v-if="bookingError" class="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
            {{ bookingError }}
          </div>

          <!-- Submit -->
          <Button
            @click="handleSubmit"
            :disabled="submitting || !canSubmit"
            class="w-full rounded-xl py-6 text-base font-medium"
          >
            {{ submitting ? t.common.loading : t.booking.confirmBooking }}
          </Button>
        </template>

      </div>
    </div>
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
