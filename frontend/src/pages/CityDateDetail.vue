<template>
  <div class="city-detail-page">
    <LoadingSpinner :show="loading" message="Retrieving Weather Archives..." />

    
    <div v-if="!loading" class="content-container">
      <!-- HEADER -->
      <div class="header-panel">
        <div class="header-left">
          <button @click="onBack" class="nav-btn icon-only" title="Back">
            <span class="material-icons">arrow_back</span>
          </button>
          <div class="title-group">
            <div class="city-badge">{{ cityName }}</div>
            <h1>{{ formattedSelectedDate }}</h1>
          </div>
        </div>

        <div v-if="stats" class="stats-row">
            <div class="stat-pill">
                <span class="stat-label">Avg Temp</span>
                <span class="stat-value">{{ stats.avgTemp }}°C</span>
            </div>
            <div class="stat-pill">
                <span class="stat-label">Humidity</span>
                <span class="stat-value">{{ stats.avgHumidity }}%</span>
            </div>
            <div class="stat-pill">
                <span class="stat-label">Avg Pressure</span>
                <span class="stat-value">{{ stats.avgPressure }} hPa</span>
            </div>
            <div class="stat-pill">
                <span class="stat-label">Datapoints</span>
                <span class="stat-value">{{ weatherData.length }}</span>
            </div>
        </div>
      </div>

      <div v-if="error" class="error-panel">
        <span class="material-icons error-icon">error_outline</span>
        <p>{{ error }}</p>
        <button @click="fetchData" class="retry-btn">Retry Connection</button>
      </div>

      <!-- MAIN CONTENT SPLIT -->
      <div class="dashboard-layout" v-if="!error">
        
        <!-- LEFT PANEL: Video & Meta -->
        <div class="left-panel">
            <div class="video-card">
                <h2>Daily Timelapse</h2>
                
                <div v-if="generatingVideo" class="video-loading-state">
                    <div class="spinner"></div>
                    <p>Generating Timelapse...</p>
                    <span class="sub-text">This may take 1-2 minutes</span>
                </div>

                <div v-else-if="dailyVideoUrl" class="video-wrapper" @mouseenter="showControls = true" @mouseleave="showControls = false">
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
                    
                    <!-- Custom Controls Overlay -->
                    <div class="custom-controls" :class="{ 'visible': showControls || !playing }">
                        <button class="play-btn" @click="togglePlay">
                            <span class="material-icons">{{ playing ? 'pause' : 'play_arrow' }}</span>
                        </button>
                        
                        <div class="scrubber-container">
                            <input 
                                type="range" 
                                min="0" 
                                :max="weatherData.length - 1" 
                                step="1"
                                v-model.number="currentFrameIndex"
                                @input="scrubToFrame"
                                class="scrubber"
                            />
                            <div class="frame-markers" v-if="weatherData.length < 150">
                                <div v-for="n in weatherData.length" :key="n" class="marker"></div>
                            </div>
                        </div>

                        <div class="time-display">
                            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                            <span class="frame-counter">[{{ currentFrameIndex + 1 }}/{{ weatherData.length }}]</span>
                        </div>
                    </div>
                </div>

                <div v-else class="no-video-state">
                    <div class="material-icons no-video-icon">videocam_off</div>
                    <p>No video generated for this date yet.</p>
                    <button class="generate-btn" @click="generateVideo" :disabled="generatingVideo">
                        {{ generatingVideo ? 'Starting Generation...' : 'Generate Video Now' }}
                    </button>
                </div>


            </div>
        </div>

        <!-- RIGHT PANEL: Charts -->
        <div class="right-panel">
            <div v-if="weatherData.length === 0 && !dailyVideoUrl" class="empty-state">
                <span class="material-icons empty-icon">cloud_off</span>
                <h3>No Data Found</h3>
                <p>We couldn't find any weather archives for this date.</p>
                <button @click="fetchData" class="action-btn">Refresh</button>
            </div>

            <div v-else class="charts-container">
                <WeatherCharts :weather-data="weatherData" />
            </div>
        </div>

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

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    await new Promise(resolve => setTimeout(resolve, 600)); // aesthetic delay
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
    return new Date(dateParam.value).toLocaleDateString(undefined, { dateStyle: 'medium' });
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
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  background: transparent;
  color: var(--color-text-primary);
}

