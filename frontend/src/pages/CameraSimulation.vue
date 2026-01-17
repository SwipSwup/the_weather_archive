<template>
  <div class="simulation-page">
    <div class="glass-container full-width">
      <div class="header">
        <div class="header-left">
            <button @click="router.back()" class="back-btn">← Back</button>
            <div class="title-block">
            <h1>Camera Simulator</h1>
            </div>
        </div>
        <div class="header-right">
             <!-- Global Queue Controls -->
             <div class="queue-status" v-if="queue.length > 0">
                 Queue: {{ queue.length }} Item(s)
             </div>
        </div>
      </div>

      <div class="main-layout">
        <!-- COLUMN 1: CONFIGURATION & STAGING -->
        <div class="staging-column">
            <div class="section-title">
                <h3>1. Configuration</h3>
            </div>
            
            <div class="config-grid">
                 <!-- City Search -->
                 <div class="form-group city-search-group" ref="searchContainer">
                    <label>Location (Europe)</label>
                    <div class="search-wrapper">
                        <input 
                            type="text" 
                            v-model="citySearchQuery"
                            @input="onSearchInput"
                            placeholder="Search European cities..."
                            class="search-input"
                            @focus="onSearchFocus"
                            :class="{ 'valid': selectedCity, 'invalid': hasSearched && cityResults.length === 0 && !isLoadingCities && !selectedCity }"
                        />
                        <div class="status-indicator">
                            <div v-if="isLoadingCities" class="search-spinner"></div>
                            <div v-else-if="selectedCity" class="status-icon success" title="Valid City Selected">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            </div>
                            <div v-else-if="hasSearched && cityResults.length === 0 && !isLoadingCities && citySearchQuery.length >= 2" class="status-icon error" title="No European City Found">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            </div>
                        </div>
                    </div>
                    <!-- Autocomplete Dropdown -->
                    <div v-if="showCityResults" class="search-results custom-scroll">
                         <div v-if="cityResults.length === 0 && !isLoadingCities && hasSearched" class="search-result-item no-results">
                            No results found in Europe
                        </div>
                        <div 
                            v-for="city in cityResults" 
                            :key="city.id" 
                            class="search-result-item"
                            @click="selectCity(city)"
                        >
                            <img 
                                v-if="city.country_code" 
                                :src="`https://flagcdn.com/w40/${city.country_code.toLowerCase()}.png`"
                                class="country-flag-sm"
                                alt="flag"
                            />
                            <div class="result-text">
                                <span class="city-name">{{ city.name }}</span>
                                <span class="city-country">{{ city.country }} <span v-if="city.admin1" class="city-admin">({{ city.admin1 }})</span></span>
                            </div>
                        </div>
                    </div>
                 </div>

                 <!-- Time Configuration -->
                 <div class="form-group">
                    <label>Capture Timestamp</label>
                    <input type="datetime-local" v-model="stagingMetadata.timestamp" class="date-input" />
                 </div>

                 <!-- Video Configuration -->
                 <div class="form-group">
                    <label>Video Frame Count (Spread Evenly)</label>
                    <input type="number" v-model.number="stagingMetadata.videoFrameCount" min="1" max="100" class="date-input" placeholder="e.g. 10" />
                 </div>
            </div>

            <div class="section-title">
                <h3>2. Upload Content</h3>
            </div>

            <!-- Drop Zone -->
             <div 
                class="drop-zone" 
                @dragover.prevent="isDragging = true" 
                @dragleave.prevent="isDragging = false" 
                @drop.prevent="handleDrop"
                :class="{ active: isDragging }"
              >
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,video/*" 
                  ref="fileInput" 
                  class="hidden-input"
                  @change="handleFileSelect" 
                />
                
                
                <div v-if="stagingFiles.length === 0 && !processingVideo" class="upload-prompt" @click="triggerSelect">
                  <div class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <p>Drop files here or click to browse</p>
                </div>

                <div v-else class="preview-area">
                   <div v-if="processingVideo" class="processing-indicator">
                      <div class="spinner"></div>
                      <span>Processing Video Segments...</span>
                   </div>

                   <div class="preview-grid custom-scroll">
                      <div v-for="(file, index) in stagingFiles" :key="index" class="preview-card">
                        <img :src="file.url" class="thumb" />
                        <button @click.stop="removeStagingFile(index)" class="remove-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                      </div>
                   </div>
                </div>
              </div>

              <!-- Staging Actions -->
              <div class="staging-actions">
                  <button 
                    class="action-btn secondary"
                    @click="clearStaging"
                    :disabled="stagingFiles.length === 0"
                  >
                    Clear
                  </button>
                  <button 
                    class="action-btn secondary"
                    @click="directUpload"
                    :disabled="stagingFiles.length === 0 || !selectedCity || processingVideo || isDirectUploading"
                  >
                    {{ isDirectUploading ? 'Uploading...' : 'Direct Upload' }}
                  </button>
                  <button 
                    class="action-btn primary"
                    @click="addToQueue"
                    :disabled="stagingFiles.length === 0 || !selectedCity || processingVideo"
                  >
                    Add to Simulation Queue
                  </button>
              </div>

              <!-- Direct Upload Feedback -->
               <div v-if="isDirectUploading || directUploadResult" class="upload-feedback">
                    <div v-if="isDirectUploading" class="progress-bar-container">
                        <div class="progress-bar-fill" :style="{ width: directUploadProgress + '%' }"></div>
                        <span class="progress-text">{{ directUploadProgress }}%</span>
                    </div>
                    <div v-if="directUploadResult" class="upload-result">
                        {{ directUploadResult }}
                    </div>
               </div>
        </div>

        <!-- COLUMN 2: SIMULATION QUEUE -->
        <div class="queue-column">
             <div class="section-title">
                <h3>3. Simulation Queue</h3>
                <button 
                    v-if="queue.length > 0 && !isQueueRunning" 
                    @click="startQueue" 
                    class="run-queue-btn pulse"
                >
                    ► Run All Steps
                </button>
                 <button 
                    v-if="isQueueRunning" 
                    disabled 
                    class="run-queue-btn running"
                >
                    Running...
                </button>
            </div>

            <div class="queue-list custom-scroll">
                <div v-if="queue.length === 0" class="empty-queue">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    </div>
                    <p>Simulation queue is empty</p>
                    <p class="sub">Add files from staging to start</p>
                </div>

                    <div 
                        v-for="(job, idx) in queue" 
                        :key="job.id" 
                        class="queue-item"
                        :class="job.status"
                    >
                        <div class="job-header">
                            <span class="job-index">#{{ idx + 1 }}</span>
                            <div class="job-meta side-by-side">
                                 <div class="job-title-row">
                                    <img 
                                        v-if="job.metadata.countryCode" 
                                        :src="`https://flagcdn.com/w40/${job.metadata.countryCode.toLowerCase()}.png`"
                                        class="country-flag"
                                        alt="flag"
                                    />
                                    <span class="job-city">{{ job.metadata.city }}</span>
                                    <span class="job-count-badge">{{ job.files.length }} files</span>
                                 </div>
                                <span class="job-time">{{ formatTime(job.metadata.timestamp) }}</span>
                            </div>
                            
                            <div class="job-status-actions">
                                <span v-if="job.status === 'pending'" class="badge pending">Pending</span>
                                <span v-if="job.status === 'running'" class="badge running">Running</span>
                                <span v-if="job.status === 'completed'" class="badge success">Done</span>
                                <span v-if="job.status === 'error'" class="badge error">Failed</span>

                                <button v-if="job.status === 'pending'" @click="removeFromQueue(idx)" class="delete-job-btn" title="Remove">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Result Message -->
                        <div v-if="job.resultMsg" class="job-result-msg">{{ job.resultMsg }}</div>

                        <!-- Progress Bar (Bottom) -->
                        <div v-if="job.status === 'running'" class="job-progress bottom-bar">
                            <div class="progress-track">
                                <div class="progress-fill" :style="{ width: job.progress + '%' }"></div>
                            </div>
                        </div>
                    </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { WeatherApi } from '@/services/api';

const router = useRouter();

// --- Types ---
interface UploadFile {
  file: File;
  name: string;
  url: string;
  timestampOverride?: string;
  offsetMs?: number;
}

interface CityResult {
    id: number;
    name: string;
    country: string;
    country_code: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
}

interface SimulationJob {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    progress: number;
    files: UploadFile[];
    metadata: {
        city: string;
        countryCode: string;
        timestamp: string;
        coords: { lat: number, lon: number };
        deviceId: string;
    };
    resultMsg?: string;
}

// --- State: Staging ---
// --- State: Staging ---
const fileInput = ref<HTMLInputElement|null>(null);
const isDragging = ref(false);
const processingVideo = ref(false);
const isDirectUploading = ref(false);
const directUploadProgress = ref(0);
const directUploadResult = ref<string | null>(null);
const stagingFiles = ref<UploadFile[]>([]);
const stagingMetadata = reactive({
  timestamp: new Date().toISOString().slice(0, 16),
  videoFrameCount: 10
});

// City Search State
const searchContainer = ref<HTMLElement | null>(null);
const citySearchQuery = ref("");
const cityResults = ref<CityResult[]>([]);
const showCityResults = ref(false);
const isLoadingCities = ref(false);
const hasSearched = ref(false);
const selectedCity = ref<CityResult | null>(null);

// --- State: Queue ---
const queue = ref<SimulationJob[]>([]);
const isQueueRunning = ref(false);

// --- Lifecycle & Click Outside ---
const handleClickOutside = (event: MouseEvent) => {
    if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
        showCityResults.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});

// --- Methods: City Search ---
const debouncedCitySearch = (() => {
    let timeout: ReturnType<typeof setTimeout>;
    return (fn: () => void) => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, 500);
    };
})();

const onSearchInput = () => {
    // If user deleted everything, reset
    if (citySearchQuery.value.length === 0) {
        selectedCity.value = null;
        hasSearched.value = false;
        cityResults.value = [];
        showCityResults.value = false;
        isLoadingCities.value = false;
        return;
    }

    // If user is typing, invalidate current selection
    // But don't immediately clear it if they are just correcting a typo? 
    // Actually, usually typing means new search.
    if (selectedCity.value && citySearchQuery.value !== `${selectedCity.value.name}, ${selectedCity.value.country}`) {
        selectedCity.value = null;
    }
    
    isLoadingCities.value = true;
    hasSearched.value = false; // Reset "no results" state while typing
    
    debouncedCitySearch(performCitySearch);
};

const onSearchFocus = () => {
    if (citySearchQuery.value.length >= 2) {
        showCityResults.value = true;
    }
};

const performCitySearch = async () => {
    if (!citySearchQuery.value || citySearchQuery.value.length < 2) {
        cityResults.value = [];
        isLoadingCities.value = false;
        return;
    }
    
    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(citySearchQuery.value)}&count=20&language=en&format=json`
        );
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.results && Array.isArray(data.results)) {
             const europeanTimezones = /^Europe\//;
             // Extended List of European Country Codes
             const euCountries = [
                'AL', 'AD', 'AM', 'AT', 'AZ', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 
                'DK', 'EE', 'FI', 'FR', 'GE', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'KZ', 
                'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 
                'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR', 'UA', 
                'GB', 'VA'
             ]; 
             
             const filtered = data.results.filter((r: any) => {
                 const tz = r.timezone;
                 const cc = r.country_code;
                 
                 if (tz && europeanTimezones.test(tz)) return true;
                 if (cc && euCountries.includes(cc)) return true;
                 
                 // If we have NO timezone and NO country code, keep it (safe fallback)
                 if (!tz && !cc) return true;
                 
                 return false;
             });

             cityResults.value = filtered.map((r: any) => ({
                id: r.id,
                name: r.name,
                country: r.country,
                country_code: r.country_code,
                admin1: r.admin1,
                latitude: r.latitude,
                longitude: r.longitude,
                timezone: r.timezone
            })).slice(0, 10);

        } else {
            cityResults.value = [];
        }
    } catch (e) {
        console.error("City search failed", e);
        cityResults.value = [];
    } finally {
        console.log('Search finished. Results:', cityResults.value.length, 'Show:', showCityResults.value);
        isLoadingCities.value = false;
        hasSearched.value = true;
        showCityResults.value = true;
    }
};

const selectCity = (city: CityResult) => {
    selectedCity.value = city;
    citySearchQuery.value = `${city.name}, ${city.country}`; // Display nice name
    showCityResults.value = false;
    hasSearched.value = false; // Hide "no results" error if it was briefly there
};

// --- Methods: File Handling ---
const triggerSelect = () => fileInput.value?.click();

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files) processFiles(input.files);
};

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (e.dataTransfer?.files) processFiles(e.dataTransfer.files);
};

const processFiles = async (fileList: FileList) => {
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (file.type.startsWith('image/')) {
        stagingFiles.value.push({
            file,
            name: file.name,
            url: URL.createObjectURL(file),
            offsetMs: 0
        });
    } else if (file.type.startsWith('video/')) {
        await extractFrames(file); // Reusing logic
    }
  }
};

const removeStagingFile = (index: number) => {
    stagingFiles.value.splice(index, 1);
};

const clearStaging = () => {
    stagingFiles.value = [];
};

const directUpload = async () => {
    if (!selectedCity.value || stagingFiles.value.length === 0) return;
    
    isDirectUploading.value = true;
    directUploadProgress.value = 0;
    directUploadResult.value = null;
    let successCount = 0;
    let failCount = 0;

    // Distribute timestamps (same logic as queue)
    const filesForJob = [...stagingFiles.value];
    const baseDate = new Date(stagingMetadata.timestamp); // Use exact provided time as base
    const totalFiles = filesForJob.length;
    const DayInMs = 24 * 60 * 60 * 1000;
    const interval = DayInMs / totalFiles; // Note: spreading across 24h might be weird if user wants "burst" but this is requested logic?
    // User asked "frames to be spread evenly" - usually across 24h for "Daily Summary".
    // If it's a video burst, maybe they want it spread across video duration?
    // Wait, "spread evenly across frame count" for video extraction was different.
    // For direct upload of general files, we keep existing logic but fix the base time.
    // If it was video frames, offsetMs is already set correctly by extractFrames!

    for (let i = 0; i < filesForJob.length; i++) {
        const f = filesForJob[i];
        try {
             // Calculate timestamp override
            let offset = 0;
            if (typeof f.offsetMs === 'number' && f.offsetMs > 0) {
                offset = f.offsetMs;
            } else {
                offset = interval * i;
            }
            
            const newTime = new Date(baseDate.getTime() + offset);
            const finalTimestamp = newTime.toISOString();

            const weatherData = await fetchJobWeatherData(
                selectedCity.value.latitude,
                selectedCity.value.longitude,
                finalTimestamp
            );

            await WeatherApi.uploadImage(f.file, {
                city: selectedCity.value.name,
                countryCode: selectedCity.value.country_code,
                deviceId: 'CAM-SIM-DIRECT',
                timestamp: finalTimestamp,
                weather: weatherData
            });
            successCount++;
        } catch (e) {
            console.error(e);
            failCount++;
        }
        
        directUploadProgress.value = Math.round(((i + 1) / filesForJob.length) * 100);
    }

    if (successCount > 0) {
        clearStaging();
        directUploadResult.value = `Success: ${successCount} uploaded.`;
    } else {
        directUploadResult.value = `Failed. Success: ${successCount}, Errors: ${failCount}`;
    }
    
    // Auto-hide result after 3s
    setTimeout(() => {
        isDirectUploading.value = false;
        directUploadResult.value = null;
        directUploadProgress.value = 0;
    }, 3000);
};

// --- Methods: Video Processing (Reused logic) ---
const extractFrames = async (videoFile: File) => {
    processingVideo.value = true;
    let videoUrl = '';
    
    try {
        videoUrl = URL.createObjectURL(videoFile);
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous"; // Sometimes helps with tainting issues

        // Wait for metadata with timeout
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                 reject(new Error("Timeout loading video metadata"));
            }, 10000);

            video.onloadedmetadata = () => {
                clearTimeout(timeout);
                resolve(true);
            };

            video.onerror = (e) => {
                clearTimeout(timeout);
                const err = video.error ? `Code ${video.error.code}: ${video.error.message}` : 'Unknown Error';
                reject(new Error(`Video load error: ${err}`));
            };
        });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context");

        // Set dimensions based on video or default to 1080p if missing
        canvas.width = video.videoWidth || 1920; 
        canvas.height = video.videoHeight || 1080;

        const duration = video.duration;
        if (!isFinite(duration) || duration <= 0) throw new Error("Invalid video duration");

        const count = Math.max(1, stagingMetadata.videoFrameCount); 
        const interval = duration / count;

        console.log(`Extracting ${count} frames from ${duration}s video. Interval: ${interval}s`);

        for (let i = 0; i < count; i++) {
            const t = i * interval;
            if (t >= duration) break;
            
            video.currentTime = t;
            
            // Wait for seek with timeout
            await new Promise((resolve, reject) => {
                 const seekTimeout = setTimeout(() => resolve(false), 2000); // Skip frame if seek takes too long
                 video.onseeked = () => {
                     clearTimeout(seekTimeout);
                     resolve(true);
                 };
                 video.onerror = () => {
                     clearTimeout(seekTimeout);
                     reject(new Error("Error during seeking"));
                 };
            });

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            
            if (blob) {
                const frameFile = new File([blob], `${videoFile.name}_frame_${i+1}.jpg`, { type: 'image/jpeg' });
                stagingFiles.value.push({
                    file: frameFile,
                    name: frameFile.name,
                    url: URL.createObjectURL(frameFile),
                    offsetMs: t * 1000
                });
            }
        }
    } catch (err: any) {
        console.error("Video processing error:", err);
        alert(`Failed to process video: ${err.message || err}`);
    } finally {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        processingVideo.value = false;
    }
};

// --- Methods: Queue Management ---
const addToQueue = () => {
    if (!selectedCity.value) return;
    if (stagingFiles.value.length === 0) return;

    // Distribute timestamps for the job
    const filesForJob = [...stagingFiles.value]; // Shallow copy of array, but objects are safe to share
    
    // Logic from previous code to distribute timestamps
    const baseDate = new Date(stagingMetadata.timestamp); // Use exact provided time logic
    const totalFiles = filesForJob.length;
    const DayInMs = 24 * 60 * 60 * 1000;
    const interval = DayInMs / totalFiles;

    filesForJob.forEach((f, index) => {
          let offset = 0;
          if (typeof f.offsetMs === 'number' && f.offsetMs > 0) {
              offset = f.offsetMs;
          } else {
              offset = interval * index;
          }
          const newTime = new Date(baseDate.getTime() + offset);
          f.timestampOverride = newTime.toISOString();
    });

    const job: SimulationJob = {
        id: crypto.randomUUID(),
        status: 'pending',
        progress: 0,
        files: filesForJob,
        metadata: {
            city: selectedCity.value.name,
            countryCode: selectedCity.value.country_code,
            coords: { 
                lat: selectedCity.value.latitude, 
                lon: selectedCity.value.longitude 
            },
            timestamp: stagingMetadata.timestamp,
            deviceId: 'CAM-SIM-' + Math.floor(Math.random() * 1000) // Auto-generated ID
        }
    };

    queue.value.push(job);
    clearStaging();
};

const removeFromQueue = (index: number) => {
    queue.value.splice(index, 1);
};

const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString();
};

// --- Methods: Execution ---
const fetchJobWeatherData = async (lat: number, lon: number, timestamp: string) => {
     try {
        const dateObj = new Date(timestamp);
        const dateStr = dateObj.toISOString().split('T')[0];
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = (new Date().getTime() - dateObj.getTime()) / msPerDay;

        const baseUrl = diffDays > 5
            ? 'https://archive-api.open-meteo.com/v1/archive'
            : 'https://api.open-meteo.com/v1/forecast';

        const apiUrl = `${baseUrl}?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,relative_humidity_2m,pressure_msl`;

        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Weather API Error");
        
        const data = await res.json();
        const targetIndex = dateObj.getUTCHours();

        if (data.hourly && data.hourly.temperature_2m && data.hourly.temperature_2m[targetIndex] !== undefined) {
             return {
                temp: data.hourly.temperature_2m[targetIndex],
                humidity: data.hourly.relative_humidity_2m[targetIndex],
                pressure: data.hourly.pressure_msl[targetIndex]
            };
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch weather data", e);
        return null;
    }
};

const startQueue = async () => {
    if (isQueueRunning.value) return;
    isQueueRunning.value = true;

    for (const job of queue.value) {
        if (job.status === 'completed') continue;
        
        job.status = 'running';
        job.progress = 0;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < job.files.length; i++) {
            const f = job.files[i];
            try {
                const finalTimestamp = f.timestampOverride || job.metadata.timestamp;
                const weatherData = await fetchJobWeatherData(
                    job.metadata.coords.lat,
                    job.metadata.coords.lon,
                    finalTimestamp
                );

                await WeatherApi.uploadImage(f.file, {
                    city: job.metadata.city,
                    countryCode: job.metadata.countryCode,
                    deviceId: job.metadata.deviceId,
                    timestamp: finalTimestamp,
                    weather: weatherData
                });
                successCount++;
            } catch (e) {
                console.error(e);
                failCount++;
            }
            
            job.progress = ((i + 1) / job.files.length) * 100;
        }

        if (failCount === 0) {
            job.status = 'completed';
            job.resultMsg = `Uploaded ${successCount} files.`;
        } else {
            job.status = 'error';
            job.resultMsg = `Failed: ${failCount}/${job.files.length}`;
        }
    }

    isQueueRunning.value = false;
};

</script>

<style scoped>
/* Define variables locally if missing, though typically they are global. */
.simulation-page {
  /* Using global variables to match rest of app */
  min-height: 100vh;
  padding: 20px;
  background: radial-gradient(circle at top right, #1a2a3a, #0a0a0a);
  color: white;
  font-family: 'Inter', sans-serif;
}

.glass-container {
  position: relative; /* Ensure stacking context */
  z-index: 10;
  background: rgba(20, 20, 20, 0.6);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Full Width Utility */
.glass-container.full-width {
    width: 100%;
    max-width: none;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    padding-bottom: 20px;
}
.header-left { display: flex; align-items: center; gap: 20px; }
.title-block h1 { margin: 0; font-size: 1.8em; font-weight: 300; letter-spacing: -0.5px; }
.back-btn {
    background: rgba(255,255,255,0.05);
    border: none;
    color: rgba(255,255,255,0.7);
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
}
.back-btn:hover { background: rgba(255,255,255,0.1); color: white; }

.main-layout {
    display: grid;
    grid-template-columns: 350px 1fr 400px;
    gap: 30px;
    height: calc(100vh - 150px);
}

/* Staging Column (Merged Config + Dropzone for smoother flow, actually let's split Config and Dropzone if space permits, 
but 3 columns is tight. Let's do 2 Columns: Staging (Config+Files) | Queue) */
.main-layout {
    grid-template-columns: 1fr 400px;
}

.staging-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
    border-right: 1px solid rgba(255,255,255,0.05);
    padding-right: 20px;
    /* Fix Overflow */
    flex: 1;
    overflow: hidden;
}

.drop-zone {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}


.queue-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* Hide default file input */
.hidden-input {
    display: none;
}

.section-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    padding-bottom: 10px;
    margin-bottom: 10px;
}
.section-title h3 { margin: 0; color: var(--color-accent); font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }

