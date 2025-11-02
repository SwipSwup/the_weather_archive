<template>
  <div class="loading-spinner" v-if="show">
    <div class="spinner-container">
      <div class="spinner-ring">
        <div class="ring-outer"></div>
        <div class="ring-middle"></div>
        <div class="ring-inner"></div>
      </div>
      <p class="loading-text" v-if="message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean
  message?: string
}

withDefaults(defineProps<Props>(), {
  show: false,
  message: ''
})
</script>

<style scoped>
.loading-spinner {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(24, 24, 24, 0.85);
  backdrop-filter: blur(8px);
  animation: fadeIn var(--transition-base);
}

.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
}

.spinner-ring {
  width: 56px;
  height: 56px;
  position: relative;
}

.ring-outer,
.ring-middle,
.ring-inner {
  position: absolute;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--color-accent);
}

.ring-outer {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  animation: spin 1s linear infinite;
  border-width: 3px;
}

.ring-middle {
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
  animation: spin 0.8s linear infinite reverse;
  border-width: 2.5px;
  opacity: 0.8;
}

.ring-inner {
  width: 45%;
  height: 45%;
  top: 27.5%;
  left: 27.5%;
  animation: spin 0.6s linear infinite;
  border-width: 2px;
  opacity: 0.6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.9;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
