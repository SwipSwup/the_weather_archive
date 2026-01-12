<template>
  <div class="city-detail-page">
    <LoadingSpinner :show="loading" message="Retrieving Weather Archives..." />

    <div v-if="!loading" class="dashboard-container">
      
      <!-- HEADER -->
      <header class="dashboard-header">
           <button @click="onBack" class="nav-btn-glass">
             <span class="material-icons">arrow_back</span>
             <span class="nav-label">Back</span>
           </button>
           <div class="header-text">
             <span class="subtitle-label">{{ cityName }}</span>
             <h1>{{ formattedSelectedDate }}</h1>
           </div>
      </header>

      <!-- UNIFIED GLASS PANEL -->
      <div class="unified-glass-panel" v-if="!error">
          
          <!-- LEFT: Video Section -->
          <div class="video-section">
            <div class="video-container" @mouseenter="showControls = true" @mouseleave="showControls = false">
                
                <div v-if="generatingVideo" class="video-state-overlay">
                    <div class="spinner"></div>
                    <h3>Generating Neural Reconstruction...</h3>
                    <p class="sub-text">Processing {{ weatherData.length }} atmospheric datapoints</p>
                </div>

                <div v-else-if="dailyVideoUrl" class="video-player-wrapper">
                     <video 
                        ref="videoPlayer"
                        :src="dailyVideoUrl" 
                        class="daily-video" 
                        :poster="dailyThumbnailUrl || '/video-placeholder.png'"
                        @timeupdate="updateProgress"
                        @loadedmetadata="onVideoLoaded"
                        @play="playing = true"
                        @pause="playing = false"
                        @ended="playing = false"
                        playsinline
                    >
                        Your browser does not support the video tag.
                    </video>

                    <!-- Holographic Overlay Controls -->
                    <div class="holo-controls" :class="{ 'visible': showControls || !playing }">
                        <div class="play-pause-btn" @click="togglePlay">
                            <span class="material-icons">{{ playing ? 'pause' : 'play_arrow' }}</span>
                        </div>
                        
                        <div class="scrubber-track">
                             <!-- Temperature Trend Graph -->
                             <div class="timeline-graph" v-if="weatherData.length > 2">
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="graphGradient" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.8" />
                                            <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.1" />
                                        </linearGradient>
                                    </defs>
                                    <path :d="temperaturePath" class="graph-fill" />
                                </svg>
                             </div>

                             <input 
                                type="range" 
                                min="0" 
                                :max="weatherData.length - 1" 
                                step="1"
                                v-model.number="currentFrameIndex"
                                @input="scrubToFrame"
                                class="holo-slider"
                            />
                            
                            <!-- Data Point Markers -->
                            <div class="data-markers" v-if="weatherData.length < 200">
                                <div 
                                    v-for="(item, index) in weatherData" 
                                    :key="index" 
                                    class="marker"
                                    :class="{ 'active': index <= currentFrameIndex }"
                                    :style="{ left: (index / (weatherData.length - 1)) * 100 + '%' }"
                                ></div>
                            </div>

                            <div class="progress-fill" :style="{ width: (currentFrameIndex / (weatherData.length - 1)) * 100 + '%' }"></div>
                        </div>

                        <div class="time-readout">
                            <span class="current-frame">F-{{ currentFrameIndex + 1 }}</span>
                            <span class="divider">/</span>
                            <span class="total-frames">{{ weatherData.length }}</span>
                        </div>
                    </div>
                </div>

                <div v-else class="video-state-overlay empty">
                    <div class="empty-layout">
                        <span class="material-icons huge-icon-simple">videocam_off</span>
                        <h3>No Footage</h3>
                        <button class="action-btn-minimal" @click="generateVideo" :disabled="generatingVideo">
                            Generate
                        </button>
                    </div>
                </div>
            </div>
          </div>

          <!-- DIVIDER -->
          <div class="panel-divider"></div>

          <!-- RIGHT: Data Section -->
          <div class="data-section">
            
            <!-- Quick Stats Row -->
            <div class="stats-grid" v-if="stats">
                <div class="stat-item">
                    <span class="stat-label">Avg Temp</span>
                    <span class="stat-value">{{ stats.avgTemp }}<small>°C</small></span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Humidity</span>
                    <span class="stat-value">{{ stats.avgHumidity }}<small>%</small></span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Pressure</span>
                    <span class="stat-value">{{ stats.avgPressure }}<small>hPa</small></span>
                </div>
            </div>

            <div class="charts-area">
                <div v-if="weatherData.length === 0" class="no-data">
                     <span class="material-icons">cloud_off</span>
                     <p>No Atmospheric Data</p>
                </div>
                <WeatherCharts v-else :weather-data="weatherData" />
            </div>

          </div>

      </div>

      <div v-if="error" class="error-panel">
        <span class="material-icons error-icon">error_outline</span>
        <p>{{ error }}</p>
        <button @click="fetchData" class="retry-btn">Retry Connection</button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { WeatherApi } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import WeatherCharts from '@/components/WeatherCharts.vue';

