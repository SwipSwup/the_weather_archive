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
      <div class="chart-wrapper">
        <h3 class="chart-header">Air Pressure</h3>
        <div class="canvas-container">
            <Line 
                v-if="chartDataPress"
                :data="chartDataPress"
                :options="chartOptionsPress"
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

// --- GRADIENT HELPERS ---
const getScaleGradient = (context: any, minVal: number, maxVal: number, stops: { pos: number, color: string }[]) => {
    try {
        const chart = context.chart;
        const { ctx, scales } = chart;
        
        // Safety check: if scales not ready, return transparent or first color
        if (!scales || !scales.y) {
            return stops[0]?.color || 'transparent';
        }

        const yScale = scales.y;

        // Get pixel positions for the fixed min/max values
        const minPixel = yScale.getPixelForValue(minVal);
        const maxPixel = yScale.getPixelForValue(maxVal);

        // Safety check for valid pixels
        if (!isFinite(minPixel) || !isFinite(maxPixel)) {
             return stops[0]?.color || 'transparent';
        }

        // Create gradient from Min to Max pixel positions
        const gradient = ctx.createLinearGradient(0, minPixel, 0, maxPixel);

        stops.forEach(stop => {
            gradient.addColorStop(stop.pos, stop.color);
        });

        return gradient;
    } catch (e) {
        console.warn('Gradient generation failed:', e);
        return stops[0]?.color || 'transparent';
    }
};

// --- TEMPERATURE CHART ---
// Range: -10°C (Deep Blue) to 35°C (Red)
const tempStops = [
    { pos: 0, color: 'rgba(0, 0, 255, 1)' },       // -10°C: Blue
    { pos: 0.4, color: 'rgba(0, 255, 255, 1)' },   // 8°C: Cyan
    { pos: 0.6, color: 'rgba(255, 255, 0, 1)' },   // 17°C: Yellow
    { pos: 1, color: 'rgba(255, 0, 0, 1)' }        // 35°C: Red
];
// For fill, same colors but lower opacity
const tempFillStops = tempStops.map(s => ({ ...s, color: s.color.replace(', 1)', ', 0.2)') }));

const chartDataTemp = computed(() => {
    return {
        labels: labels.value,
        datasets: [{
            label: 'Temperature (°C)',
            backgroundColor: (ctx: any) => getScaleGradient(ctx, -10, 35, tempFillStops),
            borderColor: (ctx: any) => getScaleGradient(ctx, -10, 35, tempStops),
            pointBackgroundColor: (ctx: any) => getScaleGradient(ctx, -10, 35, tempStops),
            borderWidth: 3,
            pointRadius: 3, 
            pointHoverRadius: 6,
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
        tooltip: { mode: 'index' as const, intersect: false }
    },
    scales: {
        x: { display: false },
        y: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false }
};

// --- HUMIDITY CHART ---
// Range: 0% (Gray/Blue) to 100% (Deep Blue)
const humStops = [
    { pos: 0, color: 'rgba(200, 200, 255, 1)' }, // 0%: Pale
    { pos: 1, color: 'rgba(0, 50, 255, 1)' }     // 100%: Deep Blue
];
const humFillStops = humStops.map(s => ({ ...s, color: s.color.replace(', 1)', ', 0.2)') }));

const chartDataHum = computed(() => {
    return {
        labels: labels.value,
        datasets: [{
            label: 'Humidity (%)',
            backgroundColor: (ctx: any) => getScaleGradient(ctx, 0, 100, humFillStops),
            borderColor: (ctx: any) => getScaleGradient(ctx, 0, 100, humStops),
            pointBackgroundColor: (ctx: any) => getScaleGradient(ctx, 0, 100, humStops),
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 6,
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
        tooltip: { mode: 'index' as const, intersect: false }
    },
    scales: {
        x: { display: false },
        y: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 100 }
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false }
};

// --- PRESSURE CHART ---
// Range: 980 (Storm/Purple) to 1040 (Calm/Green)
const pressStops = [
    { pos: 0, color: 'rgba(138, 43, 226, 1)' },   // 980: Low/Stormy (BlueViolet)
    { pos: 0.5, color: 'rgba(0, 255, 255, 1)' },  // 1010: Avg (Cyan)
    { pos: 1, color: 'rgba(50, 205, 50, 1)' }     // 1040: High/Nice (LimeGreen)
];
const pressFillStops = pressStops.map(s => ({ ...s, color: s.color.replace(', 1)', ', 0.2)') }));

const chartDataPress = computed(() => {
    return {
        labels: labels.value,
        datasets: [{
            label: 'Pressure (hPa)',
            backgroundColor: (ctx: any) => getScaleGradient(ctx, 980, 1040, pressFillStops),
            borderColor: (ctx: any) => getScaleGradient(ctx, 980, 1040, pressStops),
            pointBackgroundColor: (ctx: any) => getScaleGradient(ctx, 980, 1040, pressStops),
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4,
            data: sortedData.value.map(d => parseFloat(d.pressure))
        }]
    };
});

const chartOptionsPress = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { mode: 'index' as const, intersect: false }
    },
    scales: {
        x: { display: false },
        y: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false }
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
  /* Removed overflow-y: auto to disable scroll */
  display: flex;
  flex-direction: column;
  gap: 16px; /* Slightly reduced gap */
  padding-right: 0; 
  overflow: hidden; /* Prevent spillover */
}

/* Custom Scrollbar - removed as no longer scrolling */
.charts-scroll-area::-webkit-scrollbar {
  width: 0;
}

.chart-wrapper {
  background: rgba(20, 20, 20, 0.5); 
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 15px; /* Reduced padding slightly */
  /* changed from fixed height % to flex: 1 to share space equally */
  flex: 1; 
  min-height: 0; /* important for flex items to shrink below content size */
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
