import { homedir, platform } from "node:os";
import { join } from "node:path";

const APP_NAME = "registries";

/**
 * Resolve the cache directory following platform conventions:
 * - Linux: $XDG_CACHE_HOME/registries or ~/.cache/registries
 * - macOS: ~/Library/Caches/registries
 * - Windows: %LOCALAPPDATA%/registries/cache
 */
export function getCacheDir(): string {
  // Explicit override always wins
  const envOverride = process.env["REGISTRIES_CACHE_DIR"];
  if (envOverride) return envOverride;

  const os = platform();

  if (os === "darwin") {
    return join(homedir(), "Library", "Caches", APP_NAME);
  }

  if (os === "win32") {
    const localAppData = process.env["LOCALAPPDATA"];
    if (localAppData) return join(localAppData, APP_NAME, "cache");
    return join(homedir(), "AppData", "Local", APP_NAME, "cache");
  }

  // Linux / FreeBSD / other — XDG Base Directory
  const xdgCache = process.env["XDG_CACHE_HOME"];
  if (xdgCache) return join(xdgCache, APP_NAME);
  return join(homedir(), ".cache", APP_NAME);
}
