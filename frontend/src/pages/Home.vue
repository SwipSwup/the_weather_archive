<template>
  <div class="home-page">
    
    <!-- Subtle Ambient Glows -->
    <div class="glow-orb orb-1"></div>
    <div class="glow-orb orb-2"></div>

    <div class="content-wrapper">
      
      <!-- Top Right Action -->
      <div class="top-actions">
        <router-link to="/camera-simulation" class="ghost-pill-btn">
          <span class="material-icons">videocam</span>
          <span>Simulate Feed</span>
        </router-link>
      </div>

      <!-- Main Center Content -->
      <main class="hero-center">
        
        <div class="brand-container">
          <span class="brand-subtitle">EUROPEAN ARCHIVE</span>
          <h1 class="brand-title">The Weather Archive</h1>
        </div>

        <div class="typewriter-container">
          <TextType
             :text="[
               'Historical weather data for every major European city.',
               'Precise archives. Instant access.',
               'Explore the past atmosphere.'
             ]"
             :typingSpeed="40"
             :pauseDuration="2500"
             :showCursor="true"
             cursorCharacter="_"
          />
        </div>

        <div class="search-container">
           <SearchBar
              :available-cities="availableCities"
              placeholder="Search for a city (e.g., Vienna, London...)"
              @search="handleSearch"
           />
        </div>

      </main>

      <footer class="simple-footer">
        <p>Managed by David Veigel</p>
      </footer>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'
import TextType from "@/bits/TextAnimations/TextType/TextType.vue";
import { WeatherApi, type CityEntry } from '@/services/api';

const router = useRouter()
const availableCities = ref<CityEntry[]>([])

onMounted(async () => {
  try {
    const cities = await WeatherApi.getAvailableCities();
    if (cities && Array.isArray(cities)) {
      availableCities.value = cities;
    }
  } catch (e) {
    console.error("Failed to load cities", e);
  }
});

const handleSearch = (city: string) => {
  router.push(`/city/${city}`)
}
</script>

<style scoped>
.home-page {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: transparent; /* Allows global dithering to show through */
  color: #fff;
}

/* --- AMBIENT GLOWS --- */
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  z-index: -1;
  opacity: 0.4;
  animation: floatOrb 20s infinite ease-in-out alternate;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(var(--color-accent-rgb), 0.15), transparent 70%);
  top: -10%;
  left: -10%;
}

.orb-2 {
  width: 800px;
  height: 600px;
  background: radial-gradient(circle, rgba(70, 70, 90, 0.2), transparent 70%);
  bottom: -10%;
  right: -10%;
  animation-delay: -5s;
}

@keyframes floatOrb {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

/* --- LAYOUT --- */
.content-wrapper {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 40px;
}

.top-actions {
  display: flex;
  justify-content: flex-end;
  animation: fadeInDown 1s ease 0.5s backwards;
}

.hero-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

/* --- TYPOGRAPHY --- */
.brand-container {
  margin-bottom: 2rem;
  animation: fadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.brand-subtitle {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.4em;
  color: var(--color-accent);
  text-transform: uppercase;
  margin-bottom: 1rem;
  opacity: 0.8;
}

.brand-title {
  font-size: 5rem; /* Large and bold */
  line-height: 1;
  font-weight: 800;
  letter-spacing: -2px;
  margin: 0;
  
  /* Subtle gradient text */
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  /* Deep shadow for pop without a box */
  filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));
}

.typewriter-container {
  height: 2rem; /* Reserve space */
  margin-bottom: 4rem;
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 300;
  animation: fadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s backwards;
}

/* --- SEARCH --- */
.search-container {
  width: 100%;
  max-width: 580px;
  animation: fadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s backwards;
  /* Add a spotlight effect behind search */
  position: relative;
}

.search-container::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 200%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.03), transparent 70%);
  pointer-events: none;
  z-index: -1;
}

/* --- FOOTER --- */
.simple-footer {
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.3;
  margin-top: auto;
}

/* --- COMPONENTS --- */
.ghost-pill-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 50px;
  text-decoration: none;
  color: rgba(255,255,255,0.8);
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.ghost-pill-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.2);
}

.ghost-pill-btn .material-icons {
  font-size: 1.1rem;
}

/* --- RESPONSIVE --- */
@media (max-width: 768px) {
  .brand-title {
    font-size: 3rem;
  }
  
  .typewriter-container {
    font-size: 1rem;
    margin-bottom: 3rem;
  }

  .content-wrapper {
    padding: 20px;
  }
}

/* Animations */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>