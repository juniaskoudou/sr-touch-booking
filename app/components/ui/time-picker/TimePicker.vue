<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Clock } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    modelValue: '09:00',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  if (value) emit('update:modelValue', value)
}
</script>

<template>
  <InputGroup :class="cn('w-auto', props.class)">
    <InputGroupInput
      type="time"
      :model-value="modelValue"
      class="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none tabular-nums"
      @update:model-value="(v: string | number) => emit('update:modelValue', String(v))"
    />
    <InputGroupAddon align="inline-end">
      <Clock class="size-3.5" />
    </InputGroupAddon>
  </InputGroup>
</template>
