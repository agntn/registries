<script setup lang="ts">
import type { Dependency, Maintainer, Package } from "@agntn/registries";
import { bareUrl, dateOnly, displayName, pluralize, shortValue, withScheme } from "../../utils/format";
import { ECOSYSTEMS, ecosystemInfo, ecosystemLabel, ecosystemOf } from "../../utils/registries";

interface PackageAnswer {
  purl: string;
  ecosystem: string;
  name: string;
  package: Package;
  urls: { registry: string; documentation: string; readme: string; purl: string };
  fetchedAt: string;
}

interface WireVersion {
  number: string;
  publishedAt: string | null;
  licenses: string;
  integrity: string;
  status: string;
}

interface VersionsAnswer {
  total: number;
  versions: WireVersion[];
  fetchedAt: string;
}

interface DependenciesAnswer {
  version: string;
  resolvedLatest: boolean;
  dependencies: Dependency[];
  fetchedAt: string;
}

interface MaintainersAnswer {
  maintainers: Maintainer[];
  fetchedAt: string;
}

type Operation = "package" | "versions" | "dependencies" | "maintainers";

const OPERATIONS: ReadonlyArray<{ key: Operation; label: string; icon: string; cli: string }> = [
  { key: "package", label: "Package", icon: "i-lucide-package", cli: "info" },
  { key: "versions", label: "Versions", icon: "i-lucide-tag", cli: "versions" },
  { key: "dependencies", label: "Dependencies", icon: "i-lucide-git-fork", cli: "deps" },
  { key: "maintainers", label: "Maintainers", icon: "i-lucide-users", cli: "maintainers" },
];

const router = useRouter();
const route = useRoute();

const input = ref("pkg:npm/lodash");
const operation = ref<Operation>("package");

const state = reactive<{
  loading: boolean;
  error?: string;
  purl?: string;
  package?: PackageAnswer;
  versions?: VersionsAnswer;
  dependencies?: DependenciesAnswer;
  maintainers?: MaintainersAnswer;
}>({ loading: false });

const ecosystem = computed(() => ecosystemOf(input.value));
const known = computed(() => Boolean(ecosystemInfo(ecosystem.value)));
const cliLine = computed(() => {
  const op = OPERATIONS.find((row) => row.key === operation.value)!;
  return `registries ${op.cli} ${withScheme(input.value).replace("pkg:", "")}`;
});

function errorText(error: unknown): string {
  if (error && typeof error === "object") {
    const data = error as { statusCode?: number; statusMessage?: string; data?: { statusMessage?: string }; message?: string };
    const message = data.data?.statusMessage ?? data.statusMessage ?? data.message;
    if (message) {
      return data.statusCode ? `${data.statusCode}: ${message}` : message;
    }
  }
  return String(error);
}

async function run(op: Operation = operation.value) {
  const purl = withScheme(input.value);
  operation.value = op;
  state.loading = true;
  state.error = undefined;
  if (state.purl !== purl) {
    state.package = undefined;
    state.versions = undefined;
    state.dependencies = undefined;
    state.maintainers = undefined;
    state.purl = purl;
  }
  await router.replace({ query: { purl, op } });
  /** The stripped prerender address is not rewritten by a replace to an identical route. */
  if (import.meta.client && window.location.pathname + window.location.search !== route.fullPath) {
    window.history.replaceState(window.history.state, "", route.fullPath);
  }
  try {
    if (op === "package" && !state.package) {
      state.package = await $fetch<PackageAnswer>("/api/package", { query: { purl }, retry: 0 });
    } else if (op === "versions" && !state.versions) {
      state.versions = await $fetch<VersionsAnswer>("/api/versions", { query: { purl, limit: 50 }, retry: 0 });
    } else if (op === "dependencies" && !state.dependencies) {
      state.dependencies = await $fetch<DependenciesAnswer>("/api/dependencies", { query: { purl }, retry: 0 });
    } else if (op === "maintainers" && !state.maintainers) {
      state.maintainers = await $fetch<MaintainersAnswer>("/api/maintainers", { query: { purl }, retry: 0 });
    }
  } catch (error) {
    state.error = errorText(error);
  } finally {
    state.loading = false;
  }
}

function pick(example: string) {
  input.value = example;
  void run("package");
}

const grouped = computed(() => {
  const groups = new Map<string, Dependency[]>();
  for (const dependency of state.dependencies?.dependencies ?? []) {
    const scope = dependency.scope || "runtime";
    groups.set(scope, [...(groups.get(scope) ?? []), dependency]);
  }
  return [...groups.entries()];
});

const copied = ref(false);

async function copyCli() {
  try {
    await navigator.clipboard.writeText(cliLine.value);
  } catch {
    return;
  }
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1200);
}

/** Prerender strips the query from the location; the router restores it in `route.query` before mount. */
const applied = ref(false);

