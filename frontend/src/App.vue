<template>
  <div class="app-wrapper">
    <div class="background-container">
      <Dither
          :wave-speed="0.02"
          :wave-frequency="5"
          :wave-amplitude="0.3"
          :wave-color="[0.592, 0.600, 0.553]"
          :color-num="4"
          :pixel-size="1"
          :disable-animation="false"
          :enable-mouse-interaction="false"
          :mouse-radius="1"
      />
    </div>

    <div class="app-content">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import ColorBends from '@/bits/Backgrounds/ColorBends/ColorBends.vue'
import Footer from '@/components/Footer.vue'
import { RouterView } from 'vue-router'
import DotGrid from "@/bits/Backgrounds/DotGrid/DotGrid.vue";
import Dither from "@/bits/Backgrounds/Dither/Dither.vue";
</script>

<style scoped>
.app-wrapper {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

/* Background stays fixed behind everything */
.background-container {
  position: fixed;
  inset: 0; /* top:0; right:0; bottom:0; left:0 */
  z-index: 0;
  pointer-events: none; /* ensures clicks go through to content */
}

/* Content floats above background */
.app-content {
  position: relative;
  z-index: 1;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>