/* Config Grid */
.config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.form-group label { display: block; font-size: 0.8em; margin-bottom: 5px; color: rgba(255,255,255,0.5); }
.form-group input { 
    width: 100%; 
    background: rgba(0,0,0,0.3); 
    border: 1px solid rgba(255,255,255,0.1); 
    color: white; 
    padding: 10px; 
    border-radius: 6px; 
}
.form-group input:focus { outline: 1px solid var(--color-accent); background: rgba(0,0,0,0.5); }

/* City Search Specifics */
.city-search-group {
    position: relative;
    z-index: 1001; /* Ensure it floats above the dropzone and other elements */
}

.search-wrapper { position: relative; }
.search-results {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    width: 100%;
    background: rgba(25, 25, 25, 0.95);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    z-index: 9999; /* Ensure it floats above everything */
    max-height: 250px;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.search-result-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    transition: background 0.2s;
    display: flex;
    align-items: center;
    gap: 12px;
}
.search-result-item:last-child { border-bottom: none; }
.search-result-item:hover { background: rgba(255,255,255,0.1); }
.country-flag-sm { width: 20px; height: 15px; border-radius: 2px; object-fit: cover; opacity: 0.9; }
.result-text { display: flex; flex-direction: column; }
.city-name { font-weight: 500; display: block; color: white; }
.city-country { font-size: 0.8em; opacity: 0.6; display: block; margin-top: 2px; }
.city-admin { opacity: 0.7; }

