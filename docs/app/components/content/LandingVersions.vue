<script setup lang="ts">
import type { LookupSample } from "../../utils/landing-fixtures";
import { dateOnly } from "../../utils/format";

defineProps<{ sample: LookupSample }>();
</script>

<template>
  <div class="registries-frame overflow-hidden rounded-xl">
    <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
      <p class="font-mono text-xs text-muted">
        <span class="text-dimmed">$</span>
        <span class="ms-2 text-highlighted">registries versions <Transition name="registries-roll" mode="out-in"><span :key="sample.purl" class="registries-roll-slot">{{ sample.purl.replace("pkg:", "") }}</span></Transition> --limit 4</span>
      </p>
      <p class="font-mono text-[11px] text-dimmed">{{ sample.versionsTotal }} total</p>
    </div>
    <div :key="sample.purl" class="registries-table-wrap registries-derive">
      <table class="registries-table">
        <thead>
          <tr><th>version</th><th>published</th><th>licenses</th><th>status</th></tr>
        </thead>
        <tbody>
          <tr v-for="version in sample.versions" :key="version.number">
            <td class="font-mono text-[13px] text-highlighted">{{ version.number }}</td>
            <td class="font-mono text-xs text-muted">{{ dateOnly(version.publishedAt) || "none" }}</td>
            <td class="font-mono text-xs text-muted">{{ version.licenses || "none" }}</td>
            <td><span class="registries-state" :class="version.status ? 'registries-state-warn' : 'registries-state-ok'">{{ version.status || "ok" }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="border-t border-muted px-4 py-3">
      <p class="font-mono text-[11px] text-dimmed">
        <span class="text-highlighted">{{ sample.dependenciesTotal }}</span> dependencies at {{ sample.package.latestVersion }}
        <span class="mx-1">·</span>
        <span class="text-highlighted">{{ sample.maintainersTotal }}</span> maintainers
      </p>
    </div>
  </div>
</template>
