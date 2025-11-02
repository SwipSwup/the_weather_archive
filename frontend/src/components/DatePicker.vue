<template>
  <div class="date-picker">
    <label class="date-label">Select Date</label>
    <input
      type="date"
      v-model="selectedDate"
      class="date-input"
      :min="minDate"
      :max="maxDate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const selectedDate = ref('')
const today = new Date().toISOString().split('T')[0]
const minDate = '2020-01-01' // Placeholder - will use actual data range
const maxDate = today
</script>

<style scoped>
.date-picker {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.date-label {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-input {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.date-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.date-input:hover {
  border-color: var(--color-text-secondary);
}

/* Dark mode date picker styling */
.date-input::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}
</style>