.search-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

/* Date Input Styling */
.date-input {
    color-scheme: dark;
    font-family: inherit;
    font-size: 0.9em;
    height: 42px; /* Fixed height to match search */
    box-sizing: border-box; /* Ensure padding doesn't add to height */
    line-height: normal;
}
.date-input::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
    filter: invert(1); /* Ensure icon is white in dark mode */
}
.date-input::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
}

/* Ensure Search Input matches Date Input */
.search-input {
    height: 42px; /* Explicit match */
    padding: 10px;
    box-sizing: border-box;
}
.status-indicator {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}
.status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
}
.status-icon.success { color: var(--color-success); filter: drop-shadow(0 0 5px rgba(40,167,69,0.4)); }
.status-icon.error { color: #ff4444; filter: drop-shadow(0 0 5px rgba(255,68,68,0.4)); }

.selected-city-badge {
    margin-top: 5px;
    font-size: 0.75em;
    color: var(--color-success);
    background: rgba(40, 167, 69, 0.15);
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
}

/* Drop Zone */
.drop-zone {
    flex: 1;
    border: 2px dashed rgba(255,255,255,0.1);
    border-radius: 12px;
    background: rgba(0,0,0,0.2);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.drop-zone.active { border-color: var(--color-accent); background: rgba(50,50,50,0.3); }

.upload-prompt {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.3);
    cursor: pointer;
}
.upload-prompt:hover { color: white; }
.upload-prompt .icon { font-size: 3em; margin-bottom: 10px; }

.preview-area {
    flex: 1;
    overflow-y: auto;
    padding-right: 5px; /* Space for scrollbar */
}
.preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    gap: 10px;
    overflow-y: auto;
}
.preview-card {
    position: relative;
    aspect-ratio: 16/9;
}
.preview-card img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.preview-card:hover .remove-btn {
    opacity: 1;
}

