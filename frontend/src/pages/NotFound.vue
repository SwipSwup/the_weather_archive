<template>
  <div class="not-found">
    <div class="content">
      <FuzzyText
          text="404"
          :font-size="200"
          font-weight="900"
          color="#BCBFB0"
          :enable-hover="true"
          :base-intensity="0.18"
          :hover-intensity="0.5"
      />

      <h1 class="error-title">Page Not Found</h1>
      <button @click="goHome" class="home-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back to Home
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import FuzzyText from "@/bits/TextAnimations/FuzzyText/FuzzyText.vue";

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.not-found {
  height: 100%;
  padding: var(--spacing-md);
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  max-width: 600px;
  animation: fadeIn var(--transition-slow);
}

.error-code {
  font-size: 120px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
  opacity: 0.8;
}

.error-title {
  color: var(--color-accent);
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
}

.error-message {
  color: var(--color-text-primary);
  font-size: 18px;
  opacity: 0.8;
  margin: 0;
  line-height: 1.6;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
}

.home-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 16px;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
  margin-top: var(--spacing-md);
}

.home-button:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-bg-neutral-2);
  transform: translateY(-2px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .error-code {
    font-size: 80px;
  }

  .error-title {
    font-size: 28px;
  }

  .error-message {
    font-size: 16px;
  }
}
</style>


