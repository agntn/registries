<script setup lang="ts">
import { ECOSYSTEMS } from "../../utils/registries";

const { samples, paused, current, step } = useLandingLookup();
</script>

<template>
  <div class="registries-landing not-prose">
    <LandingHero />

    <LandingFeature
      title="PURL in, package out"
      to="/guide/purl"
      link="Package URLs"
      :checks="[
        'pkg:npm/lodash, pkg:cargo/serde, pkg:alpm/aur/paru: one addressing scheme, ECMA-427',
        'License normalized to SPDX, repository URL canonicalized, versions dated',
        'A missing package is a typed NotFoundError, never an empty object',
      ]"
    >
      A package URL names the ecosystem, the namespace, the name and the version. The library
      parses it once, picks the adapter, asks the registry and hands back one
      <code class="registries-code">Package</code>. This panel walks through
      {{ samples.length }} packages. Each one starts as a recorded sample and gets swapped for the
      docs worker's live answer the moment it lands.
      <template #visual>
        <LandingPackage :sample="current" @step="step" @pause="paused = $event" />
      </template>
    </LandingFeature>

    <LandingFeature
      title="Same calls, every adapter"
      to="/guide/lookups"
      link="Package, versions, dependencies, maintainers"
      :checks="[
        'fetchPackage, fetchVersions, fetchDependencies, fetchMaintainers on every registry',
        'create(\'npm\') imports one adapter on first use, nothing runs at import, no switch statement',
        'Bring your own Client for retries, timeouts, rate limiting and a User-Agent',
      ]"
      reverse
    >
      Every registry is a class with the same four methods and a URL builder. Swap the PURL and
      the rest of the code stays. Upstream quirks, from npm's dist-tags to the AUR's RPC, stay
      inside the adapter and never leak through the public types.
      <template #visual>
        <LandingRotatingCode :sample="current" />
      </template>
    </LandingFeature>

    <LandingFeature
      title="A terminal client with a lockfile"
      to="/guide/cli"
      link="The command line"
      :checks="[
        'registries info, versions, deps, maintainers, with --json for scripts',
        'Cache on unstorage with sha256 integrity and a TTL per data type',
        'Filesystem by default, any unstorage driver on the edge',
      ]"
    >
      The same lookups from a shell. Answers land in the platform cache directory with a lockfile
      that records when each entry was fetched and how long it stays fresh. The second call for
      the same package never leaves the machine.
      <template #visual>
        <LandingVersions :sample="current" />
      </template>
    </LandingFeature>

    <section class="registries-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-20 sm:px-12 lg:px-16">
        <div class="max-w-2xl">
          <h2 class="text-2xl font-medium tracking-tight text-highlighted sm:text-[1.75rem]">
            {{ ECOSYSTEMS.length }} adapters, one shape
          </h2>
          <p class="mt-4 text-sm leading-6 text-muted">
            npm hides deprecation in a version field, crates.io yanks, Packagist marks nothing at
            all, and Arch splits into the official repos and the AUR. Each adapter maps its API
            onto the shared types and keeps the rest to itself. Adding one means writing that
            mapping, not the HTTP client, the retry policy or the cache.
          </p>
          <p class="landing-entry">
            <span class="console-tag">Import</span>
            <code>@agntn/registries/registries/&lt;name&gt;</code>
          </p>
        </div>
        <RegistryMatrix class="mt-10" />
      </div>
    </section>

    <LandingFeature
      title="One tool call, four hosts"
      to="/guide/agents"
      link="Agents"
      :checks="[
        'packageTool on the /ai subpath: package, versions, dependencies, maintainers and bulk-packages behind one input schema',
        'registries mcp serves the same lookups over stdio, and the Pi and OMP extensions render them in a terminal',
        'Bulk lookups skip a failed package instead of failing the batch',
      ]"
      reverse
    >
      <code class="registries-code">packageTool</code> is a Vercel AI SDK tool that needs no
      wiring. The MCP server and the Pi and OMP extensions go through the same helpers, so a model
      asking about a PURL gets the same normalized answer the CLI prints. A description that says
      "ignore previous instructions" is still just a description.
      <template #visual>
        <LandingToolCall :sample="current" />
      </template>
    </LandingFeature>

    <section class="registries-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-20 sm:px-12 lg:px-16">
        <LandingStart />
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing-entry {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 20px 0 0;
  min-width: 0;
}
.landing-entry > .console-tag {
  flex: none;
  margin: 0;
}
.landing-entry > code {
  min-width: 0;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
</style>