.remove-btn {
    position: absolute;
    top: 5px; 
    right: 5px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 4px; /* Square with slight radius looks better for specific tool icons */
    width: 24px; 
    height: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);
}
.remove-btn:hover {
    background: #ff4444;
    border-color: #ff4444;
}

.processing-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    padding: 10px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
}

/* Staging Actions */
.staging-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 10px;
}
.action-btn {
    padding: 10px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
}
.action-btn.secondary { background: rgba(255,255,255,0.1); color: white; }
.action-btn.primary { background: var(--color-accent); color: white; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Queue List */
.queue-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
/* Empty Queue State */
.empty-queue {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.3);
    min-height: 200px;
}
.empty-queue .icon { margin-bottom: 15px; opacity: 0.5; }
.empty-queue p { margin: 0; font-weight: 500; }
.empty-queue .sub { font-size: 0.8em; margin-top: 5px; opacity: 0.7; }

.queue-item {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 8px;
    padding: 10px 12px; /* Reduced padding */
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
}
.queue-item.running { border-color: var(--color-accent); box-shadow: 0 0 15px rgba(0,0,0,0.2); }
.queue-item.completed { border-color: var(--color-success); opacity: 0.7; }
.queue-item.error { border-color: var(--color-error); }

.job-header { display: flex; align-items: center; gap: 12px; margin-bottom: 0; }
.job-index { font-weight: bold; color: rgba(255,255,255,0.2); font-size: 0.9em; min-width: 25px; }

