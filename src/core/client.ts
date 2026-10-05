import type { ClientOptions, RateLimiter } from "./types.ts";
import { HTTPError, RateLimitError } from "./errors.ts";
import { version } from "../version.ts";

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY = 50;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_USER_AGENT = `agntn-registries/${version} (+https://github.com/agntn/registries)`;
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
 * Parse a Retry-After header into seconds, defaulting to 60.
 *
 * @param header - Numeric seconds or an HTTP date.
 * @returns {number} The retry delay in seconds.
 */
export function parseRetryAfter(header: string | null | undefined): number {
  return parseRetryAfterValue(header) ?? 60;
}

/**
 * Apply a valid Retry-After value or reject an unschedulable delay.
 *
 * @param header - Numeric seconds or an HTTP date.
 * @param fallbackDelay - Delay in milliseconds used without a valid header.
 * @returns {number} A timer-safe delay in milliseconds.
 */
export function retryDelayFor(header: string | null | undefined, fallbackDelay: number): number {
  const retryAfter = parseRetryAfterValue(header);
  if (retryAfter === undefined) return fallbackDelay;

  const retryAfterDelay = retryAfter * 1000;
  if (!Number.isFinite(retryAfterDelay) || retryAfterDelay > MAX_TIMER_DELAY) {
    throw new RateLimitError(retryAfter);
  }
  return Math.max(fallbackDelay, retryAfterDelay);
}

/** Statuses worth another go: timeouts, conflicts, rate limits and servers having a bad day. */
const RETRY_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

/** Statuses whose response never carries a body. */
const EMPTY_STATUS_CODES = new Set([101, 204, 205, 304]);

/** One finished attempt: the decoded body, or the error it ends on if nobody retries. */
type Attempt =
  | { readonly ok: true; readonly data: unknown }
  | {
      readonly ok: false;
      readonly error: Error;
      readonly retryable: boolean;
      readonly status?: number;
      readonly retryAfter?: string | null;
    };

/** HTTP client with retry, backoff, rate limiting, and timeout. */
export class Client {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly timeout: number;
  readonly userAgent: string;
  private readonly rateLimiter: RateLimiter | null;

  constructor(options: ClientOptions = {}) {
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelay = options.baseDelay ?? DEFAULT_BASE_DELAY;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.rateLimiter = options.rateLimiter ?? null;
  }

  /**
   * Fetch JSON with retry and rate limiting.
   *
   * @param url - Request URL.
   * @param signal - Optional cancellation signal.
   * @param headers - Optional request headers.
   * @returns {Promise<T>} The decoded response body.
   */
  async getJSON<T>(
    url: string,
    signal?: AbortSignal,
    headers?: Readonly<Record<string, string>>,
  ): Promise<T> {
    if (this.rateLimiter) {
      await this.rateLimiter.wait(signal);
    }

    for (let attempt = 0; ; attempt++) {
      const outcome = await this.attempt(url, signal, headers);
      if (outcome.ok) return outcome.data as T;
      if (!this.canRetry(outcome, attempt, signal)) throw outcome.error;

      await abortableDelay(this.retryDelay(attempt, url, outcome), signal);
      if (signal?.aborted) throw new HTTPError(0, url, "");
    }
  }

  /**
   * One request under a fresh timeout. Failures come back as data, so the loop picks what's next.
   *
   * @param url - Request URL.
   * @param signal - Optional cancellation signal.
   * @param headers - Optional request headers.
   * @returns {Promise<Attempt>} The decoded body or the failure.
   */
  private async attempt(
    url: string,
    signal?: AbortSignal,
    headers?: Readonly<Record<string, string>>,
  ): Promise<Attempt> {
    const init = { headers: this.requestHeaders(headers), signal: this.attemptSignal(signal) };
    let status: number;
    let retryAfter: string | null;
    let text: string | undefined;
    try {
      const response = await fetch(url, init);
      ({ status } = response);
      retryAfter = response.headers.get("Retry-After");
      text = EMPTY_STATUS_CODES.has(status) ? undefined : await response.text();
    } catch {
      return { ok: false, error: new HTTPError(0, url, ""), retryable: !signal?.aborted };
    }

    if (status < 400 || status >= 600) return { ok: true, data: parseBody(text) };

    const error =
      status === 429
        ? new RateLimitError(parseRetryAfter(retryAfter))
        : new HTTPError(status, url, text ?? "");
    return { ok: false, error, retryable: RETRY_STATUS_CODES.has(status), status, retryAfter };
  }

  private canRetry(
    failure: Readonly<{ retryable: boolean }>,
    attempt: number,
    signal?: AbortSignal,
  ): boolean {
    return failure.retryable && attempt < this.maxRetries && !signal?.aborted;
  }

  /**
   * Exponential backoff with up to 10% jitter, stretched to a longer Retry-After.
   *
   * @param attempt - Zero-based index of the attempt that just failed.
   * @param url - Request URL, for the error when Retry-After is unschedulable.
   * @param failure - The failed attempt.
   * @returns {number} Milliseconds to wait before the next attempt.
   */
  private retryDelay(
    attempt: number,
    url: string,
    failure: Readonly<{ status?: number; retryAfter?: string | null }>,
  ): number {
    const delay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitteredDelay = delay + delay * Math.random() * 0.1;
    try {
      return retryDelayFor(failure.retryAfter, jitteredDelay);
    } catch (error) {
      if (error instanceof RateLimitError && failure.status !== 429) {
        throw new HTTPError(failure.status ?? 0, url, "");
      }
      throw error;
    }
  }

  /**
   * Default headers, each replaced by a caller header of the same name in any letter case.
   *
   * @param overrides - Optional request headers.
   * @returns {Headers} The headers for one request.
   */
  private requestHeaders(overrides?: Readonly<Record<string, string>>): Headers {
    const headers = new Headers({ Accept: "application/json", "User-Agent": this.userAgent });
    for (const [name, value] of Object.entries(overrides ?? {})) headers.set(name, value);
    return headers;
  }

  private attemptSignal(signal?: AbortSignal): AbortSignal | undefined {
    const signals = [signal, this.timeout > 0 ? AbortSignal.timeout(this.timeout) : undefined];
    const active = signals.filter((candidate) => candidate !== undefined);
    return active.length > 0 ? AbortSignal.any(active) : undefined;
  }
}

/**
 * JSON when it parses, raw text when it doesn't, and no prototype keys smuggled in by a registry.
 *
 * @param text - Response body, or `undefined` for a bodiless status.
 * @returns {unknown} The decoded body.
 */
function parseBody(text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text, (key, value: unknown) =>
      key === "__proto__" ||
      (key === "constructor" && typeof value === "object" && value !== null && "prototype" in value)
        ? undefined
        : value,
    );
  } catch {
    return text;
  }
}

/**
 * Sleep that returns as soon as the signal fires, so an abort never waits out a Retry-After.
 *
 * @param milliseconds - Delay before resolving.
 * @param signal - Optional cancellation signal that ends the wait early.
 * @returns {Promise<void>} Resolution after the delay or the abort.
 */
function abortableDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return new Promise((resolve) => setTimeout(resolve, milliseconds));
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

let _defaultClient: Client | undefined;

/**
 * Get or create the shared HTTP client.
 *
 * @returns {Client} The shared client.
 */
export function defaultClient(): Client {
  _defaultClient ??= new Client();
  return _defaultClient;
}