const route = useRoute();
const router = useRouter();
const cityName = computed(() => route.params.cityName as string);
const dateParam = computed(() => route.params.date as string);

const loading = ref(true);
const generatingVideo = ref(false);
const pollInterval = ref<ReturnType<typeof setInterval> | null>(null);
const error = ref<string | null>(null);
const weatherData = ref<any[]>([]);
const dailyVideoUrl = ref<string | null>(null);
const dailyThumbnailUrl = ref<string | null>(null);

// Video Controls
const videoPlayer = ref<HTMLVideoElement | null>(null);
const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const currentFrameIndex = ref(0);
const showControls = ref(false);

const togglePlay = () => {
    if (!videoPlayer.value) return;
    if (videoPlayer.value.paused) {
        videoPlayer.value.play();
    } else {
        videoPlayer.value.pause();
    }
};

const onVideoLoaded = () => {
    if (videoPlayer.value) {
        duration.value = videoPlayer.value.duration;
    }
};

const updateProgress = () => {
    if (!videoPlayer.value) return;
    currentTime.value = videoPlayer.value.currentTime;
    
    // Calculate current frame based on time
    if (duration.value > 0 && weatherData.value.length > 0) {
        const frameDuration = duration.value / weatherData.value.length;
        // avoid index out of bound
        const idx = Math.floor(currentTime.value / frameDuration);
        currentFrameIndex.value = Math.min(idx, weatherData.value.length - 1);
    }
};

const scrubToFrame = () => {
    if (!videoPlayer.value || duration.value === 0) return;
    
    const frameDuration = duration.value / weatherData.value.length;
    // Snap to middle of frame time or start? Start is safer.
    const newTime = currentFrameIndex.value * frameDuration;
    videoPlayer.value.currentTime = newTime;
    currentTime.value = newTime;
};

const onBack = () => {
    router.push(`/city/${cityName.value}`);
};

onMounted(async () => {
  if (!dateParam.value) {
     router.replace(`/city/${cityName.value}`);
     return;
  }
  await fetchData();
});

