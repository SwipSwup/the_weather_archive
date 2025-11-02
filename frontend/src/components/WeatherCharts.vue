<template>
  <div class="weather-charts">
    <h3 class="charts-title">Weather Trends</h3>
    <div class="charts-container">
      <!-- Placeholder chart containers -->
      <div class="chart-wrapper">
        <div class="chart-placeholder">
          <div class="chart-label">Temperature (°C)</div>
          <div class="chart-grid">
            <div class="chart-line" style="--chart-color: var(--color-error)"></div>
          </div>
          <div class="chart-note">Chart will be rendered here</div>
        </div>
      </div>
      <div class="chart-wrapper">
        <div class="chart-placeholder">
          <div class="chart-label">Humidity (%)</div>
          <div class="chart-grid">
            <div class="chart-line" style="--chart-color: var(--color-info)"></div>
          </div>
          <div class="chart-note">Chart will be rendered here</div>
        </div>
      </div>
      <div class="chart-wrapper">
        <div class="chart-placeholder">
          <div class="chart-label">Air Pressure (hPa)</div>
          <div class="chart-grid">
            <div class="chart-line" style="--chart-color: var(--color-success)"></div>
          </div>
          <div class="chart-note">Chart will be rendered here</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Placeholder component - will integrate chart.js later
</script>

<style scoped>
.weather-charts {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
}

.charts-title {
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 500;
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.charts-container {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
  overflow: auto;
  min-height: 0;
}

.chart-wrapper {
  background: var(--color-bg-neutral-2);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.chart-placeholder {
  height: 100%;
  min-height: 100px;
  display: flex;
  flex-direction: column;
}

.chart-label {
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-md);
}

.chart-grid {
  flex: 1;
  background: var(--color-bg-primary);
  border-radius: var(--radius-sm);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.chart-line {
  width: 80%;
  height: 2px;
  background: var(--chart-color, var(--color-accent));
  border-radius: 2px;
  opacity: 0.5;
}

.chart-note {
  color: var(--color-text-secondary);
  font-size: 12px;
  opacity: 0.6;
  margin-top: var(--spacing-sm);
  text-align: center;
}

</style>
