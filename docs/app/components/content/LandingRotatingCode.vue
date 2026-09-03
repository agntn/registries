<script setup lang="ts">
import type { LookupSample } from "../../utils/landing-fixtures";
import { ecosystemInfo } from "../../utils/registries";

const props = defineProps<{ sample: LookupSample }>();

const info = computed(() => ecosystemInfo(props.sample.ecosystem));
const fileName = computed(() => `${props.sample.ecosystem}.ts`);
const licenses = computed(() => props.sample.package.licenses || "");
</script>

<template>
  <div class="registries-frame overflow-hidden rounded-xl">
    <div class="flex items-center gap-2 border-b border-muted px-4 py-3">
      <span class="font-mono text-[10px] font-bold text-primary">TS</span>
      <span class="text-sm text-default">
        <Transition name="registries-roll" mode="out-in">
          <span :key="fileName">{{ fileName }}</span>
        </Transition>
      </span>
    </div>
    <pre class="registries-rotating"><code><span class="tok-kw">import</span> { fetchPackageFromPURL } <span class="tok-kw">from</span> <span class="tok-str">"@agntn/registries"</span>;

<span class="tok-kw">const</span> pkg = <span class="tok-kw">await</span> <span class="tok-fn">fetchPackageFromPURL</span>(<span class="tok-str">"<Transition name="registries-roll" mode="out-in"><span :key="sample.purl" class="registries-roll-slot">{{ sample.purl }}</span></Transition>"</span>);

pkg.latestVersion; <span class="tok-cm">// "<Transition name="registries-roll" mode="out-in"><span :key="sample.package.latestVersion" class="registries-roll-slot">{{ sample.package.latestVersion }}</span></Transition>"</span>
pkg.licenses;      <span class="tok-cm">// "<Transition name="registries-roll" mode="out-in"><span :key="licenses" class="registries-roll-slot">{{ licenses }}</span></Transition>"</span>
pkg.repository;    <span class="tok-cm">// "<Transition name="registries-roll" mode="out-in"><span :key="sample.package.repository" class="registries-roll-slot">{{ sample.package.repository || "" }}</span></Transition>"</span>

<span class="tok-cm">// same shape from <Transition name="registries-roll" mode="out-in"><span :key="sample.ecosystem" class="registries-roll-slot">{{ info?.className ?? sample.ecosystem }}</span></Transition> as from every other adapter</span></code></pre>
  </div>
</template>