onUnmounted(() => {
    if (pollInterval.value) clearInterval(pollInterval.value);
});

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  dailyVideoUrl.value = null;
  weatherData.value = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, 800)); // slightly longer aesthetic delay
    const data = await WeatherApi.getWeatherData(cityName.value, dateParam.value, true);
    
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        weatherData.value = data.images || [];
        dailyVideoUrl.value = data.video || null;
        dailyThumbnailUrl.value = data.thumbnail || null;
    } else if (Array.isArray(data)) {
        weatherData.value = data;
    }
  } catch (err: any) {
    error.value = err.message || "Unable to connect to Weather Archive Backend.";
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const formattedSelectedDate = computed(() => {
    return new Date(dateParam.value).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
});

const stats = computed(() => {
    if (weatherData.value.length === 0) return null;
    const totalTemp = weatherData.value.reduce((acc, curr) => acc + (parseFloat(curr.temperature) || 0), 0);
    const totalHum = weatherData.value.reduce((acc, curr) => acc + (parseFloat(curr.humidity) || 0), 0);
    const totalPress = weatherData.value.reduce((acc, curr) => acc + (parseFloat(curr.pressure) || 0), 0);
    return {
        avgTemp: (totalTemp / weatherData.value.length).toFixed(1),
        avgHumidity: (totalHum / weatherData.value.length).toFixed(1),
        avgPressure: (totalPress / weatherData.value.length).toFixed(0)
    };
});

const temperaturePath = computed(() => {
    if (!weatherData.value || weatherData.value.length < 2) return '';

    const temps = weatherData.value.map(d => parseFloat(d.temperature) || 0);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = max - min || 1; 

    // Generate path points
    const points = temps.map((t, i) => {
        const x = (i / (temps.length - 1)) * 100;
        const normalizedY = (t - min) / range;
        // Invert Y because SVG 0 is top
        const y = 100 - (normalizedY * 100); 
        return `${x},${y}`;
    });

    // Close the shape for fill
    return `M0,100 L${points.join(' L')} L100,100 Z`;
});

const generateVideo = async () => {
    generatingVideo.value = true;
    try {
        await WeatherApi.triggerVideoGeneration(dateParam.value);
        startPolling();
    } catch (err: any) {
        console.error("Video trigger failed", err);
        // Reset if failed immediately
        generatingVideo.value = false;
    }
};

const startPolling = () => {
    if (pollInterval.value) return;
    // Check immediately then interval
    pollInterval.value = setInterval(async () => {
        try {
            const data = await WeatherApi.getWeatherData(cityName.value, dateParam.value, true);
            // Check if we have video now
            if (data && ((typeof data === 'object' && !Array.isArray(data) && data.video) || (Array.isArray(data) && false))) {
                 // Update state
                 if (typeof data === 'object' && !Array.isArray(data)) {
                    dailyVideoUrl.value = data.video || null;
                    dailyThumbnailUrl.value = data.thumbnail || null;
                 }
                 
                 if (dailyVideoUrl.value) {
                     generatingVideo.value = false;
                     if (pollInterval.value) {
                        clearInterval(pollInterval.value);
                        pollInterval.value = null;
                     }
                 }
            }
        } catch (e) {
            console.error("Polling check failed", e);
        }
    }, 10000);
};
</script>

<style scoped>
.city-detail-page {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: transparent;
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
}

.dashboard-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    padding: 20px 60px 40px;
    align-items: center;
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

/* --- UNIFIED GLASS PANEL --- */
.unified-glass-panel {
    display: flex;
    width: 100%;
    max-width: 1400px;
    flex: 1;
    min-height: 0;
    background: rgba(15, 15, 15, 0.6);
    backdrop-filter: blur(30px);
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

/* LEFT: Video Section */
.video-section {
    flex: 2.2;
    display: flex;
    flex-direction: column;
    padding: 0; 
    background: black; 
    position: relative;
    border-right: 1px solid rgba(255,255,255,0.1); 
}

.video-container {
    width: 100%;
    height: 100%;
    background: black;
    position: relative;
    overflow: hidden;
    box-shadow: none; 
}

.video-player-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex; 
    align-items: center;
    justify-content: center;
}

.daily-video {
    width: 100%;
    height: 100%;
    object-fit: cover; /* CHANGED to cover per user request to remove black boxes */
}

/* Video Overlay States */
.video-state-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: transparent; /* Changed to transparent for card layout */
    color: white;
    z-index: 10;
    pointer-events: none; /* Let clicks pass through if needed, but card captures them */
}

/* Background for when it's just generating/loading, maybe dim it? */
.video-state-overlay:not(.empty) {
   background: rgba(0,0,0,0.8);
   pointer-events: auto;
}

.video-state-overlay.empty {
    /* No background on full overlay, just the card */
    pointer-events: auto;
}

.empty-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    opacity: 0.7; /* Lowkey opacity */
    transition: opacity 0.3s;
}

.empty-layout:hover {
    opacity: 1;
}

.huge-icon-simple {
    font-size: 2.5rem;
    color: rgba(255,255,255,0.3);
}

