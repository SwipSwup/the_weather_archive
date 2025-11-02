<template>
  <div class="search-wrapper">
    <div class="search-bar">
      <input
        v-model="searchQuery"
        @input="handleInput"
        @keyup.enter="handleSearch"
        type="text"
        :placeholder="placeholder"
        class="search-input"
      />
      <button class="search-button" @click="handleSearch">Search</button>
    </div>

    <!-- Autocomplete dropdown -->
    <ul v-if="suggestions.length" class="dropdown">
      <li
        v-for="city in suggestions"
        :key="city"
        @click="selectCity(city)"
      >
        {{ city }}
      </li>
    </ul>

    <!-- Error message -->
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  placeholder?: string
  availableCities?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search for a city...',
  availableCities: () => ['Vienna', 'Berlin', 'Paris', 'London']
})

const emit = defineEmits<{
  search: [city: string]
}>()

const searchQuery = ref('')
const suggestions = ref<string[]>([])
const errorMessage = ref('')

const handleInput = () => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    suggestions.value = []
    return
  }
  suggestions.value = props.availableCities.filter(city =>
    city.toLowerCase().includes(query)
  )
  errorMessage.value = ''
}

const selectCity = (city: string) => {
  searchQuery.value = city
  suggestions.value = []
  errorMessage.value = ''
}

const handleSearch = () => {
  if (props.availableCities.includes(searchQuery.value)) {
    errorMessage.value = ''
    emit('search', searchQuery.value)
  } else {
    errorMessage.value = "We couldn't find that city in our archive."
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
}

.search-button:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--color-bg-secondary);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
  list-style: none;
  padding: 0.4rem 0;
  margin: 0;
  box-shadow: var(--shadow-floating);
  animation: fadeIn var(--transition-fast);
  z-index: 10;
}

.dropdown li {
  padding: 0.7rem 1rem;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
  color: var(--color-text-primary);
}

.dropdown li:hover {
  background: rgba(255, 255, 255, 0.08);
}

.error {
  color: var(--color-error);
  font-size: 0.9rem;
  margin-top: 0.8rem;
  animation: fadeIn var(--transition-base);
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.5);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
