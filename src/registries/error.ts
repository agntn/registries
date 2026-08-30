import { HTTPError, NotFoundError } from "../core/errors.ts";

export function rethrowFetchError(
  error: unknown,
  ecosystem: string,
  packageName: string,
  version = "",
): never {
  if (error instanceof HTTPError && error.isNotFound()) {
    throw new NotFoundError(ecosystem, packageName, version);
  }
  throw error;
}
