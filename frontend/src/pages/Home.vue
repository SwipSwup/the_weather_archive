<template>
  <div class="home">
    <div class="hero-content">
      <div class="logo-section">
        <h1 class="hero-title">The Weather Archive</h1>
        <p class="hero-subtitle">Explore historical weather data and webcam imagery from major European cities</p>
      </div>
      <div class="search-section">
        <SearchBar
          :available-cities="availableCities"
          placeholder="Enter a city (e.g., Vienna, Berlin, Paris...)"
          @search="handleSearch"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'

const router = useRouter()
const availableCities = ['Vienna', 'Berlin', 'Paris', 'London', 'Rome', 'Amsterdam', 'Madrid']

const handleSearch = (city: string) => {
  router.push(`/city/${city}`)
}
</script>

<style scoped>
.home {
  position: relative;
  height: 100%;
  padding: var(--spacing-md);
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  overflow: hidden;
}

.hero-content {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl);
  text-align: center;
}

.logo-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  animation: fadeIn var(--transition-slow);
}

.hero-title {
  color: var(--color-accent);
  font-size: 64px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.5px;
  margin: 0;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
}

.hero-subtitle {
  color: var(--color-text-primary);
  font-size: 18px;
  font-weight: 400;
  line-height: 1.6;
  opacity: 0.8;
  max-width: 600px;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
}

.search-section {
  width: 100%;
  max-width: 500px;
  animation: fadeIn var(--transition-slow) 0.2s backwards;
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
  .hero-title {
    font-size: 48px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .hero-content {
    gap: var(--spacing-lg);
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 32px;
  }

  .home {
    padding: var(--spacing-lg) var(--spacing-md);
  }
}
</style>