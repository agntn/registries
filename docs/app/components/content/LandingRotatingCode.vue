<script setup lang="ts">
import type { LookupSample } from "../../utils/landing-fixtures";
import { ECOSYSTEMS, adapterModule, ecosystemInfo } from "../../utils/registries";
import { tokens } from "../../utils/tokens";

const props = defineProps<{ sample: LookupSample }>();

const { copied, copy } = useCopied();

const info = computed(() => ecosystemInfo(props.sample.ecosystem));

/** Every sample gets the same nine lines, so the file keeps one height while the registry changes. */
const lines = computed(() => {
  const { purl, package: pkg, versionsTotal, dependenciesTotal, maintainersTotal } = props.sample;
  return [
    'import { createFromPURL } from "@agntn/registries";',
    "",
    `// ${info.value?.className ?? props.sample.ecosystem}, imported on the first create()`,
    `const [registry, name] = await createFromPURL("${purl}");`,
    "const pkg = await registry.fetchPackage(name);",
    "const versions = await registry.fetchVersions(name);",
    "const deps = await registry.fetchDependencies(name, pkg.latestVersion);",
    "const people = await registry.fetchMaintainers(name);",
    `// "${pkg.latestVersion}", ${versionsTotal} versions, ${dependenciesTotal} deps, ${maintainersTotal} maintainers`,
  ];
});
</script>
<template>
  <section class="tool-console landing-file" aria-label="The same calls on every registry">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title file-name"
        ><span class="console-tag">File</span
        ><Transition name="registries-roll" mode="out-in"
          ><span :key="sample.ecosystem" class="registries-roll-slot"
            >{{ sample.ecosystem }}.ts</span
          ></Transition
        ></span
      >
      <span class="console-meta">same calls · {{ ECOSYSTEMS.length }} registries</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.ecosystem" class="console-cursor" />
    </div>

    <div class="file-body">
      <p class="console-label console-rule-title">
        <span>Read <span aria-hidden="true">[ whichever registry the PURL names ]</span></span>
        <span class="console-mark" aria-hidden="true" />
        <UButton
          color="neutral"
          variant="subtle"
          :icon="copied === 'file' ? 'i-lucide-check' : 'i-lucide-copy'"
          :label="copied === 'file' ? 'copied' : 'copy'"
          :aria-label="copied === 'file' ? 'Copied' : 'Copy the file'"
          @click="copy('file', lines.join('\n'))"
        />
      </p>
      <!-- prettier-ignore -->
      <pre class="console-snippet console-lines file-lines"><code><span v-for="(line, index) in lines" :key="index"><span v-for="(token, part) in tokens(line)" :key="part" :class="token.cls">{{ token.text }}</span></span></code></pre>
    </div>

    <footer class="console-footer console-footer-plain">
      <NuxtLink :to="info?.to ?? '/registries'" class="file-link"
        ><span aria-hidden="true">→ </span>{{ info?.label ?? sample.ecosystem
        }}<span> · @agntn/registries/registries/{{ info ? adapterModule(info) : sample.ecosystem }}</span></NuxtLink
      >
      <span class="console-meta">lazy import</span>
    </footer>
  </section>
</template>

<style scoped>
.file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-name :deep(.registries-roll-slot) {
  display: inline;
}
.file-body {
  padding: 14px 20px 16px;
}
.file-body > .console-rule-title {
  margin-bottom: 10px;
}
/* One line per code line whatever the registry: long names end in an ellipsis, copy hands out the whole line. */
.file-lines > code > span {
  overflow: hidden;
  padding-left: calc(2.25em + 1em);
  text-indent: 0;
  text-overflow: ellipsis;
  white-space: pre;
}
.file-lines > code > span::before {
  margin-left: calc(-2.25em - 1em);
}
.file-lines > code > span :deep(*) {
  white-space: pre;
  overflow-wrap: normal;
}
.landing-file > .console-footer {
  flex-wrap: nowrap;
}
.landing-file > .console-footer > .console-meta {
  flex: none;
}
.file-link {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
.file-link > span:last-child {
  color: var(--ui-text-dimmed);
}
.file-link:hover {
  color: var(--console-accent);
}
.file-link:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 3px;
}
@media (width < 640px) {
  .file-body > .console-rule-title > .console-mark {
    display: none;
  }
}
@media (width < 400px) {
  .file-body {
    padding-inline: 14px;
  }
  .file-body > .console-rule-title > span:first-child > span {
    display: none;
  }
}
</style>
