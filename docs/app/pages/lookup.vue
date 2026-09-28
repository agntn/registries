<script setup lang="ts">
import { version } from "../../../package.json";

definePageMeta({ layout: "default" });

const title = "Lookup";
const description =
  "Resolve any PURL against its registry through the docs worker and read the normalized answer";

useSeo({
  title,
  description,
  type: "article",
  breadcrumbs: [{ title, path: "/lookup" }],
});

defineOgImage(
  "Docs.takumi",
  { headline: "Explorer", title, description },
  { alt: "Lookup: any package URL resolved live against its registry" },
);

const lookup = useLookup();
</script>

<template>
  <div class="registries-landing not-prose">
    <header class="registries-hero hero-page lookup-hero">
      <div class="hero-zone">
        <span class="hero-cross hero-cross-tl" aria-hidden="true">+</span>
        <span class="hero-cross hero-cross-tr" aria-hidden="true">+</span>
        <span class="hero-bracket hero-bracket-l" aria-hidden="true" />
        <span class="hero-bracket hero-bracket-r" aria-hidden="true" />

        <p class="console-id">
          <span class="console-id-tag">ID</span>
          <span>lookup</span>
          <span class="console-id-sep" aria-hidden="true">/</span>
          <span>v{{ version }}</span>
        </p>

        <h1 class="hero-title">Any PURL. <span>Resolved live.</span></h1>
        <p class="hero-lead">
          Type a package URL, or the CLI shorthand without pkg:, and the docs worker runs the same
          four lookups the library exposes. Answers are cached for the library's own TTLs, so a demo
          doesn't turn into a stress test.
        </p>


        <p class="lookup-note">
          <span class="console-tag">Note</span>
          <span
            >Everything shown is what the registry said. Descriptions, keywords and maintainer names
            are data from a public API, not statements by this site.</span
          >
        </p>
      </div>

      <div class="hero-instrument hero-instrument-keep">
        <svg class="hero-circuit" viewBox="0 0 160 56" aria-hidden="true">
          <path class="hero-circuit-rail" d="M80 0V16L96 32V56" />
          <path class="hero-circuit-live" d="M80 0V16L96 32V56" pathLength="1" />
          <path class="hero-circuit-seg" d="M96 38V48" />
          <rect class="hero-circuit-node" x="92.5" y="52.5" width="7" height="7" />
        </svg>
        <span class="hero-circuit-tag" aria-hidden="true">input</span>
        <LookupSearch
          v-model="lookup.input.value"
          :busy="lookup.loading.value"
          @submit="lookup.run(lookup.operation.value, $event)"
        />
      </div>
    </header>

    <section class="registries-section">
      <div class="lookup-body">
        <LookupAnswer :lookup="lookup" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.lookup-hero {
  padding-top: 56px;
  padding-bottom: 56px;
}
.lookup-note {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
  max-width: 40rem;
  margin: 22px auto 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.55;
  text-align: left;
  color: var(--ui-text-muted);
}
.lookup-note > .console-tag {
  flex: none;
  margin: 0;
}
.lookup-body {
  width: 100%;
  max-width: var(--ui-container);
  margin-inline: auto;
  padding: 48px 2rem 72px;
}
@media (width >= 40rem) {
  .lookup-body {
    padding-inline: 3rem;
  }
}
@media (width >= 64rem) {
  .lookup-body {
    padding-inline: 4rem;
  }
}
</style>