.video-state-overlay h3 { 
    font-size: 1rem; 
    margin: 0; 
    font-weight: 500; 
    letter-spacing: 1px; 
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 24px;
    display: block; /* Ensure it renders */
}

@keyframes spin { 
    0% { transform: rotate(0deg); } 
    100% { transform: rotate(360deg); } 
}

.action-btn-minimal {
    background: transparent;
    color: var(--color-accent);
    border: 1px solid rgba(255,255,255,0.2);
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 8px;
}

.action-btn-minimal:hover {
    color: white;
    border-color: white;
    background: rgba(255,255,255,0.05);
}

.action-btn-minimal:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* Holographic Controls */
.holo-controls {
    position: absolute;
    bottom: 30px; 
    left: 50%; 
    transform: translateX(-50%) translateY(20px);
    width: 90%; /* Increased width for better timeline visibility */
    max-width: 800px;
    background: rgba(10, 10, 10, 0.6); 
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 40px; 
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.holo-controls.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

.play-pause-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
}

.play-pause-btn:hover {
    background: white;
    color: black;
}

.scrubber-track {
    flex: 1;
    height: 4px;
    background: rgba(255,255,255,0.15);
    border-radius: 2px;
    position: relative;
    display: flex;
    align-items: center;
}

.holo-slider {
    position: absolute;
    width: 100%;
    height: 30px; 
    opacity: 0; 
    cursor: pointer;
    z-index: 3; /* Must be above markers */
    margin: 0;
}

.progress-fill {
    height: 100%;
    background: var(--color-accent);
    border-radius: 2px;
    position: relative;
    box-shadow: 0 0 15px var(--color-accent);
    z-index: 1;
    pointer-events: none;
}

.progress-fill::after {
    content: '';
    position: absolute;
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    transition: transform 0.2s;
}

.holo-controls:hover .progress-fill::after {
    transform: translateY(-50%) scale(1.2);
}

/* Data Markers on Timeline */
.data-markers {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2; /* Sit ABOVE the progress fill */
}

.marker {
    position: absolute;
    top: 50%;
    width: 3px; /* Slightly thicker */
    height: 8px; 
    background: rgba(255,255,255,0.4);
    border-radius: 1px;
    transform: translate(-50%, -50%);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 0 2px rgba(0,0,0,0.5); /* Shadow for contrast */
}

.marker.active {
    background: #fff; /* White hot center */
    height: 16px; /* Pop out effect */
    box-shadow: 
        0 0 10px var(--color-accent),
        0 0 20px var(--color-accent); /* Double glow */
    z-index: 3;
}

.time-readout {
    font-family: 'JetBrains Mono', monospace; 
    font-size: 0.75rem;
    color: var(--color-accent);
    display: flex;
    gap: 6px;
    white-space: nowrap;
}

.total-frames { color: rgba(255,255,255,0.4); }
.divider { color: rgba(255,255,255,0.2); }

.panel-divider {
    display: none;
}

/* RIGHT: Data Section */
.data-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 30px;
    background: rgba(0,0,0,0.2);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
}

.stat-item {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.stat-item:hover {
    background: rgba(255,255,255,0.06);
    transform: translateY(-2px);
}

.stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255,255,255,0.5);
    margin-bottom: 4px;
}

.stat-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: white;
}

.stat-value small {
    font-size: 0.7em;
    color: var(--color-accent);
    margin-left: 2px;
}

.charts-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.no-data {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.3);
}

.error-panel {
    margin-top: 20px;
    padding: 20px;
    background: rgba(255, 50, 50, 0.1);
    border: 1px solid rgba(255, 50, 50, 0.3);
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 15px;
    color: #ff6b6b;
}

@media (max-width: 1024px) {
    .dashboard-container { padding: 20px; }
    .unified-glass-panel { flex-direction: column; height: auto; overflow: visible; }
    .panel-divider { width: 100%; height: 1px; margin: 0; }
    .video-section { height: 400px; }
    .data-section { height: 500px; }
}
</style>
