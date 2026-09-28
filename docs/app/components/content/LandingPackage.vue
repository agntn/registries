<script setup lang="ts">
import type { LookupSample } from "../../utils/landing-fixtures";
import { bareUrl, dateOnly, displayName } from "../../utils/format";
import { ecosystemInfo } from "../../utils/registries";

const props = defineProps<{ sample: LookupSample }>();

const emit = defineEmits<{ step: [delta: number]; pause: [paused: boolean] }>();

const pkg = computed(() => props.sample.package);
const info = computed(() => ecosystemInfo(props.sample.ecosystem));
const newest = computed(() => props.sample.versions[0]);
</script>

<template>
  <section
    class="tool-console landing-package"
    aria-label="One package lookup"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <UTooltip :text="`fetchPackageFromPURL(&quot;${sample.purl}&quot;)`">
        <span class="console-title" tabindex="0"
          ><span class="console-tag">Call</span>fetchPackageFromPURL(<span class="tok-str"
            >"{{ sample.purl }}"</span
          >)</span
        >
      </UTooltip>
      <span class="console-meta">{{ sample.live ? "live" : "recorded" }}</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.purl" class="console-cursor" />
    </div>

    <div class="package-subject">
      <div :key="sample.purl" class="console-scan" aria-hidden="true" />
      <div class="package-identity">
        <ConsoleReticle :key="sample.purl" :icon="info?.icon ?? 'i-lucide-package'" />
        <div class="package-name">
          <span class="console-label"
            >Package / <span class="console-label-key">{{ info?.label ?? sample.ecosystem }}</span></span
          >
          <h3>
            {{ displayName(pkg) }}
            <span class="console-accent">{{ pkg.latestVersion }}</span>
          </h3>
          <p class="package-about">{{ pkg.description || "No description on the registry." }}</p>
        </div>
      </div>
      <div class="console-readout">
        <dl class="console-readout-rows">
          <div>
            <dt>Licenses</dt>
            <dd :class="{ 'package-dim': !pkg.licenses }">
              <span class="package-line">{{ pkg.licenses || "none given" }}</span>
            </dd>
          </div>
          <div>
            <dt>Repository</dt>
            <dd :class="{ 'package-dim': !pkg.repository }">
              <UTooltip v-if="pkg.repository" :text="pkg.repository">
                <span class="package-line" tabindex="0">{{ bareUrl(pkg.repository) }}</span>
              </UTooltip>
              <template v-else>none given</template>
            </dd>
          </div>
          <div>
            <dt>Versions</dt>
            <dd>
              <span class="package-line"
                >{{ sample.versionsTotal
                }}<span v-if="newest" class="package-dim">
                  · newest {{ dateOnly(newest.publishedAt) || "undated" }}</span
                ></span
              >
            </dd>
          </div>
          <div>
            <dt>Keywords</dt>
            <dd :class="{ 'package-dim': !pkg.keywords.length }">
              <span class="package-line">{{
                pkg.keywords.length ? pkg.keywords.slice(0, 4).join(", ") : "none"
              }}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <footer class="console-footer console-footer-plain">
      <NuxtLink
        :to="{ path: '/lookup', query: { purl: sample.purl, op: 'package' } }"
        class="package-link"
        ><span aria-hidden="true">→ </span>open in the explorer</NuxtLink
      >
      <div class="console-controls" aria-label="Sample packages">
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-left"
          aria-label="Previous package"
          @click="emit('step', -1)"
        />
        <span>Package</span>
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-right"
          aria-label="Next package"
          @click="emit('step', 1)"
        />
      </div>
    </footer>
  </section>
</template>

<style scoped>
.package-subject {
  position: relative;
  display: grid;
  gap: 16px;
  padding: 18px 20px 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M16 18h4m-2-2v4' fill='none' stroke='%23818a94' stroke-opacity='.1'/%3E%3C/svg%3E");
  background-size: 36px 36px;
  background-position: 24px 20px;
}
.package-subject > :not(.console-scan) {
  position: relative;
}
.package-identity {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.package-name {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.package-name h3 {
  margin: 0;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 400;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
.package-about {
  margin: 0;
  overflow: hidden;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-muted);
}
.package-dim {
  color: var(--ui-text-dimmed);
}
.package-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.landing-package .console-readout-rows > div {
  grid-template-columns: 6.5rem minmax(0, 1fr);
}
.package-link {
  color: var(--ui-text-highlighted);
}
.package-link:hover {
  color: var(--console-accent);
}
.package-link:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 3px;
}
@media (width < 400px) {
  .package-subject {
    padding-inline: 14px;
  }
  .package-identity {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
