<script setup lang="ts">
import { version } from "../../../../package.json";
import { HOSTS, LOOKUPS } from "../../utils/registries";

const INSTALL = "pnpm add @agntn/registries";

/** The shipped adapters come from the library's manifest, read by the worker and baked in at prerender. */
const { data } = await useFetch("/api/ecosystems");
const registries = computed(() => data.value?.ecosystems.length ?? 0);

const router = useRouter();
const input = ref("pkg:npm/lodash");

function lookUp(purl: string) {
  void router.push({ path: "/lookup", query: { purl, op: "package" } });
}

const { copied, copy } = useCopied();
</script>

<template>
  <header class="registries-hero hero-page">
    <div class="hero-zone">
      <span class="hero-cross hero-cross-tl" aria-hidden="true">+</span>
      <span class="hero-cross hero-cross-tr" aria-hidden="true">+</span>
      <span class="hero-bracket hero-bracket-l" aria-hidden="true" />
      <span class="hero-bracket hero-bracket-r" aria-hidden="true" />

      <p class="console-id">
        <span class="console-id-tag">ID</span>
        <span>@agntn/registries</span>
        <span class="console-id-sep" aria-hidden="true">/</span>
        <span>v{{ version }}</span>
      </p>

      <h1 class="hero-title">One PURL. <span>Every registry.</span></h1>
      <p class="hero-lead">
        One TypeScript interface over npm, PyPI, crates.io, RubyGems, Packagist and Arch Linux.
        Package, versions, dependencies and maintainers come back in the same shape, from a CLI, a
        library call or an AI SDK tool. The registries keep their quirks to themselves.
      </p>

      <dl class="hero-metrics">
        <div>
          <dt>Registries</dt>
          <dd>{{ registries }}</dd>
          <dd class="hero-metric-sub">{{ HOSTS.length }} API hosts</dd>
        </div>
        <div>
          <dt>Lookups</dt>
          <dd>{{ LOOKUPS.length }}</dd>
          <dd class="hero-metric-sub">one shape each</dd>
        </div>
        <div>
          <dt>No key</dt>
          <dd class="hero-metric-accent">{{ registries }} <span>registries</span></dd>
          <dd class="hero-metric-sub">public APIs only</dd>
        </div>
      </dl>

      <div class="console-actions">
        <UButton
          to="/guide"
          color="primary"
          variant="solid"
          trailing-icon="i-lucide-arrow-right"
          label="Get started"
        />
        <UButton
          to="https://github.com/agntn/registries"
          target="_blank"
          color="neutral"
          variant="outline"
          icon="i-simple-icons-github"
          label="Star on GitHub"
        />
      </div>
      <div class="console-install">
        <span class="console-install-tag">Install</span>
        <code><span class="console-install-prompt">$</span> {{ INSTALL }}</code>
        <UButton
          color="neutral"
          variant="subtle"
          :icon="copied === 'install' ? 'i-lucide-check' : 'i-lucide-copy'"
          :aria-label="copied === 'install' ? 'Copied' : 'Copy install command'"
          @click="copy('install', INSTALL)"
        />
      </div>
    </div>

    <!-- The form is the real explorer, not a picture of one: a lookup opens its answer. -->
    <div class="hero-instrument hero-instrument-keep">
      <svg class="hero-circuit" viewBox="0 0 160 56" aria-hidden="true">
        <path class="hero-circuit-rail" d="M80 0V16L96 32V56" />
        <path class="hero-circuit-live" d="M80 0V16L96 32V56" pathLength="1" />
        <path class="hero-circuit-seg" d="M96 38V48" />
        <rect class="hero-circuit-node" x="92.5" y="52.5" width="7" height="7" />
      </svg>
      <span class="hero-circuit-tag" aria-hidden="true">look up</span>
      <LookupSearch v-model="input" @submit="lookUp" />
    </div>
  </header>
</template>
