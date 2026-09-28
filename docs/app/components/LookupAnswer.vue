<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { Dependency, Maintainer } from "@agntn/registries";
import type { useLookup, WireVersion } from "../composables/useLookup";
import { bareUrl, dateOnly, displayName, pluralize, shortStamp, shortValue, webHref } from "../utils/format";
import { STACK } from "../utils/lookup-table";
import { LOOKUPS, ecosystemInfo, ecosystemOf, type LookupKey } from "../utils/registries";
import { ROSTER_TABLE_UI } from "../utils/roster";

/**
 * The answer to one PURL: the package on the subject band, the four lookups as tabs, the open one
 * as rows, the worker's whole answer in a dialog, and the same lookup as a CLI line.
 */
const props = defineProps<{ lookup: ReturnType<typeof useLookup> }>();

const { operation, purl, answers, loading, error } = props.lookup;

const { copied, copy } = useCopied();

const current = computed(() => LOOKUPS.find((lookup) => lookup.key === operation.value)!);
const info = computed(() => ecosystemInfo(ecosystemOf(purl.value)));
const pkg = computed(() => answers.package?.package);
const call = computed(() => `${current.value.method}FromPURL("${purl.value}")`);
const cli = computed(() => `registries ${current.value.cli} ${purl.value.replace(/^pkg:/u, "")}`);

const tabItems = LOOKUPS.map((lookup) => ({ label: lookup.label, icon: lookup.icon, value: lookup.key }));

/** What the open tab holds, as the worker sent it, for the dialog and its copy button. */
const raw = computed(() => {
  const answer = answers[operation.value];
  return answer ? JSON.stringify(answer, null, 2) : "";
});

const meta = computed(() => {
  if (loading.value) return `asking ${info.value?.host ?? "the registry"}`;
  if (error.value) return "no answer";
  const answer = answers[operation.value];
  if (!answer) return "";
  const fetched = `fetched ${shortStamp(answer.fetchedAt)}`;
  if (operation.value === "versions" && answers.versions) return `${answers.versions.total} total · ${fetched}`;
  return fetched;
});

const versionColumns: TableColumn<WireVersion>[] = [
  { accessorKey: "number", header: "Version" },
  { accessorKey: "publishedAt", header: "Published", meta: { class: { th: "w-[8rem]", td: STACK.end } } },
  { accessorKey: "licenses", header: "Licenses", meta: { class: { th: "w-[9rem]", td: STACK.lastStart } } },
  { accessorKey: "integrity", header: "Integrity", meta: { class: { th: "w-[13rem]", td: STACK.line } } },
  { accessorKey: "status", header: "Status", meta: { class: { th: "w-[8rem] text-end", td: `text-end ${STACK.lastEnd}` } } },
];

const dependencyColumns: TableColumn<Dependency>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "requirements", header: "Requirement", meta: { class: { th: "w-[14rem]", td: STACK.end } } },
  { accessorKey: "optional", header: "Optional", meta: { class: { th: "w-[7rem] text-end", td: `text-end ${STACK.lastEnd}` } } },
];

const maintainerColumns: TableColumn<Maintainer>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "login", header: "Login", meta: { class: { th: "w-[10rem]", td: STACK.end } } },
  { accessorKey: "role", header: "Role", meta: { class: { th: "w-[8rem]", td: STACK.lastStart } } },
  { accessorKey: "url", header: "Link", meta: { class: { th: "w-[14rem] text-end", td: `text-end ${STACK.lastEnd}` } } },
];

/** Dependencies by scope, runtime first as the registry lists them. */
const scopes = computed(() => {
  const groups = new Map<string, Dependency[]>();
  for (const dependency of answers.dependencies?.dependencies ?? []) {
    const scope = dependency.scope || "runtime";
    groups.set(scope, [...(groups.get(scope) ?? []), dependency]);
  }
  return [...groups.entries()];
});

function pick(value: string | number) {
  void props.lookup.run(value as LookupKey);
}
</script>

