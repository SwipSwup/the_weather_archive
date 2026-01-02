<template>
  <div class="simulation-page">
    <div class="glass-container">
      <div class="header">
        <button @click="router.back()" class="back-btn">← Cancel</button>
        <div class="title-block">
          <h1>Camera Simulation</h1>
          <p>Manual ingestion of weather captures to cloud infrastructure.</p>
        </div>
      </div>

      <div class="wizard-layout">
        <!-- Sidebar: Configuration -->
        <div class="config-sidebar">
          <h3>Metadata Configuration</h3>
          
          <div class="form-group">
            <label>Device ID</label>
            <input type="text" v-model="metadata.deviceId" placeholder="CAM-01-V" />
          </div>

          <div class="form-group">
            <label>Location</label>
            <select v-model="metadata.city">
              <option value="vienna">Vienna</option>
              <option value="berlin">Berlin</option>
              <option value="paris">Paris</option>
              <option value="london">London</option>
              <option value="rome">Rome</option>
              <option value="amsterdam">Amsterdam</option>
              <option value="madrid">Madrid</option>
            </select>
          </div>

          <div class="form-group">
            <label>Capture Timestamp</label>
            <input type="datetime-local" v-model="metadata.timestamp" class="date-input" />
            <span class="help-text">Leave default for "Now"</span>
          </div>

          <div class="info-box">
            <h4>Simulation Mode</h4>
            <p>Uploads are processed asynchronously. Support for Images (JPG/PNG) and Video (MP4) splitting.</p>
          </div>
        </div>

        <!-- Main Area: Upload -->
        <div class="upload-main">
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
            
            <div v-if="files.length === 0 && !processingVideo" class="upload-prompt" @click="triggerSelect">
              <div class="icon">📷 / 🎥</div>
              <h3>Drag captures here</h3>
              <p>Images or Video (Auto-split)</p>
            </div>

            <div v-else class="preview-grid">
               <!-- Video Processing State -->
              <div v-if="processingVideo" class="processing-overlay">
                  <div class="spinner"></div>
                  <p>Extracting frames from video...</p>
              </div>

              <div v-for="(file, index) in files" :key="index" class="preview-card" :class="{ uploaded: file.uploaded, error: file.error }">
                <img :src="file.url" class="thumb" />
                <div class="overlay">
                  <span class="name">{{ file.name }}</span>
                  <button v-if="!file.uploaded" @click.stop="removeFile(index)" class="remove">×</button>
                  <span v-if="file.uploaded" class="status-icon">✅</span>
                  <span v-if="file.error" class="status-icon">❌</span>
                </div>
                <div v-if="file.uploading" class="progress-bar"></div>
              </div>
              <div class="add-more" @click="triggerSelect" v-if="!uploading && !processingVideo">+</div>
            </div>
          </div>

          <div class="actions">
            <div class="status-bar" v-if="status">
               <span :class="['indicator', status.type]"></span>
               {{ status.message }}
            </div>
            <button 
              class="upload-btn" 
              :disabled="files.length === 0 || uploading || processingVideo"
              @click="startUpload"
            >
              <span v-if="uploading">UPLOADING...</span>
              <span v-else>INITIATE UPLOAD ({{ files.length }})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { WeatherApi } from '@/services/api';

const router = useRouter();
const fileInput = ref<HTMLInputElement|null>(null);
const isDragging = ref(false);
const uploading = ref(false);
const processingVideo = ref(false);

interface UploadFile {
  file: File;
  name: string;
  url: string;
  uploading?: boolean;
  uploaded?: boolean;
  error?: boolean;
  timestampOverride?: string;
  offsetMs?: number;
}

const files = ref<UploadFile[]>([]);
const status = ref<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

const metadata = reactive({
  deviceId: 'CAM-SIM-01',
  city: 'vienna',
  timestamp: new Date().toISOString().slice(0, 16)
});

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
        files.value.push({
            file,
            name: file.name,
            url: URL.createObjectURL(file),
            offsetMs: 0
        });
    } else if (file.type.startsWith('video/')) {
        await extractFrames(file);
    }
  }
};

