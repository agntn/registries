<script setup lang="ts">
import { withScheme } from "../utils/format";
import { ECOSYSTEMS, ecosystemInfo, ecosystemOf } from "../utils/registries";

/**
 * The lookup form: one PURL in a readout row, the registry it names under it, an action and the
 * example of every registry. The landing sends a lookup to /lookup, the explorer runs it in place.
 */
const props = withDefaults(
  defineProps<{
    /** Show the example chips under the input. */
    examples?: boolean;
    /** A lookup is in flight, so the ruler keeps moving. */
    busy?: boolean;
  }>(),
  { examples: true, busy: false },
);

const emit = defineEmits<{ submit: [purl: string] }>();

const input = defineModel<string>({ default: "pkg:npm/lodash" });
const problem = ref("");

const ecosystem = computed(() => ecosystemOf(input.value));
const info = computed(() => (input.value.trim() ? ecosystemInfo(ecosystem.value) : undefined));
const call = computed(() => withScheme(input.value || "pkg:npm/lodash"));

function submit() {
  const value = input.value.trim();
  if (!value) {
    problem.value = "Type a package URL first, like pkg:npm/lodash, or the shorthand npm/lodash.";
    return;
  }
  problem.value = "";
  emit("submit", withScheme(value));
}

function pick(example: string) {
  input.value = example;
  submit();
}
</script>

<template>
  <form class="tool-console console-wide search not-prose" role="search" @submit.prevent="submit">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <UTooltip :text="`fetchPackageFromPURL(&quot;${call}&quot;)`">
        <span class="console-title" tabindex="0"
          ><span class="console-tag">Call</span>fetchPackageFromPURL(<span class="tok-str"
            >"{{ call }}"</span
          >)</span
        >
      </UTooltip>
      <span class="console-meta">{{ ECOSYSTEMS.length }} registries</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :class="props.busy ? 'console-cursor console-cursor-busy' : 'console-cursor'" />
    </div>

    <div class="registries-band search-band">
      <div class="search-glyph" aria-hidden="true">
        <ConsoleReticle :key="info?.key ?? 'none'" :icon="info?.icon ?? 'i-lucide-package'" />
      </div>
      <div class="search-fields">
        <div class="console-readout">
          <dl class="console-readout-rows">
            <div>
              <dt><label for="lookup-purl">PURL</label></dt>
              <dd>
                <UInput
                  id="lookup-purl"
                  v-model="input"
                  variant="none"
                  placeholder="pkg:npm/lodash or cargo/serde@1.0.0"
                  spellcheck="false"
                  autocomplete="off"
                  :maxlength="512"
                  class="w-full"
                />
              </dd>
            </div>
            <div>
              <dt>Registry</dt>
              <dd :class="info ? 'console-accent' : 'search-idle'">
                <template v-if="info">{{ info.label }} · {{ info.className }}</template>
                <template v-else-if="input.trim()">no adapter for pkg:{{ ecosystem }}</template>
                <template v-else>nothing typed yet</template>
              </dd>
            </div>
            <div>
              <dt>Host</dt>
              <dd :class="{ 'search-idle': !info }">{{ info?.host ?? "none" }}</dd>
            </div>
          </dl>
        </div>
        <p v-if="problem" class="registries-error search-problem" role="alert">
          <span class="console-tag">Input</span>{{ problem }}
        </p>
        <div class="search-actions">
          <UButton
            type="submit"
            color="primary"
            variant="solid"
            trailing-icon="i-lucide-arrow-right"
            label="Look up"
          />
          <div v-if="examples" class="search-examples" aria-label="Examples">
            <UButton
              v-for="example in ECOSYSTEMS"
              :key="example.key"
              :color="info?.key === example.key && input === example.example ? 'primary' : 'neutral'"
              variant="chip"
              :icon="example.icon"
              :label="example.example.replace('pkg:', '')"
              @click="pick(example.example)"
            />
          </div>
        </div>
      </div>
    </div>

    <footer class="console-footer console-footer-plain">
      <ul class="console-links">
        <li>
          <NuxtLink to="/registries"><span aria-hidden="true">→ </span>Registries</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/guide/purl"><span aria-hidden="true">→ </span>PURL</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/guide/explorer"><span aria-hidden="true">→ </span>How it works</NuxtLink>
        </li>
      </ul>
      <span class="console-meta">read through the docs worker</span>
    </footer>
  </form>
</template>

<style scoped>
.search-band {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.search-glyph {
  width: 84px;
}
.search-fields {
  display: grid;
  gap: 14px;
  min-width: 0;
}
.search-fields .console-readout-rows > div {
  grid-template-columns: 6.5rem minmax(0, 1fr);
}
.search-idle {
  color: var(--ui-text-dimmed);
}
.search-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}
.search-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
@media (width < 640px) {
  .search-band {
    grid-template-columns: minmax(0, 1fr);
  }
  .search-glyph {
    display: none;
  }
  .search-fields .console-readout-rows > div {
    grid-template-columns: 5rem minmax(0, 1fr);
  }
}
</style>
