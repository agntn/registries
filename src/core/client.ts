import { ofetch, FetchError } from "ofetch";
import type { $Fetch } from "ofetch";
import type { ClientOptions, RateLimiter } from "./types.ts";
import { HTTPError, RateLimitError } from "./errors.ts";

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY = 50;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_USER_AGENT = "registries/0.1.0";
const MAX_TIMER_DELAY = 2_147_483_647;

function parseRetryAfterValue(header: string | null | undefined): number | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  if (!trimmed) return undefined;

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isNaN(seconds) ? undefined : seconds;
  }

  const timestamp = /[a-z]/i.test(trimmed) ? Date.parse(trimmed) : NaN;
  if (Number.isNaN(timestamp)) return undefined;

  const seconds = Math.ceil((timestamp - Date.now()) / 1000);
  return Math.max(seconds, 0);
}

/**
 * Parse a `Retry-After` header into seconds.
 *
 * Handles two formats (RFC 7231 §7.1.3):
 * - **Numeric**: `"120"` → 120
 * - **HTTP-date**: `"Wed, 21 Oct 2025 07:28:00 GMT"` → seconds until that time
 *
 * Returns 60 when the header is absent, empty, or unparseable.
 */
export function parseRetryAfter(header: string | null | undefined): number {
  return parseRetryAfterValue(header) ?? 60;
}

/** Apply a valid, timer-safe `Retry-After` value or reject an unschedulable delay. */
export function retryDelayFor(header: string | null | undefined, fallbackDelay: number): number {
  const retryAfter = parseRetryAfterValue(header);
  if (retryAfter === undefined) return fallbackDelay;

  const retryAfterDelay = retryAfter * 1000;
  if (!Number.isFinite(retryAfterDelay) || retryAfterDelay > MAX_TIMER_DELAY) {
    throw new RateLimitError(retryAfter);
  }
  return Math.max(fallbackDelay, retryAfterDelay);
}

/** HTTP client with retry, backoff, rate limiting, and timeout. */
export class Client {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly timeout: number;
  readonly userAgent: string;
  private readonly rateLimiter: RateLimiter | null;
  private readonly fetch: $Fetch;

  constructor(options: ClientOptions = {}) {
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelay = options.baseDelay ?? DEFAULT_BASE_DELAY;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.rateLimiter = options.rateLimiter ?? null;

    const maxRetries = this.maxRetries;
    const baseDelay = this.baseDelay;

    this.fetch = ofetch.create({
      retry: this.maxRetries,
      retryDelay(context) {
        const remaining = typeof context.options.retry === "number" ? context.options.retry : 0;
        const attempt = maxRetries - remaining;
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitteredDelay = delay + delay * Math.random() * 0.1;
        return retryDelayFor(context.response?.headers.get("Retry-After"), jitteredDelay);
      },
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
      timeout: this.timeout,
      headers: {
        Accept: "application/json",
        "User-Agent": this.userAgent,
      },
    });
  }

  /** Fetch JSON from a URL with retry and rate limiting. */
  async getJSON<T>(
    url: string,
    signal?: AbortSignal,
    headers?: Record<string, string>,
  ): Promise<T> {
    if (this.rateLimiter) {
      await this.rateLimiter.wait(signal);
    }

    try {
      return await this.fetch<T>(url, { signal, headers });
    } catch (error) {
      if (error instanceof FetchError) {
        if (error.statusCode === 429) {
          throw new RateLimitError(parseRetryAfter(error.response?.headers.get("Retry-After")));
        }

        const body = typeof error.data === "string" ? error.data : JSON.stringify(error.data ?? "");

        throw new HTTPError(error.statusCode ?? 0, url, body);
      }
      throw error;
    }
  }
}

let _defaultClient: Client | undefined;

/** Get or create the shared default client. */
export function defaultClient(): Client {
  if (!_defaultClient) {
    _defaultClient = new Client();
  }
  return _defaultClient;
}