const extractFrames = async (videoFile: File) => {
    processingVideo.value = true;
    status.value = { type: 'info', message: 'Extracting frames from video...' };
    
    try {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        
        await new Promise((resolve) => { video.onloadedmetadata = resolve; });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 1920; // HD
        canvas.height = 1080;

        // Extract 1 frame every 2 seconds
        const duration = video.duration;
        const interval = 2; 

        for (let t = 0; t < duration; t += interval) {
            video.currentTime = t;
            await new Promise(r => video.onseeked = r);
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            if (blob) {
                const frameFile = new File([blob], `${videoFile.name}_frame_${t.toFixed(0)}.jpg`, { type: 'image/jpeg' });
                files.value.push({
                    file: frameFile,
                    name: frameFile.name,
                    url: URL.createObjectURL(frameFile),
                    offsetMs: t * 1000
                });
            }
        }

        status.value = null;
    } catch (err) {
        console.error("Video processing error", err);
        status.value = { type: 'error', message: 'Failed to process video.' };
    } finally {
        processingVideo.value = false;
    }
};

const removeFile = (index: number) => {
  files.value.splice(index, 1);
};

const startUpload = async () => {
  if (files.value.length === 0) return;
  
  uploading.value = true;
  status.value = { type: 'info', message: 'Starting transmission...' };
  
  // Distribute timestamps if multiple files
  const baseDate = new Date(metadata.timestamp);
  const totalFiles = files.value.length;
  
  if (totalFiles > 0) {
      // Calculate interval in milliseconds (24h / count)
      const DayInMs = 24 * 60 * 60 * 1000;
      const interval = DayInMs / totalFiles;
      
      files.value.forEach((f, index) => {
          let offset = 0;
          if (typeof f.offsetMs === 'number' && f.offsetMs > 0) {
              // Priority: Use video offset
              offset = f.offsetMs;
          } else {
              // Fallback: Distribute evenly (simulation mode)
              // But ensure at least 1 second diff if totalFiles is large? 
              // Actually 24h spread is fine for "Daily" simulation.
              offset = interval * index;
          }
          
          const newTime = new Date(baseDate.getTime() + offset);
          f.timestampOverride = newTime.toISOString();
      });
  }

  status.value = { type: 'info', message: 'Starting sequenced transmission...' };
  
  let successCount = 0;
  let failCount = 0;

  for (const f of files.value) {
    if (f.uploaded) continue;
    
    f.uploading = true;
    try {
      await WeatherApi.uploadImage(f.file, {
        city: metadata.city,
        deviceId: metadata.deviceId,
        timestamp: f.timestampOverride || new Date(metadata.timestamp).toISOString()
      });
      f.uploaded = true;
      successCount++;
    } catch (e) {
      console.error(e);
      f.error = true;
      failCount++;
    } finally {
        f.uploading = false;
    }
  }


  uploading.value = false;
  if (failCount === 0) {
    status.value = { type: 'success', message: `Uploaded ${successCount} captures. Processing... (Waiting for background services)` };
    
    // Auto-trigger video generation with DELAY
    // Give picture_service time to process DB/S3
    setTimeout(async () => {
        try {
            const dateStr = baseDate.toISOString().split('T')[0];
            status.value = { type: 'info', message: 'Triggering video generation...' };
            
            await WeatherApi.triggerVideoGeneration(dateStr);
            status.value = { type: 'success', message: 'Uploads complete & Video generation triggered!' };
        } catch (err) {
            console.error(err);
            status.value = { type: 'error', message: 'Uploads done, but video trigger failed.' };
        }
    }, 60000); // Wait 60 seconds

  } else {
    status.value = { type: 'error', message: `Completed with errors. Success: ${successCount}, Failed: ${failCount}.` };
  }
};
</script>

<style scoped>
.simulation-page {
  min-height: 100vh;
  padding: var(--spacing-xl) var(--spacing-lg);
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle at top right, #1a2a3a, #0a0a0a);
}

.glass-container {
  width: 100%;
  max-width: 1100px;
  background: rgba(20, 20, 20, 0.6);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: var(--spacing-xl);
  box-shadow: 0 30px 60px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: var(--spacing-lg);
}