.content-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- HEADER --- */
.header-panel {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(20, 20, 20, 0.4); 
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 12px 24px;
  margin-bottom: 24px; /* Increased margin */
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-btn.icon-only {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.title-group h1 {
  font-size: 1.5em;
  margin: 0;
  line-height: 1;
}

.city-badge {
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-accent);
  font-weight: 700;
  margin-bottom: 2px;
}

.stats-row {
  display: flex;
  gap: 12px;
}

.stat-pill {
  background: rgba(0,0,0,0.3);
  padding: 6px 16px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid rgba(255,255,255,0.05);
}

.stat-label {
  font-size: 0.65em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 1.1em;
  font-weight: 600;
  line-height: 1.2;
}

/* --- MAIN DASHBOARD LAYOUT --- */
.dashboard-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 24px; /* Consistent gap */
}

/* LEFT PANEL (Video) */
.left-panel {
  flex: 2.5; /* Takes up ~70% of space */
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.video-card {
  background: rgba(20, 20, 20, 0.5); /* UNIFIED STYLE */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.video-card h2 {
    margin: 0;
    font-size: 1.4em;
    color: var(--color-text-primary);
    font-weight: 600;
}

.video-wrapper {
  width: 100%;
  flex: 1;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.daily-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-info {
  margin: 0;
  font-size: 0.9em;
  color: var(--color-text-secondary);
  text-align: center;
}

/* RIGHT PANEL (Charts) */
.right-panel {
  flex: 1; /* Takes up ~30% of space */
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.charts-container {
    flex: 1;
    min-height: 0;
}

/* Empty & Error States */
.error-panel, .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(30,30,30,0.4);
    border-radius: 16px;
    border: 1px dashed rgba(255,255,255,0.1);
}

.error-panel { color: var(--color-error); border-color: var(--color-error); }
.empty-icon { font-size: 3em; opacity: 0.3; margin-bottom: 10px; }
.action-btn {
    margin-top: 15px;
    background: var(--color-accent);
    color: black;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
}

/* Custom Controls */
.custom-controls {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
    padding: 20px 20px 10px;
    display: flex;
    align-items: center;
    gap: 15px;
    opacity: 0;
    transition: opacity 0.3s;
}

.custom-controls.visible { opacity: 1; }

.play-btn {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    display: flex;
}

.play-btn .material-icons { font-size: 2em; }

.scrubber-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    height: 30px;
}

.scrubber {
    width: 100%;
    cursor: pointer;
    accent-color: var(--color-accent);
    background: transparent;
    z-index: 2;
}

.no-video-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.3);
    border-radius: 12px;
    padding: 40px;
    gap: 15px;
    text-align: center;
}

.no-video-icon {
    font-size: 3em;
    opacity: 0.5;
}

.generate-btn {
    background: var(--color-accent);
    color: black;
    border: none;
    padding: 10px 24px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.generate-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(64, 196, 255, 0.4);
}

.generate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.frame-markers {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    pointer-events: none;
    padding: 0 4px; /* Align with slider thumb approx */
}

.marker {
    width: 4px;
    height: 4px;
    background: rgba(255,255,255,0.5);
    border-radius: 50%;
    transform: translateY(-50%);
    box-shadow: 0 0 2px rgba(0,0,0,0.5);
}

.time-display {
    font-size: 0.8em;
    font-family: monospace;
    color: rgba(255,255,255,0.8);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.frame-counter {
    font-size: 0.7em;
    color: var(--color-accent);
}

.video-loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.3);
    border-radius: 12px;
    padding: 40px;
    gap: 15px;
    color: white;
}
.video-loading-state .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
.video-loading-state .sub-text {
    font-size: 0.8em;
    color: rgba(255,255,255,0.5);
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
