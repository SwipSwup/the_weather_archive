<template>
  <div class="time-slider">
    <label class="slider-label">Time Range</label>
    <div class="slider-container">
      <input
        type="range"
        v-model="timeValue"
        :min="0"
        :max="24"
        :step="1"
        class="slider-input"
      />
      <div class="slider-labels">
        <span class="slider-label-text">00:00</span>
        <span class="slider-label-text">{{ formatTime(timeValue) }}</span>
        <span class="slider-label-text">24:00</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const timeValue = ref(12)

const formatTime = (hours: number): string => {
  const h = Math.floor(hours).toString().padStart(2, '0')
  return `${h}:00`
}
</script>

<style scoped>
.time-slider {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.slider-label {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.slider-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.slider-input {
  width: 100%;
  height: 6px;
  background: var(--color-bg-neutral-2);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.slider-input::-webkit-slider-thumb:hover {
  background: var(--color-accent-light);
}

.slider-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: background var(--transition-fast);
}

.slider-input::-moz-range-thumb:hover {
  background: var(--color-accent-light);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.slider-label-text {
  font-size: 11px;
}
</style>