function apply(query: Readonly<Record<string, unknown>>) {
  applied.value = true;
  const purl = typeof query.purl === "string" ? query.purl : "";
  const op = typeof query.op === "string" ? query.op : "package";
  if (purl) {
    input.value = purl;
  }
  void run(OPERATIONS.some((row) => row.key === op) ? (op as Operation) : "package");
}

watch(
  () => route.query,
  (query) => {
    if (import.meta.client && !applied.value && typeof query.purl === "string") {
      apply(query);
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (!applied.value) {
    apply(route.query);
  }
});
</script>

<template>
  <div class="space-y-5">
    <form class="registries-frame overflow-hidden rounded-xl" @submit.prevent="run()">
      <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <label class="sr-only" for="lookup-purl">Package URL</label>
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <UIcon :name="ecosystemInfo(ecosystem)?.icon ?? 'i-lucide-package'" class="size-4 shrink-0" :class="known ? 'text-primary' : 'text-dimmed'" />
          <input
            id="lookup-purl"
            v-model="input"
            class="registries-field font-mono"
            placeholder="pkg:npm/lodash or cargo/serde@1.0.0"
            spellcheck="false"
            autocomplete="off"
          />
        </div>
        <button type="submit" class="registries-btn registries-primary-fill" :disabled="state.loading">
          <UIcon v-if="state.loading" name="i-lucide-loader-circle" class="size-4 animate-spin" />
          <UIcon v-else name="i-lucide-search" class="size-4" />
          Look up
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 border-t border-muted px-4 py-3">
        <span class="me-1 font-mono text-[11px] text-dimmed">try</span>
        <button
          v-for="example in ECOSYSTEMS"
          :key="example.key"
          type="button"
          class="registries-copy"
          @click="pick(example.example)"
        >
          {{ example.example }}
        </button>
      </div>
    </form>

    <nav aria-label="Operation" class="registries-explorer-nav !mt-0 !justify-start">
      <button
        v-for="op in OPERATIONS"
        :key="op.key"
        type="button"
        class="registries-explorer-link"
        :class="{ 'registries-explorer-link-active': operation === op.key }"
        @click="run(op.key)"
      >
        <UIcon :name="op.icon" class="size-3.5" />
        {{ op.label }}
      </button>
      <button type="button" class="registries-copy ms-auto" :aria-label="copied ? 'Copied' : 'Copy CLI command'" @click="copyCli">
        <span class="text-dimmed">$</span> {{ cliLine }}
        <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
      </button>
    </nav>

    <p v-if="state.loading" class="registries-frame flex items-center gap-2 rounded-xl px-5 py-4 text-sm text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
      Asking {{ ecosystemLabel(ecosystem) }}…
    </p>
    <pre v-else-if="state.error" class="registries-body registries-frame rounded-xl" :style="{ color: 'var(--registries-del)' }">{{ state.error }}</pre>

    <div v-else-if="operation === 'package' && state.package" class="registries-frame overflow-hidden rounded-xl">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-muted px-4 py-3">
        <span class="font-mono text-base text-highlighted">{{ displayName(state.package.package) }}</span>
        <span class="font-mono text-sm text-primary">{{ state.package.package.latestVersion || "no latest version" }}</span>
        <span class="ms-auto font-mono text-[11px] text-dimmed">{{ ecosystemLabel(state.package.ecosystem) }} · fetched {{ dateOnly(state.package.fetchedAt) }}</span>
      </div>
      <p class="px-4 pt-4 text-sm text-muted">{{ state.package.package.description || "No description on the registry." }}</p>
      <dl class="registries-kv">
        <dt>purl</dt>
        <dd class="font-mono text-[13px]">{{ state.package.urls.purl }}</dd>
        <dt>licenses</dt>
        <dd class="font-mono text-[13px]">{{ state.package.package.licenses || "none" }}</dd>
        <dt>repository</dt>
        <dd><a v-if="state.package.package.repository" :href="state.package.package.repository" target="_blank" rel="noopener" class="font-mono text-[13px] hover:text-primary">{{ bareUrl(state.package.package.repository) }}</a><span v-else>none</span></dd>
        <dt>homepage</dt>
        <dd><a v-if="state.package.package.homepage" :href="state.package.package.homepage" target="_blank" rel="noopener" class="font-mono text-[13px] hover:text-primary">{{ bareUrl(state.package.package.homepage) }}</a><span v-else>none</span></dd>
        <dt>docs</dt>
        <dd><a v-if="state.package.urls.documentation" :href="state.package.urls.documentation" target="_blank" rel="noopener" class="font-mono text-[13px] hover:text-primary">{{ bareUrl(state.package.urls.documentation) }}</a><span v-else>none</span></dd>
        <dt>registry</dt>
        <dd><a :href="state.package.urls.registry" target="_blank" rel="noopener" class="font-mono text-[13px] hover:text-primary">{{ bareUrl(state.package.urls.registry) }}</a></dd>
        <dt>readme</dt>
        <dd><a v-if="state.package.urls.readme" :href="state.package.urls.readme" target="_blank" rel="noopener" class="font-mono text-[13px] hover:text-primary">{{ bareUrl(state.package.urls.readme) }}</a><span v-else>none</span></dd>
        <dt>keywords</dt>
        <dd class="text-[13px] text-muted">{{ state.package.package.keywords.length ? state.package.package.keywords.join(", ") : "none" }}</dd>
      </dl>
      <details v-if="Object.keys(state.package.package.metadata).length" class="border-t border-muted">
        <summary class="cursor-pointer px-4 py-3 font-mono text-[11px] tracking-[0.08em] text-dimmed uppercase">metadata · what the registry adds</summary>
        <pre class="registries-body border-t border-muted">{{ JSON.stringify(state.package.package.metadata, null, 2) }}</pre>
      </details>
    </div>

    <div v-else-if="operation === 'versions' && state.versions" class="registries-frame overflow-hidden rounded-xl">
      <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
        <p class="font-mono text-xs text-muted">{{ pluralize(state.versions.total, "version") }}, newest first</p>
        <p v-if="state.versions.total > state.versions.versions.length" class="font-mono text-[11px] text-dimmed">showing {{ state.versions.versions.length }}</p>
      </div>
      <div class="registries-table-wrap">
        <table class="registries-table">
          <thead>
            <tr><th>version</th><th>published</th><th>licenses</th><th>integrity</th><th>status</th></tr>
          </thead>
          <tbody>
            <tr v-for="version in state.versions.versions" :key="version.number">
              <td class="font-mono text-[13px] text-highlighted">{{ version.number }}</td>
              <td class="font-mono text-xs text-muted">{{ dateOnly(version.publishedAt) || "none" }}</td>
              <td class="font-mono text-xs text-muted">{{ version.licenses || "none" }}</td>
              <td class="font-mono text-xs text-dimmed" :title="version.integrity">{{ version.integrity ? shortValue(version.integrity, 24) : "none" }}</td>
              <td><span class="registries-state" :class="version.status ? 'registries-state-warn' : 'registries-state-ok'">{{ version.status || "ok" }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else-if="operation === 'dependencies' && state.dependencies" class="registries-frame overflow-hidden rounded-xl">
      <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
        <p class="font-mono text-xs text-muted">
          {{ pluralize(state.dependencies.dependencies.length, "dependency", "dependencies") }} at
          <span class="text-highlighted">{{ state.dependencies.version }}</span>
        </p>
        <p v-if="state.dependencies.resolvedLatest" class="font-mono text-[11px] text-dimmed">no version in the PURL, latest used</p>
      </div>
      <p v-if="!state.dependencies.dependencies.length" class="px-4 py-4 text-sm text-muted">This version declares no dependencies.</p>
      <div v-for="[scope, rows] in grouped" :key="scope" class="border-b border-muted last:border-b-0">
        <p class="px-4 pt-3 font-mono text-[11px] tracking-[0.08em] uppercase" :class="`registries-scope-${scope}`">{{ scope }} · {{ rows.length }}</p>
        <div class="registries-table-wrap">
          <table class="registries-table">
            <tbody>
              <tr v-for="dependency in rows" :key="`${scope}-${dependency.name}`">
                <td class="font-mono text-[13px] text-highlighted">{{ dependency.name }}</td>
                <td class="font-mono text-xs text-muted">{{ dependency.requirements || "*" }}</td>
                <td class="text-end"><span v-if="dependency.optional" class="registries-state">optional</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else-if="operation === 'maintainers' && state.maintainers" class="registries-frame overflow-hidden rounded-xl">
      <div class="border-b border-muted px-4 py-3">
        <p class="font-mono text-xs text-muted">{{ pluralize(state.maintainers.maintainers.length, "maintainer") }}</p>
      </div>
      <p v-if="!state.maintainers.maintainers.length" class="px-4 py-4 text-sm text-muted">The registry lists nobody for this package.</p>
      <div v-else class="registries-table-wrap">
        <table class="registries-table">
          <thead>
            <tr><th>name</th><th>login</th><th>role</th><th>link</th></tr>
          </thead>
          <tbody>
            <tr v-for="(maintainer, i) in state.maintainers.maintainers" :key="`${maintainer.login}-${i}`">
              <td class="text-sm text-highlighted">{{ maintainer.name || maintainer.login || "unknown" }}</td>
              <td class="font-mono text-xs text-muted">{{ maintainer.login || "none" }}</td>
              <td><span v-if="maintainer.role" class="registries-state">{{ maintainer.role }}</span><span v-else class="text-dimmed">none</span></td>
              <td><a v-if="maintainer.url" :href="maintainer.url" target="_blank" rel="noopener" class="font-mono text-xs hover:text-primary">{{ bareUrl(maintainer.url) }}</a><span v-else class="text-dimmed">none</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
