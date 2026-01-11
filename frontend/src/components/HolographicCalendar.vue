<template>
  <div class="holographic-calendar">
    <!-- Header: Month/Year Navigation -->
    <div class="calendar-header">
      <button @click="changeMonth(-1)" class="nav-btn" aria-label="Previous Month">
        <span class="material-icons">chevron_left</span>
      </button>
      
      <div class="current-month">
        <span class="month-name">{{ currentMonthName }}</span>
        <span class="year-number">{{ currentYear }}</span>
      </div>

      <button @click="changeMonth(1)" class="nav-btn" aria-label="Next Month">
        <span class="material-icons">chevron_right</span>
      </button>
    </div>

    <!-- Weekday Labels -->
    <div class="weekdays-grid">
      <div v-for="day in weekDays" :key="day" class="weekday-label">
        {{ day }}
      </div>
    </div>

    <!-- Days Grid -->
    <div class="days-grid" :key="currentMonthKey"> <!-- Key forces animation restart -->
      <div 
        v-for="(dayObj, index) in calendarDays" 
        :key="index"
        class="day-cell"
        :class="{
          'other-month': !dayObj.isCurrentMonth,
          'today': dayObj.isToday,
          'has-data': dayObj.hasData,
          'selected': isSelected(dayObj.dateStr)
        }"
        @click="handleDayClick(dayObj)"
      >
        <div class="day-content">
          <span class="day-number">{{ dayObj.day }}</span>
          <div v-if="dayObj.hasData" class="data-dot"></div>
        </div>
        
        <!-- Hover Glow Effect -->
        <div class="glow-effect"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  availableDates: string[]; // ISO date strings 'YYYY-MM-DD'
}>();

const emit = defineEmits<{
  (e: 'select', date: string): void;
}>();

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// State
const currentDate = ref(new Date()); // Tracks the currently viewed month
const selectedDate = ref<string | null>(null);

// Computed
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());
const currentMonthName = computed(() => currentDate.value.toLocaleString('default', { month: 'long' }));
const currentMonthKey = computed(() => `${currentYear.value}-${currentMonth.value}`); // For animation key

// Helper to check if a date string is in availableDates
const hasDataForDate = (dateStr: string) => {
    return props.availableDates.includes(dateStr);
};

// Generate Calendar Grid
const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0 (Mon) - 6 (Sun)
  
  const days = [];
  
  // Previous Month Padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    const dateStr = formatDate(date);
    days.push({
      day,
      dateStr,
      isCurrentMonth: false,
      isToday: isToday(date),
      hasData: hasDataForDate(dateStr)
    });
  }
  
  // Current Month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateStr = formatDate(date);
    days.push({
      day: i,
      dateStr,
      isCurrentMonth: true,
      isToday: isToday(date),
      hasData: hasDataForDate(dateStr)
    });
  }
  
  // Next Month Padding (fill up to 42 cells for 6 rows mostly, or 35 for 5)
  // Let's stick to a fixed grid size or just fill the week? 
  // Standard is usually 6 weeks (42 days) to cover all possibilities.
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
     const date = new Date(year, month + 1, i);
     const dateStr = formatDate(date);
     days.push({
       day: i,
       dateStr,
       isCurrentMonth: false,
       isToday: isToday(date),
       hasData: hasDataForDate(dateStr)
     });
  }
  
  return days;
});

// Navigation
const changeMonth = (delta: number) => {
  currentDate.value = new Date(currentYear.value, currentMonth.value + delta, 1);
};

// Interaction
const handleDayClick = (dayObj: any) => {
    if (dayObj.hasData) {
        selectedDate.value = dayObj.dateStr;
        emit('select', dayObj.dateStr);
    }
};

const isSelected = (dateStr: string) => selectedDate.value === dateStr;

// Utils
const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

// Auto-navigate to latest available date on mount if exists
watch(() => props.availableDates, (dates) => {
    if (dates.length > 0 && selectedDate.value === null) {
        // Find latest date
        // Assuming dates coming in might not be sorted, let's sort
        const sorted = [...dates].sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
        const latest = new Date(sorted[0]);
        // Set calendar view to that month
        currentDate.value = new Date(latest.getFullYear(), latest.getMonth(), 1);
    }
}, { immediate: true });

</script>

<style scoped>
.holographic-calendar {
  display: flex;
  flex-direction: column;
  padding: 40px;
  background: transparent; /* Parent now handles the glass background */
  border-radius: 32px;
  user-select: none;
  width: 100%;
  max-width: 75vh;
  margin: 0 auto;
  transition: transform 0.3s ease;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 8px;
}

.current-month {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.month-name {
  font-size: 1.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(165, 180, 252, 0.3);
}

.year-number {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
  letter-spacing: 4px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.weekdays-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 16px; /* More space */
}

.weekday-label {
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px; /* Increased gap */
}

.day-cell {
  aspect-ratio: 1; /* Square cells */
  border-radius: 50%; /* Make them round? Or just consistent rounded rects */
  border-radius: 16px;
  position: relative;
  cursor: default;
  transition: all 0.2s ease;
  overflow: visible; /* Fix clipping */
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent; /* No default background to avoid blocky look */
  border: 1px solid transparent; 
}

/* Base style for content */
.day-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  justify-content: center;
}

.day-number {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
  transition: color 0.2s;
}

/* Styles for HAS DATA */
.day-cell.has-data {
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03); /* Very subtle bg */
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.day-cell.has-data .day-number {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.data-dot {
  width: 5px;
  height: 5px;
  background: var(--color-accent, #64ffda);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--color-accent, #64ffda);
}

/* Hover Effects for Has Data */
.day-cell.has-data:hover {
  transform: scale(1.1); /* Pop effect instead of just slide */
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-accent, #64ffda);
  z-index: 10;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.day-cell.has-data:hover .day-number {
  color: #fff;
}

/* Selected State */
.day-cell.selected {
  background: var(--color-accent, #64ffda) !important;
  color: #000 !important;
  box-shadow: 
    0 0 30px rgba(100, 255, 218, 0.5),
    inset 0 0 20px rgba(255, 255, 255, 0.4);
  transform: scale(1.15);
  z-index: 11;
}

.day-cell.selected .day-number {
  color: #000;
  font-weight: 900;
}

.day-cell.selected .data-dot {
  background: #000;
  box-shadow: none;
}

/* Other Month Dimmess */
.day-cell.other-month {
  opacity: 0.2;
}

/* Today Indicator */
.day-cell.today:not(.selected) {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.02);
}

/* Glow Effect */
.glow-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.2) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.day-cell:hover .glow-effect {
  opacity: 1;
}

/* Animations */
.days-grid {
    animation: fadeInGrid 0.4s ease-out;
}

@keyframes fadeInGrid {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
