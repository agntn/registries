<script setup lang="ts">
import type { LookupSample } from "../../utils/landing-fixtures";
import { dateOnly } from "../../utils/format";

const props = defineProps<{ sample: LookupSample }>();

/** Always four slots: Arch keeps one version per package, and the panel must not shrink for it. */
const slots = computed(() => {
  const rows = props.sample.versions.slice(0, 4);
  return [...rows, ...Array.from({ length: 4 - rows.length }, () => null)];
});

const command = computed(() => `registries versions ${props.sample.purl.replace(/^pkg:/u, "")} --limit 4`);
</script>

<template>
  <section class="tool-console landing-versions" aria-label="Versions from the CLI">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <UTooltip :text="command">
        <span class="console-title" tabindex="0"
          ><span class="console-tag">List</span><span class="versions-prompt">$ </span
          >{{ command }}</span
        >
      </UTooltip>
      <span class="console-meta">{{ sample.versionsTotal }} total</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.purl" class="console-cursor" />
    </div>

    <!-- Four rows whatever the sample, so the panel keeps one height. -->
    <ol :key="sample.purl" class="registries-rows versions-rows console-animate">
      <li
        v-for="(version, index) in slots"
        :key="version?.number ?? `empty-${index}`"
        :style="{ animationDelay: `${index * 45}ms` }"
      >
        <template v-if="version">
          <UTooltip :text="version.number">
            <span class="registries-value versions-number" tabindex="0">{{ version.number }}</span>
          </UTooltip>
          <span class="console-leader" aria-hidden="true" />
          <span class="versions-end">
            <span class="registries-dim">{{ dateOnly(version.publishedAt) || "undated" }}</span>
            <UBadge
              :color="version.status ? 'primary' : 'neutral'"
              variant="outline"
              :label="version.status || 'ok'"
            />
          </span>
        </template>
        <span v-else-if="index === sample.versions.length" class="registries-dim versions-empty"
          >no older version on this registry</span
        >
        <span v-else class="versions-empty" aria-hidden="true">&#160;</span>
      </li>
    </ol>
    <p class="versions-note">
      Ask again for the same PURL and the answer comes out of the cache, not the registry, until
      the lockfile says its TTL ran out.
    </p>

    <footer class="console-footer console-footer-plain">
      <span class="versions-foot"
        >{{ sample.dependenciesTotal }} dependencies · {{ sample.maintainersTotal }} maintainers</span
      >
      <span class="console-meta">{{ sample.live ? "live" : "recorded" }}</span>
    </footer>
  </section>
</template>

<style scoped>
.versions-prompt {
  color: var(--ui-text-dimmed);
}
.versions-rows {
  padding: 6px 0;
}
.versions-rows > li {
  grid-template-columns: auto minmax(1.5rem, 1fr) auto;
  align-items: center;
  gap: 12px;
}
.versions-number {
  display: block;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.versions-empty {
  grid-column: 1 / -1;
  line-height: 18px;
}
.versions-foot {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.versions-end {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}
.versions-note {
  margin: 0;
  padding: 12px 20px 14px;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.55;
  color: var(--ui-text-muted);
  box-shadow: inset 0 1px 0 var(--console-line);
}
@media (width < 400px) {
  .versions-note,
  .versions-rows > li {
    padding-inline: 14px;
  }
}
</style>
