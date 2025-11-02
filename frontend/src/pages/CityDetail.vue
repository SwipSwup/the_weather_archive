<template>
  <div class="city-detail">
    <LoadingSpinner :show="isLoading" message="Loading weather data..." />
    
    <div class="city-header">
      <button @click="goHome" class="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Home
      </button>
      <div class="header-content">
        <h1 class="city-name">{{ cityName }}</h1>
        <p class="city-subtitle">Historical weather data visualization</p>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="main-content">
        <div class="video-section">
          <VideoPlayer />
        </div>

        <div class="controls-section">
          <DatePicker />
          <TimeSlider />
        </div>
      </div>

      <div class="charts-section">
        <WeatherCharts />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import VideoPlayer from '@/components/VideoPlayer.vue'
import WeatherCharts from '@/components/WeatherCharts.vue'
import DatePicker from '@/components/DatePicker.vue'
import TimeSlider from '@/components/TimeSlider.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

interface Props {
  cityName: string
}

const props = defineProps<Props>()
const router = useRouter()

const isLoading = ref(true)

const goHome = () => {
  router.push('/')
}

// Simulate data fetching when component mounts or city changes
const fetchData = async () => {
  isLoading.value = true
  
  // TODO: Replace with actual API call
  // Example: await fetchWeatherData(props.cityName)
  
  // Simulate API call delay
  setTimeout(() => {
    isLoading.value = false
  }, 1500) // Placeholder - replace with actual data fetch
}

onMounted(() => {
  fetchData()
})

watch(() => props.cityName, () => {
  fetchData()
})
</script>

<style scoped>
.city-detail {
  height: 100%;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}

.city-header {
  flex-shrink: 0;
  margin-bottom: var(--spacing-md);
}

.back-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  background: transparent;
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-sm);
  font-size: 12px;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
}

.back-button:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-bg-secondary);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.city-name {
  color: var(--color-accent);
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
}

.city-subtitle {
  color: var(--color-text-primary);
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
}

.content-wrapper {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
  overflow: hidden;
  min-height: 0;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-height: 0;
  overflow: hidden;
}

.video-section {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
}

.controls-section {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  background: var(--color-bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
}

.charts-section {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
}

@media (min-width: 1024px) {
  .content-wrapper {
    grid-template-columns: 2fr 1fr;
  }

  .controls-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .city-name {
    font-size: 32px;
  }

  .city-subtitle {
    font-size: 14px;
  }

  .controls-section {
    grid-template-columns: 1fr;
  }

  .content-wrapper {
    gap: var(--spacing-md);
  }

  .city-header {
    margin-bottom: var(--spacing-sm);
  }
}
</style>
