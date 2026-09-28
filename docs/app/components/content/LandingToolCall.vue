<script setup lang="ts">
import type { LookupSample } from "../../utils/landing-fixtures";
import { displayName } from "../../utils/format";
import { ecosystemInfo } from "../../utils/registries";

const props = defineProps<{ sample: LookupSample }>();

const pkg = computed(() => props.sample.package);
const info = computed(() => ecosystemInfo(props.sample.ecosystem));

/** What `registries_package` puts in `content[0].text`: the Package as one line of JSON. */
const response = computed(() => JSON.stringify(pkg.value));
</script>

<template>
  <section class="tool-console landing-call" aria-label="One tool call">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <UTooltip :text="`registries_package({ purl: &quot;${sample.purl}&quot; })`">
        <span class="console-title" tabindex="0"
          ><span class="console-tag">Call</span>registries_package(<span class="tok-str"
            >"{{ sample.purl }}"</span
          >)</span
        >
      </UTooltip>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.purl" class="console-cursor" />
    </div>

    <!-- The registry it asked on the crosses grid; the argument, then the answer, in the readout. -->
    <div class="call-subject">
      <div :key="sample.purl" class="console-scan" aria-hidden="true" />
      <div class="call-identity">
        <ConsoleReticle :key="sample.purl" :icon="info?.icon ?? 'i-lucide-package'" />
        <div class="call-name">
          <span class="console-label">Tool / read-only</span>
          <h3>{{ info?.label ?? sample.ecosystem }}</h3>
          <p class="call-note">
            The agent gets the normalized Package as JSON. No prose, no guessing what npm meant.
          </p>
        </div>
      </div>
      <div class="console-readout">
        <dl class="console-readout-rows">
          <div>
            <dt>name</dt>
            <dd><span class="call-line">"{{ displayName(pkg) }}"</span></dd>
          </div>
          <div>
            <dt>latestVersion</dt>
            <dd class="console-accent">
              <UTooltip :text="pkg.latestVersion">
                <span class="call-line" tabindex="0">"{{ pkg.latestVersion }}"</span>
              </UTooltip>
            </dd>
          </div>
          <div>
            <dt>licenses</dt>
            <dd :class="{ 'call-dim': !pkg.licenses }">
              <span class="call-line">"{{ pkg.licenses }}"</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <ConsoleResponse :title="`registries_package(&quot;${sample.purl}&quot;)`" :text="response" />

    <footer class="console-footer console-footer-plain">
      <span aria-label="Supported hosts: AI SDK, MCP, Pi and OMP">AI SDK · MCP · Pi · OMP</span>
      <span class="console-meta">registries mcp · stdio</span>
    </footer>
  </section>
</template>

<style scoped>
.call-subject {
  position: relative;
  display: grid;
  gap: 16px;
  padding: 18px 20px 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M16 18h4m-2-2v4' fill='none' stroke='%23818a94' stroke-opacity='.1'/%3E%3C/svg%3E");
  background-size: 36px 36px;
  background-position: 24px 20px;
}
.call-subject > :not(.console-scan) {
  position: relative;
}
.call-identity {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.call-name {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.call-name h3 {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--ui-text-highlighted);
}
.call-note {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
.landing-call .console-readout-rows > div {
  grid-template-columns: 8.5rem minmax(0, 1fr);
}
.landing-call .console-readout-rows dt {
  text-transform: none;
  letter-spacing: 0.02em;
}
.call-dim {
  color: var(--ui-text-dimmed);
}
.call-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (width < 400px) {
  .call-subject {
    padding-inline: 14px;
  }
  .call-identity {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