<template>
  <section class="tool-console console-wide answer not-prose" aria-label="Lookup answer">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <UTooltip :text="call">
        <span class="console-title" tabindex="0"
          ><span class="console-tag">{{ current.label }}</span>{{ current.method }}FromPURL(<span
            class="tok-str"
            >"{{ purl }}"</span
          >)</span
        >
      </UTooltip>
      <span class="console-meta">{{ meta }}</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span
        :key="`${purl}-${operation}`"
        class="console-cursor"
        :class="{ 'console-cursor-busy': loading }"
      />
    </div>

    <!-- The package the PURL names, whatever tab is open. -->
    <div class="console-band console-subject-band">
      <div :key="purl" class="console-scan" aria-hidden="true" />
      <div class="console-identity-block">
        <ConsoleReticle :key="purl" :icon="info?.icon ?? 'i-lucide-package'" />
        <div class="console-name">
          <span class="console-label"
            >Package / <span class="console-label-key">{{ info?.label ?? ecosystemOf(purl) }}</span></span
          >
          <h3 class="answer-name">
            <template v-if="pkg"
              >{{ displayName(pkg) }}
              <span class="console-accent">{{ pkg.latestVersion || "no latest" }}</span></template
            >
            <template v-else-if="error">no package</template>
            <template v-else>reading…</template>
          </h3>
          <!-- Registry text is data: interpolated, never rendered as markup. -->
          <p class="console-about">
            {{
              pkg
                ? pkg.description || "No description on the registry."
                : error || `Asking ${info?.host ?? "the registry"} through the docs worker.`
            }}
          </p>
        </div>
      </div>

      <div class="console-readout">
        <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
          <circle cx="3" cy="12" r="2.5" />
          <path d="M5.5 12H14L22 20H32" />
        </svg>
        <dl class="console-readout-rows">
          <div>
            <dt>Licenses</dt>
            <dd :class="{ 'answer-dim': !pkg?.licenses }">{{ pkg?.licenses || "none given" }}</dd>
          </div>
          <div>
            <dt>Repository</dt>
            <dd :class="{ 'answer-dim': !pkg?.repository }">
              <a v-if="webHref(pkg?.repository)" :href="webHref(pkg?.repository)" target="_blank" rel="noopener" class="answer-line">{{
                bareUrl(pkg?.repository ?? "")
              }}</a>
              <span v-else class="answer-line">{{ pkg?.repository || "none given" }}</span>
            </dd>
          </div>
          <div>
            <dt>Registry</dt>
            <dd :class="{ 'answer-dim': !answers.package }">
              <a
                v-if="webHref(answers.package?.urls.registry)"
                :href="webHref(answers.package?.urls.registry)"
                target="_blank"
                rel="noopener"
                class="answer-line"
                >{{ bareUrl(answers.package?.urls.registry ?? "") }}</a
              >
              <template v-else>{{ info?.host ?? "unknown" }}</template>
            </dd>
          </div>
          <div>
            <dt>Keywords</dt>
            <dd :class="{ 'answer-dim': !pkg?.keywords.length }">
              <span class="answer-line">{{ pkg?.keywords.length ? pkg.keywords.join(", ") : "none" }}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <UTabs
      :model-value="operation"
      :items="tabItems"
      :content="false"
      variant="link"
      class="answer-tabs"
      aria-label="Lookups"
      @update:model-value="pick"
    />

    <div v-if="loading" class="registries-band">
      <p class="registries-note" role="status">
        <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" aria-hidden="true" />
        Asking {{ info?.label ?? "the registry" }} for {{ current.label.toLowerCase() }}…
      </p>
    </div>
    <div v-else-if="error" class="registries-band">
      <UAlert color="error" variant="outline" icon="i-lucide-circle-x" :title="error" role="alert" />
    </div>

    <template v-else-if="operation === 'package' && answers.package">
      <dl class="answer-rows">
        <div>
          <dt>PURL</dt>
          <dd>{{ answers.package.urls.purl }}</dd>
        </div>
        <div>
          <dt>Homepage</dt>
          <dd :class="{ 'answer-dim': !answers.package.package.homepage }">
            <UTooltip v-if="webHref(answers.package.package.homepage)" :text="answers.package.package.homepage">
              <a :href="webHref(answers.package.package.homepage)" target="_blank" rel="noopener" class="answer-line">{{
                bareUrl(answers.package.package.homepage)
              }}</a>
            </UTooltip>
            <template v-else>{{ answers.package.package.homepage || "none given" }}</template>
          </dd>
        </div>
        <div>
          <dt>Docs</dt>
          <dd :class="{ 'answer-dim': !answers.package.urls.documentation }">
            <UTooltip v-if="webHref(answers.package.urls.documentation)" :text="answers.package.urls.documentation">
              <a :href="webHref(answers.package.urls.documentation)" target="_blank" rel="noopener" class="answer-line">{{
                bareUrl(answers.package.urls.documentation)
              }}</a>
            </UTooltip>
            <template v-else>{{ answers.package.urls.documentation || "none given" }}</template>
          </dd>
        </div>
        <div>
          <dt>Readme</dt>
          <dd :class="{ 'answer-dim': !answers.package.urls.readme }">
            <UTooltip v-if="webHref(answers.package.urls.readme)" :text="answers.package.urls.readme">
              <a :href="webHref(answers.package.urls.readme)" target="_blank" rel="noopener" class="answer-line">{{
                bareUrl(answers.package.urls.readme)
              }}</a>
            </UTooltip>
            <template v-else>{{ answers.package.urls.readme || "none given" }}</template>
          </dd>
        </div>
        <div>
          <dt>Metadata</dt>
          <dd :class="{ 'answer-dim': !Object.keys(answers.package.package.metadata).length }">
            {{
              Object.keys(answers.package.package.metadata).length
                ? Object.keys(answers.package.package.metadata).join(", ")
                : "nothing extra from this registry"
            }}
          </dd>
        </div>
      </dl>
    </template>

    <template v-else-if="operation === 'versions' && answers.versions">
      <UTable
        :data="answers.versions.versions"
        :columns="versionColumns"
        :get-row-id="(row) => row.number"
        :ui="ROSTER_TABLE_UI"
      >
        <template #number-cell="{ row }">
          <span class="registries-value">{{ row.original.number }}</span>
        </template>
        <template #publishedAt-cell="{ row }">
          <span class="list-amount" :class="{ 'list-sub': !row.original.publishedAt }">{{
            dateOnly(row.original.publishedAt) || "undated"
          }}</span>
        </template>
        <template #licenses-cell="{ row }">
          <span class="list-sub">{{ row.original.licenses || "none given" }}</span>
        </template>
        <template #integrity-cell="{ row }">
          <UTooltip v-if="row.original.integrity" :text="row.original.integrity">
            <span class="list-sub" tabindex="0">{{ shortValue(row.original.integrity, 24) }}</span>
          </UTooltip>
          <span v-else class="list-sub">none</span>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status ? 'primary' : 'neutral'"
            variant="outline"
            :label="row.original.status || 'ok'"
          />
        </template>
      </UTable>
      <p v-if="answers.versions.total > answers.versions.versions.length" class="registries-note list-empty list-more">
        {{ answers.versions.total }} versions in total, the newest {{ answers.versions.versions.length }} shown. The
        library returns them all.
      </p>
    </template>

    <template v-else-if="operation === 'dependencies' && answers.dependencies">
      <p class="registries-note list-empty">
        {{ pluralize(answers.dependencies.dependencies.length, "dependency", "dependencies") }} at
        {{ answers.dependencies.version
        }}{{ answers.dependencies.resolvedLatest ? ", the latest, because the PURL names no version" : "" }}.
      </p>
      <div v-for="[scope, rows] in scopes" :key="scope" class="answer-scope">
        <p class="console-label console-rule-title">
          <span>{{ scope }} <span aria-hidden="true">[ {{ rows.length }} ]</span></span>
          <span class="console-mark" aria-hidden="true" />
        </p>
        <UTable
          :data="rows"
          :columns="dependencyColumns"
          :get-row-id="(row) => `${scope}-${row.name}`"
          :ui="ROSTER_TABLE_UI"
        >
          <template #name-cell="{ row }">
            <span class="registries-value">{{ row.original.name }}</span>
          </template>
          <template #requirements-cell="{ row }">
            <span class="list-amount list-sub">{{ row.original.requirements || "*" }}</span>
          </template>
          <template #optional-cell="{ row }">
            <UBadge v-if="row.original.optional" color="neutral" variant="outline" label="optional" />
            <span v-else class="list-sub">no</span>
          </template>
        </UTable>
      </div>
    </template>

    <template v-else-if="operation === 'maintainers' && answers.maintainers">
      <p v-if="!answers.maintainers.maintainers.length" class="registries-note list-empty">
        The registry lists nobody for this package.
      </p>
      <UTable
        v-else
        :data="answers.maintainers.maintainers"
        :columns="maintainerColumns"
        :get-row-id="(row) => `${row.login}-${row.name}`"
        :ui="ROSTER_TABLE_UI"
      >
        <template #name-cell="{ row }">
          <span class="answer-person">{{ row.original.name || row.original.login || "unknown" }}</span>
        </template>
        <template #login-cell="{ row }">
          <span class="list-sub">{{ row.original.login || "none" }}</span>
        </template>
        <template #role-cell="{ row }">
          <UBadge v-if="row.original.role" color="neutral" variant="outline" :label="row.original.role" />
          <span v-else class="list-sub">none</span>
        </template>
        <template #url-cell="{ row }">
          <a v-if="webHref(row.original.url)" :href="webHref(row.original.url)" target="_blank" rel="noopener" class="list-link">{{
            shortValue(bareUrl(row.original.url), 32)
          }}</a>
          <span v-else class="list-sub">{{ row.original.url ? shortValue(row.original.url, 32) : "none" }}</span>
        </template>
      </UTable>
    </template>

    <ConsoleResponse
      v-if="raw"
      :title="call"
      :text="raw"
      label="Full answer"
      :source="`/api/${operation}`"
      description="The whole answer the docs worker returned, as JSON."
    />

    <footer class="console-footer console-footer-plain">
      <span class="answer-cli"
        ><span class="answer-prompt">$ </span>{{ cli }}
        <UButton
          color="neutral"
          variant="subtle"
          :icon="copied === 'cli' ? 'i-lucide-check' : 'i-lucide-copy'"
          :aria-label="copied === 'cli' ? 'Copied' : 'Copy the CLI command'"
          @click="copy('cli', cli)"
      /></span>
      <span class="console-meta">every state is a link</span>
    </footer>
  </section>
