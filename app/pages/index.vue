<template>
  <main class="page">
    <header class="site-header reveal">
      <p class="eyebrow">canvas drawing engine</p>
      <h1 class="site-name">enpitsu</h1>
      <p class="tagline">
        筆圧とスプライン補間で、なめらかな手描きの線を描くための小さなキャンバス。
      </p>
    </header>

    <section class="section reveal" style="--i: 1">
      <ul class="link-list">
        <li>
          <NuxtLink to="/enpitsu">
            <span>キャンバスを開く</span>
            <span class="arrow">↗</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <footer class="site-footer reveal" style="--i: 2">
      <p class="meta">enpitsu — a canvas drawing engine</p>
    </footer>
  </main>
</template>

<script setup lang="ts">
</script>

<style scoped>
.page {
  max-width: var(--measure);
  margin: 0 auto;
  padding: var(--space-8) 1.25rem var(--space-8);
}

.site-header {
  padding-bottom: var(--space-6);
}

.eyebrow {
  margin-bottom: var(--space-4);
}

.site-name {
  font-size: var(--text-display);
}

.tagline {
  margin-top: var(--space-4);
  color: var(--ink-muted);
  max-width: 34em;
}

.section {
  padding: var(--space-6) 0;
  border-top: 1px solid var(--line);
}

.link-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.link-list a {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35em;
  font-size: var(--text-xl);
  transition: opacity var(--dur) var(--ease);
}

.link-list a .arrow {
  font-size: var(--text-sm);
  color: var(--ink-muted);
}

.link-list a:hover {
  opacity: 0.55;
  text-decoration: underline;
  text-decoration-thickness: 0.06em;
  text-underline-offset: 0.2em;
}

.site-footer {
  padding-top: var(--space-7);
  border-top: 1px solid var(--line);
}

@keyframes reveal-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.reveal {
  opacity: 0;
  animation: reveal-in 0.7s var(--ease) forwards;
  animation-delay: calc(var(--i, 0) * 90ms);
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    animation: none;
  }
}
</style>
