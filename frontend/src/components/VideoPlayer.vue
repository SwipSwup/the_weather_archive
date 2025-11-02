<template>
  <div class="video-player">
    <div class="player-container">
      <!-- Placeholder video container -->
      <div class="video-placeholder">
        <div class="play-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="placeholder-text">Time-lapse video will be displayed here</div>
      </div>
    </div>
    <p class="video-caption">Time-lapse of today's webcam images</p>
  </div>
</template>

<script setup lang="ts">
// Placeholder component - will integrate video player later
</script>

<style scoped>
.video-player {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.player-container {
  flex: 1;
  min-height: 0;
  position: relative;
  width: 100%;
  background: #000;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-neutral-2) 100%);
  color: var(--color-text-secondary);
}

.play-icon {
  width: 64px;
  height: 64px;
  color: var(--color-accent);
  opacity: 0.8;
  margin-bottom: var(--spacing-md);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

.placeholder-text {
  font-size: 14px;
  opacity: 0.7;
}

.video-caption {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-top: var(--spacing-sm);
  text-align: center;
  flex-shrink: 0;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
}
</style>
