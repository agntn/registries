<script setup lang="ts">
import type { LookupSample } from "../../utils/landing-fixtures";
import { bareUrl, dateOnly, displayName } from "../../utils/format";
import { ecosystemLabel } from "../../utils/registries";

const props = defineProps<{ sample: LookupSample; tick: number }>();

defineEmits<{ step: [delta: number]; pause: [paused: boolean] }>();

const pkg = computed(() => props.sample.package);
const fullName = computed(() => displayName(pkg.value));
</script>

<template>
  <div class="registries-frame overflow-hidden rounded-xl" @mouseenter="$emit('pause', true)" @mouseleave="$emit('pause', false)">
    <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
      <p class="font-mono text-xs text-muted">
        <span class="text-dimmed">await</span>
        <span class="ms-2 text-highlighted">fetchPackageFromPURL(<span class="tok-str">"<Transition name="registries-roll" mode="out-in"><span :key="sample.purl" class="registries-roll-slot">{{ sample.purl }}</span></Transition>"</span>)</span>
      </p>
      <div class="flex items-center gap-1">
        <span class="registries-state" :class="sample.live ? 'registries-state-ok' : ''">{{ sample.live ? "live" : "sample" }}</span>
        <button type="button" class="registries-copy" aria-label="Previous package" @click="$emit('step', -1)">
          <UIcon name="i-lucide-chevron-left" class="size-3.5" />
        </button>
        <button type="button" class="registries-copy" aria-label="Next package" @click="$emit('step', 1)">
          <UIcon name="i-lucide-chevron-right" class="size-3.5" />
        </button>
      </div>
    </div>
    <div :key="sample.purl" class="registries-derive">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-4">
        <span class="font-mono text-base text-highlighted">{{ fullName }}</span>
        <span class="font-mono text-sm text-primary">{{ pkg.latestVersion }}</span>
        <span class="font-mono text-[11px] text-dimmed">{{ ecosystemLabel(sample.ecosystem) }}</span>
      </div>
      <p class="px-4 pt-1 text-sm text-muted">{{ pkg.description || "No description on the registry." }}</p>
      <dl class="registries-kv">
        <dt>licenses</dt>
        <dd class="font-mono text-[13px]">{{ pkg.licenses || "none" }}</dd>
        <dt>repository</dt>
        <dd class="font-mono text-[13px]">{{ pkg.repository ? bareUrl(pkg.repository) : "none" }}</dd>
        <dt>homepage</dt>
        <dd class="font-mono text-[13px]">{{ pkg.homepage ? bareUrl(pkg.homepage) : "none" }}</dd>
        <dt>versions</dt>
        <dd>
          <span class="font-mono text-[13px]">{{ sample.versionsTotal }}</span>
          <span v-if="sample.versions[0]" class="ms-2 font-mono text-[11px] text-dimmed">newest {{ sample.versions[0].number }} · {{ dateOnly(sample.versions[0].publishedAt) }}</span>
        </dd>
        <dt>keywords</dt>
        <dd class="text-[13px] text-muted">{{ pkg.keywords.length ? pkg.keywords.slice(0, 6).join(", ") : "none" }}</dd>
      </dl>
    </div>
  </div>
</template>
