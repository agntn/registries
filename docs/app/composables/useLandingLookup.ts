import { LANDING_SAMPLES, type LookupSample } from "../utils/landing-fixtures";

interface PackageAnswer {
  purl: string;
  ecosystem: string;
  name: string;
  package: LookupSample["package"];
  urls: LookupSample["urls"];
}

interface VersionsAnswer {
  total: number;
  versions: LookupSample["versions"];
}

/** One clock for every landing panel; each recorded sample is swapped for the worker's answer once. */
export function useLandingLookup() {
  const samples = ref<LookupSample[]>([...LANDING_SAMPLES]);
  const tick = ref(0);
  const paused = ref(false);
  const index = computed(() => tick.value % samples.value.length);
  const current = computed(() => samples.value[index.value]!);
  const purl = computed(() => current.value.purl);

  const refreshed = new Set<string>();
  let timer: number | undefined;

  async function refresh(sample: LookupSample) {
    if (refreshed.has(sample.purl)) {
      return;
    }
    refreshed.add(sample.purl);
    try {
      const [pkg, versions] = await Promise.all([
        $fetch<PackageAnswer>("/api/package", { query: { purl: sample.purl }, retry: 0 }),
        $fetch<VersionsAnswer>("/api/versions", { query: { purl: sample.purl, limit: 4 }, retry: 0 }),
      ]);
      const position = samples.value.findIndex((row) => row.purl === sample.purl);
      if (position === -1) {
        return;
      }
      samples.value[position] = {
        ...sample,
        package: pkg.package,
        urls: pkg.urls,
        versionsTotal: versions.total,
        versions: versions.versions,
        live: true,
      };
    } catch {
      /* The recorded sample stays; it is labelled as such. */
    }
  }

  function step(delta: number) {
    tick.value = Math.max(0, tick.value + delta);
    void refresh(current.value);
  }

  function stopWalk() {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  function startWalk() {
    stopWalk();
    if (!import.meta.client || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    timer = window.setInterval(() => {
      if (!paused.value && !document.hidden) {
        step(1);
      }
    }, 3200);
  }

  onMounted(() => {
    void refresh(current.value);
    startWalk();
  });

  onUnmounted(stopWalk);

  return { samples, tick, index, paused, current, purl, step };
}
