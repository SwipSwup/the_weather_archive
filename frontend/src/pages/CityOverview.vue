<template>
  <div class="city-overview-page">
    <LoadingSpinner :show="loading" message="Loading Available Archives..." />

    <div v-if="!loading" class="dashboard-container">
      
      <header class="dashboard-header">
           <button @click="router.push('/')" class="nav-btn-glass">
             <span class="material-icons">arrow_back</span>
             <span class="nav-label">Back</span>
           </button>
           <div class="header-text">
             <span class="subtitle-label">ARCHIVE ACCESS</span>
             <h1>{{ formatCityName(cityName) }}</h1>
           </div>
      </header>

      <div class="unified-glass-panel">
          
          <!-- LEFT: Calendar -->
          <div class="calendar-section">
            <HolographicCalendar 
                :availableDates="availableDates" 
                @select="goToDate" 
            />
          </div>

          <!-- Divider -->
          <div class="panel-divider"></div>

          <!-- RIGHT: Recent Captures -->
          <div class="recent-section">
            <div class="panel-header">
                <h2>Recent Captures</h2>
                <span class="badge">{{ availableDates.length }}</span>
            </div>

            <div class="scrollable-grid">
                <div v-if="availableDates.length === 0" class="empty-state">
                    No archives found.
                </div>
                
                <div class="cards-grid">
                    <div 
                        v-for="date in availableDates" 
                        :key="date" 
                        class="day-card"
                        @click="goToDate(date)"
                    >
                        <div class="card-content">
                            <span class="card-month">{{ new Date(date).toLocaleDateString(undefined, { month: 'short' }) }}</span>
                            <span class="card-day">{{ new Date(date).getDate() }}</span>
                        </div>
                        <div class="card-footer">
                            <span class="material-icons arrow-icon">arrow_forward</span>
                        </div>
                        <div class="card-glow"></div>
                    </div>
                </div>
            </div>
          </div>
      
      </div>

      <p class="instruction-text-footer">
        <span class="material-icons info_outline">info_outline</span>
        Select a date to access weather archives
      </p>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { WeatherApi } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import HolographicCalendar from '@/components/HolographicCalendar.vue';

const route = useRoute();
const router = useRouter();
const cityName = computed(() => route.params.cityName as string);

const loading = ref(true);
const availableDates = ref<string[]>([]);

onMounted(async () => {
    try {
        const dates = await WeatherApi.getAvailableDates(cityName.value);
        // Ensure sorted descending
        availableDates.value = dates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
    } catch (e) {
        console.error("Failed to load dates", e);
    } finally {
        loading.value = false;
    }
});

const goToDate = (date: string) => {
    router.push(`/city/${cityName.value}/${date}`);
};

const formatCityName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

</script>

<style scoped>
.city-overview-page {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: transparent; /* Changed from gradient to transparent to show global dither */
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
}

.dashboard-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    padding: 20px 60px 40px; /* Adjusted padding */
    align-items: center; /* Center horizontally */
}

/* --- HEADER --- */
.dashboard-header {
    width: 100%;
    max-width: 1600px;
    display: flex;
    align-items: center;
    gap: 32px;
    margin-bottom: 20px;
    flex-shrink: 0;
}

.nav-btn-glass {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 10px 20px;
    border-radius: 30px;
    color: white;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.nav-btn-glass:hover {
    background: rgba(255,255,255,0.2);
    color: white;
    transform: translateX(-4px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}

.nav-label {
    font-weight: 600;
    font-size: 0.9rem;
    letter-spacing: 0.5px;
}

.header-text h1 {
    font-size: 3rem;
    margin: 0;
    line-height: 1;
    font-weight: 800;
    letter-spacing: -1px;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.subtitle-label {
    font-size: 0.8rem;
    letter-spacing: 4px;
    color: var(--color-accent);
    text-transform: uppercase;
    font-weight: 700;
    display: block;
    margin-bottom: 4px;
    text-shadow: 0 0 10px rgba(var(--color-accent-rgb), 0.4);
}

/* --- UNIFIED PANEL --- */
.unified-glass-panel {
    display: flex;
    width: 100%;
    max-width: 1200px; /* Constrain width of the panel itself */
    flex: 1;
    min-height: 0; /* Allow scrolling inside if needed */
    background: rgba(15, 15, 15, 0.6); /* Unified darker background */
    backdrop-filter: blur(30px); /* Heavy blur */
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 32px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.4);
    overflow: hidden;
    animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

/* LEFT: Calendar Section */
.calendar-section {
    flex: 3; /* Major focus */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    background: transparent; /* Transparent inside unified panel */
}

/* Vertical Divider */
.panel-divider {
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.1) 80%, transparent);
    margin: 20px 0;
}

/* RIGHT: Recent Section */
.recent-section {
    flex: 1;
    min-width: 300px;
    max-width: 350px;
    display: flex;
    flex-direction: column;
    background: rgba(0,0,0,0.2); /* Slightly darker Right side */
}

.panel-header {
    padding: 24px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.panel-header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.badge {
    background: rgba(255,255,255,0.1);
    color: white;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    border: 1px solid rgba(255,255,255,0.1);
}

.scrollable-grid {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    /* Custom Scrollbar */
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.scrollable-grid::-webkit-scrollbar {
    width: 6px;
}
.scrollable-grid::-webkit-scrollbar-thumb {
    background-color: rgba(255,255,255,0.1);
    border-radius: 3px;
}

/* Cards Grid */
.cards-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.day-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 70px; /* Compact height */
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.day-card:hover {
    transform: translateX(-4px); /* Slide left slightly instead of up */
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--color-accent);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}

.card-content {
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 2;
}

.card-month {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-accent);
    font-weight: 700;
    min-width: 40px;
    margin-bottom: 2px;
}

.card-day {
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1;
    color: white;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.card-footer {
    width: 100%;
    display: flex;
    justify-content: center;
    opacity: 0.3;
    transition: all 0.3s;
    z-index: 2;
}

.day-card:hover .card-footer {
    opacity: 1;
    color: var(--color-accent);
    transform: translateX(4px);
}

.arrow-icon {
    font-size: 1.2rem;
    color: var(--color-accent);
}

.card-glow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, rgba(var(--color-accent-rgb), 0.15), transparent 70%);
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
}

.day-card:hover .card-glow {
    opacity: 1;
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: rgba(255,255,255,0.4);
    grid-column: 1 / -1;
}

@media (max-width: 1024px) {
    .dashboard-container {
        padding: 20px;
        height: auto;
        min-height: 100vh;
        overflow-y: auto;
    }

    .split-content {
        flex-direction: column;
        height: auto;
        max-width: 600px;
    }

    .calendar-section, .recent-section {
        max-width: 100%;
        flex: none;
        height: auto;
    }

    .nav-btn-glass {
        padding: 8px 16px;
    }
}
</style>