.job-meta.side-by-side { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
.job-title-row { display: flex; align-items: center; gap: 8px; }

.country-flag { width: 20px; height: 15px; border-radius: 2px; object-fit: cover; opacity: 0.9; }
.job-city { font-weight: 600; font-size: 1em; color: white; }
.job-count-badge { 
    background: rgba(255,255,255,0.1); 
    padding: 1px 6px; 
    border-radius: 10px; 
    font-size: 0.7em; 
    color: rgba(255,255,255,0.7); 
}

.job-time { font-size: 0.75em; color: rgba(255,255,255,0.5); }

.job-status-actions { display: flex; align-items: center; gap: 10px; }

.badge { font-size: 0.65em; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;}
.badge.pending { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
.badge.running { background: var(--color-accent); color: white; }
.badge.success { background: rgba(40, 167, 69, 0.2); color: var(--color-success); border: 1px solid rgba(40, 167, 69, 0.3); }
.badge.error { background: rgba(255, 68, 68, 0.2); color: #ff4444; border: 1px solid rgba(255, 68, 68, 0.3); }

.delete-job-btn { 
    background: transparent; 
    border: none; 
    cursor: pointer; 
    color: rgba(255,255,255,0.3); 
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}
.delete-job-btn:hover { color: #ff4444; background: rgba(255, 68, 68, 0.1); }

.job-progress.compact { margin-top: 8px; height: 2px; }
.job-progress.compact .progress-track { height: 2px; }

.job-progress.bottom-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    margin: 0;
    height: 4px;
    z-index: 5;
}
.job-progress.bottom-bar .progress-track {
    background: transparent;
    border-radius: 0;
    height: 100%;
}
.job-progress.bottom-bar .progress-fill {
    background-color: var(--color-accent);
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 0;
    box-shadow: 0 0 10px var(--color-accent);
}

.job-result-msg { font-size: 0.75em; margin-top: 4px; color: rgba(255,255,255,0.5); font-style: italic; }

.run-queue-btn {
    background: var(--color-success);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
}
.run-queue-btn.pulse { animation: pulse 2s infinite; }
.run-queue-btn.running { background: #444; cursor: default; animation: none; }

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.8; } 100% { opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }

/* Scrollbars */
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

.staging-actions {
    display: flex;
    gap: 10px;
    padding-top: 10px; /* Separate from scrolling area */
}

.upload-feedback {
    margin-top: 10px;
    background: rgba(0,0,0,0.3);
    padding: 10px;
    border-radius: 8px;
}

.progress-bar-container {
    height: 8px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    margin-bottom: 5px;
}

.progress-bar-fill {
    height: 100%;
    background: var(--color-accent, #00f2ff);
    transition: width 0.2s ease;
}

.progress-text {
    position: absolute;
    right: 0;
    top: -15px;
    font-size: 0.7em;
    color: rgba(255,255,255,0.6);
}

.upload-result {
    font-size: 0.9em;
    color: #4ade80;
    text-align: center;
}
</style>
