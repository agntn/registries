<script setup lang="ts">
import { ecosystemInfo } from "../../utils/registries";

const props = defineProps<{ ecosystem: string }>();

const info = computed(() => ecosystemInfo(props.ecosystem));

const facts = computed(() => {
  const ecosystem = info.value;
  if (!ecosystem) {
    return [];
  }
  return [
    { label: "class", value: ecosystem.className, mono: true },
    { label: "purl type", value: `pkg:${ecosystem.key}`, mono: true },
    { label: "api", value: ecosystem.host, mono: true },
    { label: "version status", value: ecosystem.statuses, mono: false },
  ];
});
</script>

<template>
  <dl class="registries-frame not-prose my-6 grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-4">
    <div
      v-for="(fact, index) in facts"
      :key="fact.label"
      class="border-muted px-4 py-3.5"
      :class="{ 'border-t sm:border-t-0': index >= 2, 'border-l': index % 2 === 1, 'sm:border-l': index > 0 }"
    >
      <dt class="font-mono text-[10px] tracking-[0.12em] text-dimmed uppercase">{{ fact.label }}</dt>
      <dd class="mt-1 text-sm text-highlighted" :class="{ 'font-mono text-[13px]': fact.mono }">{{ fact.value }}</dd>
    </div>
  </dl>
</template>
