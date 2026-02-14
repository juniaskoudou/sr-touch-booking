<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string // yyyy-MM-dd string
    placeholder?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    modelValue: '',
    placeholder: 'Choisir une date',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)

// Convert string to DateValue
const dateValue = computed<DateValue | undefined>({
  get() {
    if (!props.modelValue) return undefined
    const [y, m, d] = props.modelValue.split('-').map(Number)
    if (!y || !m || !d) return undefined
    return new CalendarDate(y, m, d)
  },
  set(val: DateValue | undefined) {
    if (val) {
      const y = val.year.toString().padStart(4, '0')
      const m = val.month.toString().padStart(2, '0')
      const d = val.day.toString().padStart(2, '0')
      emit('update:modelValue', `${y}-${m}-${d}`)
      open.value = false
    } else {
      emit('update:modelValue', '')
    }
  },
})

const displayDate = computed(() => {
  if (!dateValue.value) return ''
  const jsDate = new Date(props.modelValue + 'T12:00:00')
  return jsDate.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'w-full justify-start text-left font-normal',
          !modelValue && 'text-muted-foreground',
          props.class,
        )"
      >
        <CalendarIcon class="mr-2 h-4 w-4 shrink-0" />
        <span>{{ displayDate || placeholder }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="dateValue"
        locale="fr-FR"
        :min-value="today(getLocalTimeZone())"
        initial-focus
      />
    </PopoverContent>
  </Popover>
</template>
