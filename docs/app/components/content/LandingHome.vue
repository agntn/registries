<script setup lang="ts">
import { ECOSYSTEMS } from "../../utils/registries";

const { samples, tick, index, paused, current, step } = useLandingLookup();

const stats = [
  { value: "6", label: "registries" },
  { value: "4", label: "lookups" },
  { value: "1", label: "package shape" },
  { value: "5", label: "AI tool operations" },
] as const;

const copied = ref(false);

async function copyInstall() {
  try {
    await navigator.clipboard.writeText("pnpm add @agntn/registries");
  } catch {
    return;
  }
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1200);
}
</script>

<template>
  <div class="registries-landing not-prose">
    <header class="registries-hero mx-auto w-full max-w-[var(--ui-container)] px-8 pt-24 pb-20 text-center sm:px-12 lg:px-16">
      <h1 class="registries-enter mx-auto max-w-3xl text-4xl leading-[1.08] font-medium tracking-tight text-highlighted sm:text-5xl lg:text-[3.75rem]">
        One PURL. <span class="text-primary">Every registry.</span>
      </h1>
      <p class="registries-enter registries-enter-2 mx-auto mt-6 max-w-xl text-base leading-7 text-muted">
        One TypeScript interface over npm, PyPI, crates.io, RubyGems, Packagist and Arch Linux.
        Package, versions, dependencies and maintainers come back in the same shape, from a CLI,
        a library call, or an AI SDK tool.
      </p>
      <div class="registries-enter registries-enter-3 mt-8 flex flex-wrap items-center justify-center gap-2">
        <UButton to="/guide" color="primary" trailing-icon="i-lucide-arrow-right">
          Get started
        </UButton>
        <UButton to="https://github.com/agntn/registries" target="_blank" color="neutral" variant="outline" icon="i-simple-icons-github">
          Star on GitHub
        </UButton>
      </div>
      <button
        type="button"
        class="registries-enter registries-enter-4 registries-install mt-5"
        :aria-label="copied ? 'Copied' : 'Copy install command'"
        @click="copyInstall"
      >
        <span class="text-dimmed">$</span>
        <span>pnpm add @agntn/registries</span>
        <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5 text-dimmed" />
      </button>

      <div
        class="registries-enter registries-enter-4 mx-auto mt-16 hidden max-w-6xl md:block"
        @mouseenter="paused = true"
        @mouseleave="paused = false"
      >
        <LandingFlow :sample="current" :tick="tick" />
      </div>
    </header>

    <dl class="registries-section grid grid-cols-2 sm:grid-cols-4">
      <div
        v-for="(stat, i) in stats"
        :key="stat.label"
        class="border-default px-6 py-7 text-center"
        :class="{ 'border-t sm:border-t-0': i >= 2, 'border-l': i % 2 === 1, 'sm:border-l': i > 0 }"
      >
        <dd class="font-mono text-2xl text-highlighted">{{ stat.value }}</dd>
        <dt class="mt-1 font-mono text-[11px] tracking-[0.12em] text-dimmed uppercase">{{ stat.label }}</dt>
      </div>
    </dl>

    <LandingFeature
      eyebrow="Lookups"
      title="PURL in, package out"
      to="/lookup"
      link="Open the lookup explorer"
      :checks="[
        'pkg:npm/lodash, pkg:cargo/serde, pkg:alpm/aur/paru: one addressing scheme, ECMA-427',
        'License normalized to SPDX, repository URL canonicalized, versions dated',
        'A missing package is a typed NotFoundError, never an empty object',
      ]"
    >
      A package URL names the ecosystem, the namespace, the name and the version. The library
      parses it once, picks the adapter, asks the registry, and hands back one
      <code class="font-mono text-[13px] text-highlighted">Package</code>. The panel cycles through
      {{ samples.length }} packages and swaps each recorded sample for the docs worker's live answer.
      <template #visual>
        <LandingPackage :sample="current" :tick="tick" @step="step" @pause="paused = $event" />
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="One interface"
      title="Same calls, every adapter"
      to="/guide/lookups"
      link="Package, versions, dependencies, maintainers"
      :checks="[
        'fetchPackage, fetchVersions, fetchDependencies, fetchMaintainers on every registry',
        'Adapters register themselves; create(\'npm\') resolves the class, no switch statement',
        'Bring your own Client for retries, timeouts, rate limiting and a User-Agent',
      ]"
      reverse
    >
      Every registry is a class with the same four methods and a URL builder. Swap the PURL and
      the rest of the code stays. Upstream quirks, from npm's dist-tags to the AUR's RPC, are
      normalized inside the adapter and never leak through the public types.
      <template #visual>
        <LandingRotatingCode :sample="current" />
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="CLI and cache"
      title="A terminal client with a lockfile"
      to="/guide/cli"
      link="The command line"
      :checks="[
        'registries info, versions, deps, maintainers, with --json for scripts',
        'Cache on unstorage with sha256 integrity and a TTL per data type',
        'Filesystem by default, any unstorage driver on the edge',
      ]"
    >
      The same lookups from a shell. Answers are cached under the platform cache directory with
      a lockfile that records when each entry was fetched and how long it stays fresh, so a
      second call for the same package never leaves the machine.
      <template #visual>
        <LandingVersions :sample="current" />
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Registries"
      title="Six adapters, one shape"
      to="/registries"
      link="All registries"
      :checks="[
        'npm scopes, Composer vendors and Arch namespaces handled in the PURL',
        'Yanked, deprecated and flagged versions carry a status, not a footnote',
        'A custom adapter is one class and one register() call',
      ]"
      reverse
    >
      Each adapter maps one registry API onto the shared types. Adding one means writing the
      mapping, not the HTTP client, the retry policy or the cache.
      <template #visual>
        <div class="registries-frame grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-3">
          <NuxtLink
            v-for="(ecosystem, i) in ECOSYSTEMS"
            :key="ecosystem.to"
            :to="ecosystem.to"
            class="group flex flex-col gap-3 border-muted px-5 py-5 transition-colors duration-500 hover:bg-muted"
            :class="{
              'border-t': i >= 2,
              'sm:border-t-0': i < 3,
              'border-l': i % 2 === 1,
              'sm:border-l': i % 3 !== 0,
              'registries-cell-active': i === index,
            }"
          >
            <UIcon
              :name="ecosystem.icon"
              class="size-5 text-muted transition-colors duration-500 group-hover:text-primary"
              :class="{ 'text-primary': i === index }"
            />
            <span>
              <span class="block text-sm font-medium text-highlighted">{{ ecosystem.label }}</span>
              <span class="mt-0.5 block font-mono text-[11px] text-dimmed">pkg:{{ ecosystem.key }} · {{ ecosystem.host.split(",")[0] }}</span>
            </span>
          </NuxtLink>
        </div>
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Agents"
      title="One tool for the AI SDK"
      to="/guide/agents"
      link="The package tool"
      :checks="[
        'package, versions, dependencies, maintainers and bulk-packages behind one input schema',
        'Input validated with Zod, abort signal passed through to every registry call',
        'Bulk lookups skip a failed package instead of failing the batch',
      ]"
    >
      <code class="font-mono text-[13px] text-highlighted">packageTool</code> from the
      <code class="font-mono text-[13px] text-highlighted">/ai</code> subpath is a Vercel AI SDK
      tool that needs no wiring. Hand it to a model and it resolves any PURL it is asked about, with the
      same normalized answer the CLI prints.
      <template #visual>
        <LandingToolCall :sample="current" />
      </template>
    </LandingFeature>

    <section class="registries-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-20 text-center sm:px-12 lg:px-16">
        <h2 class="text-2xl font-medium tracking-tight text-highlighted sm:text-3xl">
          Start with one command
        </h2>
        <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
          Pre-1.0. Pin exact versions, and treat registry metadata as data you did not write.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-2">
          <UButton to="/guide" color="primary" trailing-icon="i-lucide-arrow-right">
            Read the guide
          </UButton>
          <UButton to="/lookup" color="neutral" variant="outline">
            Open the explorer
          </UButton>
        </div>
      </div>
    </section>
  </div>
</template>
