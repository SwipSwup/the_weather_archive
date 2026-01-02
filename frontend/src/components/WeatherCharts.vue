<template>
  <div class="weather-charts">
    <div class="charts-scroll-area">
      <div class="chart-wrapper">
        <h3 class="chart-header">Temperature</h3>
        <div class="canvas-container">
            <Line 
                v-if="chartDataTemp"
                :data="chartDataTemp"
                :options="chartOptionsTemp"
            />
        </div>
      </div>
      <div class="chart-wrapper">
        <h3 class="chart-header">Humidity</h3>
        <div class="canvas-container">
            <Line 
                v-if="chartDataHum"
                :data="chartDataHum"
                :options="chartOptionsHum"
            />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const props = defineProps<{
    weatherData: any[]; // Array of { timestamp, temperature, humidity, ... }
}>();

// --- DATA TRANSFORMATION ---
const sortedData = computed(() => {
    // Sort by timestamp just in case
    return [...props.weatherData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
});

const labels = computed(() => {
    return sortedData.value.map(d => new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
});

// --- TEMPERATURE CHART ---
const chartDataTemp = computed(() => {
    return {
        labels: labels.value,
        datasets: [{
            label: 'Temperature (°C)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            pointRadius: 0, 
            pointHoverRadius: 4,
            fill: true,
            tension: 0.4, 
            data: sortedData.value.map(d => parseFloat(d.temperature))
        }]
    };
});

const chartOptionsTemp = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
    },
    scales: {
        x: { display: false }, // Hide X axis labels for cleaner look in small chart
        y: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
    },
    interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
    }
};

// --- HUMIDITY CHART ---
const chartDataHum = computed(() => {
    return {
        labels: labels.value,
        datasets: [{
            label: 'Humidity (%)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.4,
            data: sortedData.value.map(d => parseFloat(d.humidity))
        }]
    };
});

const chartOptionsHum = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
    },
    scales: {
        x: { display: false },
        y: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 100 }
    },
    interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
    }
};
</script>

<style scoped>
.weather-charts {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--color-text-primary);
}

.charts-scroll-area {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-right: 4px; 
}

/* Custom Scrollbar */
.charts-scroll-area::-webkit-scrollbar {
  width: 4px;
}
.charts-scroll-area::-webkit-scrollbar-track {
  background: transparent;
}
.charts-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}
.charts-scroll-area::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.2);
}

.chart-wrapper {
  background: rgba(20, 20, 20, 0.5); /* UNIFIED STYLE matching .video-card */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px;
  height: 48%; /* fit roughly 2 charts in height */
  min-height: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.chart-header {
    margin: 0 0 10px 0;
    font-size: 0.9em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    letter-spacing: 0.5px;
}

.canvas-container {
    flex: 1;
    position: relative;
    width: 100%;
    min-height: 0;
}
</style>
