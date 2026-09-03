<script setup lang="ts">
definePageMeta({ layout: "default" });

useSeoMeta({
  title: "Lookup · @agntn/registries",
  description: "Resolve any PURL against its registry through the docs worker and see the normalized answer.",
});
</script>

<template>
  <div class="registries-landing not-prose">
    <ToolHero
      eyebrow="explorer"
      title="Any PURL."
      accent="Resolved live."
      description="Type a package URL, or the CLI shorthand without pkg:, and the docs worker runs the same four lookups the library exposes. Answers are cached for the library's own TTLs, so a demo does not turn into a stress test."
    >
      <p class="registries-enter registries-enter-3 mx-auto mt-5 inline-flex max-w-xl items-start gap-2 text-left text-sm leading-6 text-dimmed">
        <UIcon name="i-lucide-shield-alert" class="mt-1 size-4 shrink-0 text-primary" />
        <span>Everything shown is what the registry said. Descriptions, keywords and maintainer names are data from a public API, not statements by this site.</span>
      </p>
    </ToolHero>

    <section class="registries-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-12 sm:px-12 lg:px-16">
        <LookupExplorer />
      </div>
    </section>
  </div>
</template>
