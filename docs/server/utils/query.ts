import type { H3Event } from "h3";
import { hash } from "ohash";
import {
  Client,
  HTTPError,
  InvalidPURLError,
  NotFoundError,
  RateLimitError,
  UnknownEcosystemError,
  createFromPURL,
  parsePURL,
  type Registry,
} from "@agntn/registries";

type Query = Record<string, unknown>;

/** Caps every public parameter well below anything a registry would mind. */
export const LIMITS = {
  purl: 512,
  versions: 200,
  /** crates.io and the AUR answer in well under this; npm's full document for a huge package can take a few seconds. */
  timeout: 20_000,
} as const;

function raw(query: Query, key: string): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

export function readString(query: Query, key: string, max: number): string | undefined {
  const value = raw(query, key)?.trim();
  if (!value) {
    return undefined;
  }
  if (value.length > max) {
    throw createError({ statusCode: 400, statusMessage: `${key} must be at most ${max} characters` });
  }
  return value;
}

export function requireString(query: Query, key: string, max: number): string {
  const value = readString(query, key, max);
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: `${key} is required` });
  }
  return value;
}

export function readInt(query: Query, key: string, min: number, max: number): number | undefined {
  const value = raw(query, key);
  if (value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw createError({ statusCode: 400, statusMessage: `${key} must be an integer between ${min} and ${max}` });
  }
  return parsed;
}

/** The CLI accepts `npm/lodash`; the API does the same, and hands the library a full PURL. */
export function readPurl(query: Query): string {
  const value = requireString(query, "purl", LIMITS.purl);
  return value.startsWith("pkg:") ? value : `pkg:${value}`;
}

/** A resolved lookup: the adapter, the registry name and the version the PURL carried. */
export interface Lookup {
  purl: string;
  ecosystem: string;
  name: string;
  version: string;
  registry: Registry;
}

/** Resolves a PURL into an adapter with a client that retries once; the browser is waiting. */
export function resolveLookup(purl: string): Lookup {
  try {
    const parsed = parsePURL(purl);
    const client = new Client({ maxRetries: 1, timeout: LIMITS.timeout, userAgent: "registries.agntn.dev (docs)" });
    const [registry, name, version] = createFromPURL(purl, client);
    return { purl, ecosystem: parsed.type, name, version, registry };
  } catch (error) {
    return toHttpError(error);
  }
}

/** Stable cache key from the parameters that reach the library, so two spellings of one query share an entry. */
export function cacheKey(prefix: string, params: Readonly<Record<string, unknown>>): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `${prefix}:${JSON.stringify(entries)}`;
}

/** Turns a library error into the status the browser can show; the typed hierarchy decides the code. */
export function toHttpError(error: unknown): never {
  if (error && typeof error === "object" && "statusCode" in error) {
    throw error;
  }
  if (error instanceof NotFoundError) {
    throw createError({ statusCode: 404, statusMessage: error.message });
  }
  if (error instanceof InvalidPURLError || error instanceof UnknownEcosystemError) {
    throw createError({ statusCode: 400, statusMessage: error.message });
  }
  if (error instanceof RateLimitError) {
    throw createError({ statusCode: 429, statusMessage: error.message });
  }
  if (error instanceof HTTPError) {
    throw createError({ statusCode: 502, statusMessage: `The registry answered HTTP ${error.statusCode} for ${error.url}` });
  }
  const message = error instanceof Error ? error.message : String(error);
  throw createError({ statusCode: 502, statusMessage: message.slice(0, 300) });
}

export function markPublic(event: H3Event, seconds: number): void {
  setResponseHeader(event, "Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=${seconds * 4}`);
}

/** Uncached registry queries one client may start per minute; cache hits are free. */
export const RATE_LIMIT = 30;

/** Counts uncached queries per client and minute; cache hits are free, so a warm demo never trips it. */
export async function assertRateLimit(event: H3Event): Promise<void> {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? getRequestHeader(event, "cf-connecting-ip") ?? "unknown";
  const minute = Math.floor(Date.now() / 60_000);
  const key = `docs:rate:${hash(ip)}:${minute}`;
  const storage = useStorage("cache");
  const count = Number((await storage.getItem<number>(key).catch(() => 0)) ?? 0) + 1;
  await storage.setItem(key, count, { ttl: 120 }).catch(() => undefined);
  if (count > RATE_LIMIT) {
    setResponseHeader(event, "Retry-After", String(60 - (Math.floor(Date.now() / 1000) % 60)));
    throw createError({
      statusCode: 429,
      statusMessage: `More than ${RATE_LIMIT} new registry queries in a minute from one address; cached answers are not counted. Wait a moment.`,
    });
  }
}

interface CachedEntry<T> {
  value: T;
  expires: number;
}

/** Serves from the cache or produces and stores; a thrown failure is never stored, keys stay case sensitive. */
export async function cachedAnswer<T>(
  event: H3Event,
  prefix: string,
  params: Readonly<Record<string, unknown>>,
  ttl: number,
  produce: () => Promise<T>,
): Promise<T> {
  const storage = useStorage("cache");
  const key = `docs:${prefix}:${hash(cacheKey(prefix, params))}`;
  const hit = await storage.getItem<CachedEntry<T>>(key).catch(() => null);
  if (hit && typeof hit.expires === "number" && hit.expires > Date.now()) {
    markPublic(event, Math.max(1, Math.floor((hit.expires - Date.now()) / 1000)));
    return hit.value;
  }
  await assertRateLimit(event);
  const value = await produce();
  await storage.setItem(key, { value, expires: Date.now() + ttl * 1000 }).catch(() => undefined);
  markPublic(event, ttl);
  return value;
}
