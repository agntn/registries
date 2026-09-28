import type { Dependency, Maintainer, Package } from "@agntn/registries";
import { withScheme } from "../utils/format";
import { LOOKUPS, type LookupKey } from "../utils/registries";

/** Mirrors `PackageAnswer` in `server/api/package.get.ts`. */
export interface PackageAnswer {
  purl: string;
  ecosystem: string;
  name: string;
  package: Package;
  urls: { registry: string; documentation: string; readme: string; purl: string };
  fetchedAt: string;
}

export interface WireVersion {
  number: string;
  publishedAt: string | null;
  licenses: string;
  integrity: string;
  status: string;
}

/** Mirrors the answer of `server/api/versions.get.ts`. */
export interface VersionsAnswer {
  total: number;
  versions: WireVersion[];
  fetchedAt: string;
}

/** Mirrors the answer of `server/api/dependencies.get.ts`. */
export interface DependenciesAnswer {
  version: string;
  resolvedLatest: boolean;
  dependencies: Dependency[];
  fetchedAt: string;
}

/** Mirrors the answer of `server/api/maintainers.get.ts`. */
export interface MaintainersAnswer {
  maintainers: Maintainer[];
  fetchedAt: string;
}

interface Answers {
  package?: PackageAnswer;
  versions?: VersionsAnswer;
  dependencies?: DependenciesAnswer;
  maintainers?: MaintainersAnswer;
}

const LIMITS: Partial<Record<LookupKey, Record<string, number>>> = { versions: { limit: 50 } };

function errorText(error: unknown): string {
  if (error && typeof error === "object") {
    const data = error as {
      statusCode?: number;
      statusMessage?: string;
      data?: { statusMessage?: string };
      message?: string;
    };
    const message = data.data?.statusMessage ?? data.statusMessage ?? data.message;
    if (message) {
      return data.statusCode ? `${data.statusCode}: ${message}` : message;
    }
  }
  return String(error);
}

/**
 * The explorer's state: one PURL, the lookup that is open, and every answer the worker gave for
 * that PURL, so switching tabs back never asks twice. The package answer is always read, because
 * the subject band of every tab is the package. Every state is in the query.
 *
 * @returns {object} The input, the open lookup, the answers, the flags and `run`.
 */
export function useLookup() {
  const router = useRouter();
  const route = useRoute();

  const input = ref("pkg:npm/lodash");
  const operation = ref<LookupKey>("package");
  const purl = ref("");
  const answers = reactive<Answers>({});
  const loading = ref(false);
  const error = ref("");
  /** Only the newest run writes: a slow answer for the previous PURL never lands under the next one. */
  let sequence = 0;

  async function read<K extends LookupKey>(key: K, target: string): Promise<Answers[K]> {
    return $fetch<Answers[K]>(`/api/${key}`, {
      query: { purl: target, ...LIMITS[key] },
      retry: 0,
    }) as Promise<Answers[K]>;
  }

  async function run(op: LookupKey = operation.value, value: string = input.value) {
    const target = withScheme(value);
    const ticket = ++sequence;
    input.value = target;
    operation.value = op;
    error.value = "";
    if (purl.value !== target) {
      answers.package = undefined;
      answers.versions = undefined;
      answers.dependencies = undefined;
      answers.maintainers = undefined;
      purl.value = target;
    }
    await router.replace({ query: { purl: target, op } });
    /** The stripped prerender address is not rewritten by a replace to an identical route. */
    if (import.meta.client && window.location.pathname + window.location.search !== route.fullPath) {
      window.history.replaceState(window.history.state, "", route.fullPath);
    }
    const missing = (["package", op] as const).filter((key) => !answers[key]);
    if (!missing.length) {
      /** An older read may still be in flight; it no longer owns the flag, this run does. */
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      const results = await Promise.all([...new Set(missing)].map(async (key) => [key, await read(key, target)] as const));
      if (ticket !== sequence) return;
      for (const [key, answer] of results) {
        (answers as Record<LookupKey, unknown>)[key] = answer;
      }
    } catch (failure) {
      if (ticket === sequence) error.value = errorText(failure);
    } finally {
      if (ticket === sequence) loading.value = false;
    }
  }

  /**
   * A prerendered page hydrates with an empty `route.query` and the router restores it only after
   * mount, so the deep link is read from the address bar itself, which always has it.
   */
  onMounted(() => {
    const query = new URLSearchParams(window.location.search);
    const op = LOOKUPS.find((lookup) => lookup.key === query.get("op"))?.key ?? "package";
    void run(op, query.get("purl") || input.value);
  });

  return { input, operation, purl, answers, loading, error, run };
}
