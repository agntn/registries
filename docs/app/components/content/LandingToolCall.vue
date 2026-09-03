<script setup lang="ts">
import type { LookupSample } from "../../utils/landing-fixtures";

const props = defineProps<{ sample: LookupSample }>();

const keywords = computed(() => JSON.stringify(props.sample.package.keywords.slice(0, 3)));
</script>

<template>
  <div class="registries-frame overflow-hidden rounded-xl">
    <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
      <p class="font-mono text-xs text-muted">
        <span class="text-dimmed">tool</span>
        <span class="ms-2 text-highlighted">packageTool</span>
      </p>
      <p class="font-mono text-[11px] text-dimmed">@agntn/registries/ai · Vercel AI SDK</p>
    </div>
    <div class="divide-y divide-muted">
      <div class="px-4 py-4">
        <p class="registries-eyebrow mb-3">input</p>
        <pre class="registries-tool"><code>{
  <span class="tok-key">"operation"</span>: <span class="tok-str">"package"</span>,
  <span class="tok-key">"purl"</span>: <span class="tok-str">"<Transition name="registries-roll" mode="out-in"><span :key="sample.purl" class="registries-roll-slot">{{ sample.purl }}</span></Transition>"</span>
}</code></pre>
      </div>
      <div class="px-4 py-4">
        <p class="registries-eyebrow mb-3">output</p>
        <pre :key="sample.purl" class="registries-tool registries-derive"><code>{
  <span class="tok-key">"name"</span>: <span class="tok-str">"{{ sample.package.name }}"</span>,
  <span class="tok-key">"namespace"</span>: <span class="tok-str">"{{ sample.package.namespace }}"</span>,
  <span class="tok-key">"latestVersion"</span>: <span class="tok-str">"{{ sample.package.latestVersion }}"</span>,
  <span class="tok-key">"licenses"</span>: <span class="tok-str">"{{ sample.package.licenses }}"</span>,
  <span class="tok-key">"repository"</span>: <span class="tok-str">"{{ sample.package.repository }}"</span>,
  <span class="tok-key">"keywords"</span>: <span class="tok-str">{{ keywords }}</span>,
  <span class="tok-cm">…</span>
}</code></pre>
      </div>
    </div>
  </div>
</template>
