<template>
  <div class="search-wrapper" ref="wrapper">
    <div class="search-bar">
      <input
        v-model="searchQuery"
        @input="handleInput"
        @focus="handleInput"
        @keyup.enter="handleEnter"
        type="text"
        :placeholder="placeholder"
        class="search-input"
        :class="{ 'has-error': errorMessage }"
      />
      <div v-if="isLoading" class="spinner"></div>
      <button class="search-button" @click="handleEnter">Search</button>
    </div>

    <!-- Autocomplete dropdown -->
    <ul v-if="showSuggestions && suggestions.length > 0" class="dropdown">
      <li
        v-for="city in suggestions"
        :key="city.id"
        @click="selectCity(city)"
        class="suggestion-item"
      >
         <img 
            v-if="city.country_code" 
            :src="`https://flagcdn.com/w40/${city.country_code.toLowerCase()}.png`"
            class="flag-icon"
            alt="flag"
          />
        <div class="city-info">
            <span class="city-name">{{ city.name }}</span>
            <span class="country-name">{{ city.country }}</span>
        </div>
      </li>
    </ul>

    <!-- Error message -->
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { CityEntry } from '@/services/api';

interface Props {
  placeholder?: string
  availableCities?: CityEntry[] 
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search for a city...',
  availableCities: () => []
})

const emit = defineEmits<{
  search: [city: string]
}>()

interface CitySuggestion {
    id: number;
    name: string;
    country: string;
    country_code: string;
    admin1?: string;
}

const wrapper = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const suggestions = ref<CitySuggestion[]>([])
const errorMessage = ref('')
const isLoading = ref(false)
const showSuggestions = ref(false)

const handleClickOutside = (event: MouseEvent) => {
    if (wrapper.value && !wrapper.value.contains(event.target as Node)) {
        showSuggestions.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});


// Debounce helper
const debouncedSearch = (() => {
    let timeout: ReturnType<typeof setTimeout>;
    return (fn: () => void) => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, 500);
    };
})();

const handleInput = () => {
  if (!searchQuery.value || searchQuery.value.length < 2) {
      suggestions.value = [];
      showSuggestions.value = false;
      return;
  }
  
  errorMessage.value = '';
  isLoading.value = true;
  debouncedSearch(performHybridSearch);
}

const performHybridSearch = async () => {
    if (!searchQuery.value) return;

    try {
        // 1. Fetch wide results from Open-Meteo
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.value)}&count=10&language=en&format=json`
        );
        const data = await response.json();

        if (data.results && Array.isArray(data.results)) {
             // 2. Filter Results against properties.availableCities logic
             
             // Create a lookup map: lowercase_name -> Set(country_codes)
             const backendMap = new Map<string, Set<string | null>>();
             props.availableCities.forEach(c => {
                 let name = "";
                 let cc: string | null = null;

                 if (typeof c === 'string') {
                     name = c;
                 } else if (c && typeof c === 'object' && 'name' in c) {
                     name = c.name;
                     cc = c.country_code;
                 } else {
                     return;
                 }

                 name = name.toLowerCase().trim();
                 if (!backendMap.has(name)) {
                     backendMap.set(name, new Set());
                 }
                 backendMap.get(name)?.add(cc ? cc.toLowerCase() : null);
             });
             
             // backendMap is now populated.

             const filtered = data.results.filter((r: any) => {
                 const resName = r.name.toLowerCase().trim();
                 const resCountry = r.country_code ? r.country_code.toLowerCase() : null;

                 // Must match a city name in our DB
                 if (!backendMap.has(resName)) return false;
                 
                 const allowedCountries = backendMap.get(resName);
                 if (!allowedCountries) return false;

                 // If DB has explicit country code, we MUST match it
                 // If DB has NO country code (null/legacy), we fall back to Europe-only filter
                 const hasSpecificMatch = allowedCountries.has(resCountry); // Strict match
                 const hasLegacyEntry = allowedCountries.has(null);         // Legacy match

                 if (hasSpecificMatch) return true;
                 
                 // If we have a legacy entry (no country code in DB), apply Europe filter to be safe
                 if (hasLegacyEntry) {
                     const europeanTimezones = /^Europe\//;
                     const euCountries = [
                        'AL', 'AD', 'AM', 'AT', 'AZ', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 
                        'DK', 'EE', 'FI', 'FR', 'GE', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'KZ', 
                        'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 
                        'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR', 'UA', 
                        'GB', 'VA'
                     ]; 
                     if (r.timezone && europeanTimezones.test(r.timezone)) return true;
                     if (resCountry && euCountries.includes(resCountry.toUpperCase())) return true;
                 }

                 return false;
             });

             suggestions.value = filtered.map((r: any) => ({
                 id: r.id,
                 name: r.name,
                 country: r.country,
                 country_code: r.country_code,
                 admin1: r.admin1
             }));

        } else {
            suggestions.value = [];
        }
    } catch (e) {
        console.error("Search failed", e);
        suggestions.value = [];
    } finally {
        isLoading.value = false;
        showSuggestions.value = true;
    }
};

const selectCity = (city: CitySuggestion) => {
  searchQuery.value = city.name; // Keep simple name for input
  suggestions.value = [];
  showSuggestions.value = false;
  emit('search', city.name.toLowerCase());
}

const handleEnter = () => {
    // Basic verification - better to rely on clicking result
    const query = searchQuery.value.toLowerCase().trim();
    // Looser check for enter key - just check if any city with that name exists in DB
    const exists = props.availableCities.some(c => {
        const name = (typeof c === 'string') ? c : c.name;
        return name.toLowerCase().trim() === query;
    });
    
    if (exists) {
        suggestions.value = [];
        showSuggestions.value = false;
        emit('search', query);
    } else {
        errorMessage.value = "We couldn't find that city in our archive.";
    }
}
</script>

<style scoped>
.search-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 500px;
}

.search-bar {
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-raised);
  overflow: hidden;
  transition: all var(--transition-base);
  position: relative;
}

.search-bar:focus-within {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-floating);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text-primary);
  padding: 0.9rem 1.2rem;
  font-size: 1rem;
  font-family: inherit;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-button {
  background: var(--color-accent);
  color: var(--color-bg-primary);
  font-weight: 600;
  border: none;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: 0.9rem 1.4rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.search-button:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top: 2px solid var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 10px;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #1a1a1a; /* Hardcoded dark fallback or var */
  background: var(--color-bg-secondary, #1a1a1a);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  list-style: none;
  padding: 0;
  margin: 0;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.suggestion-item:last-child { border-bottom: none; }

.suggestion-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.flag-icon {
    width: 24px;
    height: auto;
    border-radius: 2px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.city-info {
    display: flex;
    flex-direction: column;
}

.city-name {
    color: var(--color-text-primary, white);
    font-weight: 500;
}

.country-name {
    font-size: 0.8em;
    color: rgba(255,255,255,0.5);
}

.error {
  color: #ff4d4d;
  font-size: 0.9rem;
  margin-top: 0.8rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
</style>
