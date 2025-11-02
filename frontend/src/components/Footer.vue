<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-logo">
        <h3>The Weather Archive</h3>
      </div>
      <nav class="footer-nav">
        <a href="#" class="footer-link">Privacy Policy</a>
        <a href="#" class="footer-link">Imprint</a>
        <a href="#" class="footer-link">Contact</a>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
</script>

<style scoped>
.footer {
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-divider);
  padding: var(--spacing-lg) var(--spacing-md);
  margin-top: auto;
}

.footer-content {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.footer-logo h3 {
  color: var(--color-text-secondary);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.footer-nav {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
  justify-content: center;
}

.footer-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: color var(--transition-fast);
}

.footer-link:hover {
  color: var(--color-accent);
}

@media (min-width: 768px) {
  .footer-content {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>