</template>

<style scoped>
.answer-name {
  overflow-wrap: anywhere;
}
.answer-dim {
  color: var(--ui-text-dimmed);
}
.answer-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.console-readout-rows a:hover,
.answer-rows a:hover {
  color: var(--console-accent);
}
.answer-tabs {
  padding: 0 20px;
  border-top: 1px solid var(--console-line);
}
.answer-rows {
  display: grid;
  margin: 0;
  padding: 6px 0;
}
.answer-rows > div {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 12px;
  padding: 7px 20px;
}
.answer-rows > div + div {
  box-shadow: inset 0 1px 0 var(--console-line);
}
.answer-rows dt {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ui-text-dimmed);
  padding-top: 2px;
}
.answer-rows dd {
  margin: 0;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ui-text-highlighted);
  overflow-wrap: anywhere;
}
.answer-scope > .console-rule-title {
  margin: 14px 20px 6px;
}
.answer-person {
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--ui-text-highlighted);
}
.answer-cli {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-family: var(--font-mono);
  overflow-wrap: anywhere;
}
.answer-prompt {
  color: var(--ui-text-dimmed);
}
@media (width < 640px) {
  .answer-tabs {
    padding: 0 14px;
    overflow-x: auto;
  }
  .answer-tabs :deep([data-slot="leadingIcon"]) {
    display: none;
  }
  .answer-rows > div {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
    padding-inline: 14px;
  }
  .answer-scope > .console-rule-title {
    margin-inline: 14px;
  }
}
</style>
