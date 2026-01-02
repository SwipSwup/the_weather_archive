<template>
  <div class="city-overview-page">
    <LoadingSpinner :show="loading" message="Loading Available Archives..." />

    <div v-if="!loading" class="content-container">
      <div class="header-panel">
        <button @click="router.push('/')" class="nav-btn">
          <span class="material-icons">arrow_back</span> Home
        </button>
        <div class="header-content">
          <h1>{{ formatCityName(cityName) }} - Archives</h1>
          <p class="subtitle">Select a date to view detailed weather history and videos.</p>
        </div>
      </div>

      <!-- Date Selection -->
      <div class="selection-panel">
        <div class="date-picker-section">
            <label>Select Specific Date:</label>
            <input 
                type="date" 
                v-model="selectedDateInput"
                :min="minDate"
                :max="maxDate"
                @change="handleDateSelect"
                class="date-input"
            />
            <p class="hint">Only dates with available footage are valid.</p>
        </div>
      </div>

      <!-- Newest Days List -->
      <div class="recent-days-section">
        <h2>Recent Captures</h2>
        <div v-if="availableDates.length === 0" class="empty-state">
            No archives found for this city.
        </div>
        <div v-else class="days-grid">
            <div 
                v-for="date in availableDates.slice(0, 6)" 
                :key="date" 
                class="day-card"
                @click="goToDate(date)"
            >
                <div class="date-display">
                    <span class="day">{{ getDay(date) }}</span>
                    <span class="month">{{ getMonth(date) }}</span>
                    <span class="year">{{ getYear(date) }}</span>
                </div>
                <div class="action-arrow">→</div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { WeatherApi } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const route = useRoute();
const router = useRouter();
const cityName = computed(() => route.params.cityName as string);

const loading = ref(true);
const availableDates = ref<string[]>([]);
const selectedDateInput = ref('');

// Computed bounds for date picker
const minDate = computed(() => availableDates.value.length > 0 ? availableDates.value[availableDates.value.length - 1] : undefined);
const maxDate = computed(() => availableDates.value.length > 0 ? availableDates.value[0] : undefined);

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

const handleDateSelect = () => {
    if (selectedDateInput.value) {
        // Validate if date is in available list? 
        // User said "only be able to select dates from where i actualy have footage"
        // The constraints min/max help, but gaps inside are possible.
        // We can check if `availableDates` includes it.
        if (availableDates.value.includes(selectedDateInput.value)) {
            goToDate(selectedDateInput.value);
        } else {
            alert("No footage available for this date.");
            selectedDateInput.value = '';
        }
    }
}

const goToDate = (date: string) => {
    router.push(`/city/${cityName.value}/${date}`);
};

const formatCityName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

const getDay = (dateStr: string) => new Date(dateStr).getDate();
const getMonth = (dateStr: string) => new Date(dateStr).toLocaleDateString(undefined, { month: 'short' });
const getYear = (dateStr: string) => new Date(dateStr).getFullYear();

</script>

<style scoped>
.city-overview-page {
  min-height: 100vh;
  padding: var(--spacing-xl) var(--spacing-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-text-primary);
}

.content-container {
  width: 100%;
  max-width: 1000px;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.header-panel {
    margin-bottom: 40px;
}

.nav-btn {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    padding: 10px 20px;
    border-radius: 24px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    transition: all 0.2s;
    font-weight: 500;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.nav-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateX(-2px);
    border-color: var(--color-accent);
}

.header-content h1 {
    font-size: 3em;
    margin: 0 0 10px 0;
    background: linear-gradient(90deg, #fff, #ccc);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.subtitle {
    color: var(--color-text-secondary);
    font-size: 1.2em;
}

.selection-panel {
    background: rgba(20, 20, 20, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 20px;
    padding: 32px;
    margin-bottom: 40px;
    display: flex;
    justify-content: center;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

.date-picker-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 350px;
}

.date-input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255,255,255,0.15);
    color: white;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 1.1em;
    font-family: 'Outfit', sans-serif;
    transition: all 0.3s;
    outline: none;
    color-scheme: dark; /* Ensures native calendar popup is dark */
}

.date-input:focus {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.2);
}

.hint {
    font-size: 0.85em;
    color: var(--color-text-secondary);
    text-align: center;
    opacity: 0.8;
}

.recent-days-section h2 {
    font-size: 1.8em;
    margin-bottom: 24px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 10px;
}

.days-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
}

.day-card {
    background: rgba(20, 20, 20, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 24px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.day-card:hover {
    background: rgba(30, 30, 30, 0.8);
    transform: translateY(-4px);
    border-color: var(--color-accent);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.date-display {
    display: flex;
    flex-direction: column;
}

.day {
    font-size: 2.5em;
    font-weight: 700;
    line-height: 1;
}

.month {
    font-size: 1.2em;
    color: var(--color-accent);
    text-transform: uppercase;
    font-weight: 600;
}

.year {
    color: var(--color-text-secondary);
    font-size: 0.9em;
}

.action-arrow {
    font-size: 1.5em;
    opacity: 0.5;
    transition: transform 0.2s;
}

.day-card:hover .action-arrow {
    transform: translateX(5px);
    opacity: 1;
    color: var(--color-accent);
}
</style>