.title-block h1 {
  font-size: 2.2em;
  font-weight: 200;
  color: white;
  letter-spacing: -0.5px;
  margin: 0;
}

.title-block p {
  color: rgba(255,255,255,0.5);
  font-size: 0.95em;
  margin-top: 5px;
}

.back-btn {
  background: rgba(255,255,255,0.05);
  border: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 0.9em;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.2s;
}

.back-btn:hover { background: rgba(255,255,255,0.1); color: white; }

.wizard-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--spacing-xl);
}

.config-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-right: 1px solid rgba(255,255,255,0.05);
  padding-right: var(--spacing-lg);
}

.config-sidebar h3 {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-accent);
  margin-bottom: 5px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.85em;
  color: rgba(255,255,255,0.6);
}

.form-group input, .form-group select {
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus, .form-group select:focus {
  outline: none;
  border-color: var(--color-accent);
  background: rgba(0,0,0,0.6);
}

.help-text {
  font-size: 0.75em;
  color: rgba(255,255,255,0.3);
}

.info-box {
  margin-top: auto;
  background: rgba(64, 196, 255, 0.05);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(64, 196, 255, 0.2);
}

.info-box h4 { font-size: 0.9em; margin-bottom: 6px; color: var(--color-info); }
.info-box p { font-size: 0.8em; color: rgba(255,255,255,0.7); line-height: 1.4; }

/* Upload Area */
.upload-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 550px;
}

.drop-zone {
  flex: 1;
  border: 2px dashed rgba(255,255,255,0.1);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: all 0.2s;
  background: rgba(0,0,0,0.2);
}

.drop-zone.active {
  border-color: var(--color-accent);
  background: rgba(64, 196, 255, 0.05);
}

.upload-prompt {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255,255,255,0.5);
  transition: color 0.2s;
}

.upload-prompt:hover { color: white; }
.upload-prompt .icon { font-size: 3.5em; margin-bottom: 15px; opacity: 0.7; }
.upload-prompt h3 { font-size: 1.2em; font-weight: 500; margin-bottom: 5px;}

.processing-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    gap: 15px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.preview-grid {
  flex: 1;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 15px;
  align-content: flex-start;
  overflow-y: auto;
}

.preview-card {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  background: black;
  transition: transform 0.2s;
}

.preview-card.uploaded { border-color: var(--color-success); }
.preview-card.error { border-color: var(--color-error); }

.preview-card .thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
}

.preview-card .overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-card:hover .overlay { opacity: 1; }

.status-icon { font-size: 1.5em; }

.preview-card .remove {
  color: white;
  background: #ff4444;
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: var(--color-accent);
    width: 100%; /* Ideally animated width */
    animation: load 2s infinite ease-in-out;
}

@keyframes load { 0% { opacity: 0.5; width: 0; } 50% { width: 100%; } 100% { opacity: 0; width: 100%; } }

.add-more {
  border: 1px dashed rgba(255,255,255,0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2em;
  color: rgba(255,255,255,0.2);
  cursor: pointer;
  aspect-ratio: 16/9;
}

.add-more:hover { color: var(--color-accent); border-color: var(--color-accent); }

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-bar {
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.05);
  padding: 8px 16px;
  border-radius: 20px;
}

.indicator { width: 8px; height: 8px; border-radius: 50%; }
.indicator.success { background: var(--color-success); box-shadow: 0 0 10px var(--color-success); }
.indicator.error { background: var(--color-error); box-shadow: 0 0 10px var(--color-error); }
.indicator.info { background: var(--color-info); }

.upload-btn {
  background: linear-gradient(135deg, var(--color-accent), #0056b3);
  color: white;
  border: none;
  padding: 14px 40px;
  border-radius: 30px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 10px 20px rgba(0,0,0,0.3);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
  box-shadow: none;
}

.upload-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(0,123,255,0.3);
}

@media (max-width: 900px) {
  .wizard-layout { grid-template-columns: 1fr; }
  .config-sidebar { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; padding-right: 0;}
}
</style>
