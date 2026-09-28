<script setup lang="ts">
import { bareUrl } from "../../utils/format";
import { ECOSYSTEMS, LOOKUPS, adapterModule, ecosystemInfo } from "../../utils/registries";

const props = defineProps<{ ecosystem: string }>();

const info = computed(() => ecosystemInfo(props.ecosystem));
const position = computed(() => ECOSYSTEMS.findIndex((entry) => entry.key === props.ecosystem) + 1);
const marks = computed(() => info.value?.statuses !== "none");
</script>

<template>
  <section v-if="info" class="tool-console console-wide not-prose my-6" aria-label="Registry record">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title"
        ><span class="console-tag">ID</span>{{ info.key
        }}<span v-if="position > 0" class="console-file"
          >{{ String(position).padStart(2, "0") }} / {{ ECOSYSTEMS.length }}</span
        ></span
      >
      <span class="console-meta">keyless · {{ bareUrl(info.baseURL) }}</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true"><span class="console-cursor" /></div>

    <div class="console-band console-subject-band">
      <div class="console-scan" aria-hidden="true" />
      <div class="console-identity-block">
        <ConsoleReticle :key="info.key" :icon="info.icon" />
        <div class="console-name">
          <span class="console-label">Registry</span>
          <h3>{{ info.label }}</h3>
          <ul class="registry-aliases" aria-label="Identifiers">
            <li><span class="registry-alias">{{ info.className }}</span></li>
            <li><span class="registry-alias">pkg:{{ info.key }}</span></li>
          </ul>
          <p class="console-about">{{ info.about }}</p>
        </div>
      </div>

      <div class="console-readout">
        <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
          <circle cx="3" cy="12" r="2.5" />
          <path d="M5.5 12H14L22 20H32" />
        </svg>
        <dl class="console-readout-rows">
          <div>
            <dt>API</dt>
            <dd>{{ info.host }}</dd>
          </div>
          <div>
            <dt>Marks</dt>
            <dd :class="marks ? 'console-accent' : 'registry-none'">
              {{ marks ? info.statuses : "no version is ever marked" }}
            </dd>
          </div>
          <div>
            <dt>Maintainers</dt>
            <dd>{{ info.maintainers }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="console-band">
      <p class="console-label console-rule-title">
        <span>Lookups <span aria-hidden="true">[ Registry contract ]</span></span>
        <span class="console-mark" aria-hidden="true" />
      </p>
      <ul class="registry-ops">
        <li v-for="lookup in LOOKUPS" :key="lookup.key">
          <span class="registry-op-label">{{ lookup.label }}</span>
          <NuxtLink
            :to="{ path: '/lookup', query: { purl: info.example, op: lookup.key } }"
            class="registry-op-method"
            >{{ lookup.method }}</NuxtLink
          >
          <span class="registry-op-node" aria-hidden="true" />
        </li>
      </ul>
    </div>

    <div class="console-band">
      <p class="console-label console-rule-title">
        <span>Access <span aria-hidden="true">[ library · docs worker ]</span></span>
        <span class="console-mark" aria-hidden="true" />
      </p>
      <dl class="registry-access">
        <dd class="console-lead">
          <span class="console-tag">Create</span>
          <code class="registry-code"
            ><span class="tok-fn">create</span>(<span class="tok-str">"{{ info.key }}"</span>)</code
          >
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd class="console-lead">
          <span class="console-tag">Import</span>
          <code class="registry-code"
            ><span class="tok-str">@agntn/registries/registries/{{ adapterModule(info) }}</span></code
          >
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd class="console-lead">
          <span class="console-tag">PURL</span>
          <code class="registry-code">{{ info.purl }}</code>
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd class="console-lead">
          <span class="console-tag">Try</span>
          <NuxtLink :to="{ path: '/lookup', query: { purl: info.example, op: 'package' } }"
            >{{ info.example }}<span class="registry-dim"> in the explorer</span></NuxtLink
          >
          <span class="console-leader" aria-hidden="true" />
        </dd>
      </dl>
    </div>

    <footer class="console-footer console-footer-plain">
      <ul class="console-links">
        <li>
          <NuxtLink to="/registries"><span aria-hidden="true">→ </span>All registries</NuxtLink>
        </li>
      </ul>
      <span class="console-meta">no API key</span>
    </footer>
  </section>
</template>

<style scoped>
.registry-aliases {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}
.registry-alias {
  display: inline-flex;
  padding: 1px 7px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--ui-text-highlighted);
  box-shadow: inset 0 0 0 1px var(--console-line);
}
.registry-none {
  color: var(--ui-text-muted);
}
.registry-ops {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.registry-ops > li {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 10px;
  align-items: center;
  padding: 7px 10px;
  box-shadow: inset 0 0 0 1px var(--console-line);
}
.registry-op-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}
.registry-op-method {
  grid-column: 1;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
.registry-op-method:hover {
  color: var(--console-accent);
}
.registry-op-method:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 2px;
}
.registry-op-node {
  grid-column: 2;
  grid-row: 1 / span 2;
  width: 7px;
  height: 7px;
  background: var(--console-accent);
}
.registry-code {
  font: inherit;
  color: var(--ui-text-highlighted);
}
.registry-dim {
  color: var(--ui-text-dimmed);
}
.console-lead > a:hover .registry-dim {
  color: inherit;
}
.registry-access {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  gap: 0 28px;
  margin: 0;
}
.registry-access > .console-lead {
  margin: 0 0 8px;
  flex-wrap: nowrap;
  min-width: 0;
}
.registry-access .registry-code,
.registry-access .console-lead > a {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
@media (width < 640px) {
  .registry-access .console-leader {
    display: none;
  }
}
</style>
