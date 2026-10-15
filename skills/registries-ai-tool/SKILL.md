---
name: registries-ai-tool
description: Integrates the @agntn/registries tools (packageTool, versionsTool, dependenciesTool, maintainersTool, bulkPackagesTool, ecosystemsTool) into AI applications built with the Vercel AI SDK. Provides structured package registry queries (info, versions, dependencies, maintainers, bulk lookups) as a tool for LLM agents. Use when building AI apps that need to query npm, PyPI, crates.io, or other registries. Do not use for direct CLI usage or non-AI integrations.
metadata:
  author: oritwoen
  version: "0.1.5"
---

# @agntn/registries AI Tool Integration

@agntn/registries exports six tools for the Vercel AI SDK, one per registry operation. They are the same tools `registries mcp` serves, with the same schemas and the same text, so an agent gets identical answers on every host. They cover npm, PyPI, crates.io, RubyGems, Packagist and Arch Linux.

## Step 1: Install Dependencies

```bash
npm install @agntn/registries ai @ai-sdk/openai  # AI SDK 7, any provider
```

## Step 2: Register the Tools

Import the ones the agent needs from `@agntn/registries/ai`:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { dependenciesTool, packageTool } from "@agntn/registries/ai";

const result = await generateText({
  model: openai("gpt-4o"),
  tools: { packageTool, dependenciesTool },
  prompt: "What are the dependencies of flask 3.1.1?",
});
```

The tools validate input, call the registry, normalize the answer and hand the model compact JSON. Your code gets the fields plus that JSON as `text`.

## Step 3: Know the Tools

### `packageTool` (`registries_package`)

```json
{ "purl": "pkg:npm/lodash" }
```

Returns the package: name, description, licenses, repository, latest version, keywords.

### `versionsTool` (`registries_versions`)

```json
{ "purl": "pkg:cargo/serde" }
{ "purl": "pkg:cargo/serde", "limit": "all" }
```

Returns `{ order, total, omitted, versions }`: the 20 newest releases unless `limit` asks for another number, or `"all"` for the whole history. `omitted` counts the ones left out, so check it before calling a release the oldest. Each version carries its number, publish date, integrity hash and status (yanked/deprecated). Undated ones go last.

### `dependenciesTool` (`registries_dependencies`)

```json
{ "purl": "pkg:pypi/flask@3.1.1" }
```

Returns `{ dependencies }`: names, version constraints, scope (runtime/development/test/build/optional), optional flag.

**Note:** The PURL must include a version. Without it, the tool returns an error.

### `maintainersTool` (`registries_maintainers`)

```json
{ "purl": "pkg:gem/rails" }
```

Returns `{ maintainers }`: login, name, email, role for each maintainer.

### `bulkPackagesTool` (`registries_bulk_packages`)

```json
{ "purls": ["pkg:npm/lodash", "pkg:cargo/serde"], "concurrency": 10 }
```

Returns one package per PURL. Up to 50 PURLs, 15 lookups at once by default. Failed lookups are silently omitted.

### `ecosystemsTool` (`registries_ecosystems`)

```json
{}
```

Returns `{ ecosystems }`, the PURL types the package knows. No network.

## Step 4: Use with Streaming

The tools work with `streamText` as well:

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { versionsTool } from "@agntn/registries/ai";

const result = streamText({
  model: openai("gpt-4o"),
  tools: { versionsTool },
  prompt: "Compare the latest versions of express and fastify",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

## PURL Format Quick Reference

Read `references/purl-cheatsheet.md` for the PURL format details and ecosystem-specific examples.

## Error Handling

The tools throw errors as exceptions (not structured return values). Bad input fails the schema check before any request. The AI SDK catches these and surfaces them to the agent as tool call failures:

- **`NotFoundError`**: Package or version does not exist
- **`InvalidPURLError`**: Malformed PURL string (missing `pkg:` prefix, bad encoding)
- **`UnknownEcosystemError`**: Unsupported ecosystem type
- **`RateLimitError`**: Registry rate limit hit (the HTTP client retries automatically first)

With multi-step tool use, failed calls appear as `tool-error` parts and the agent can self-correct (e.g., fix PURL format, try a different ecosystem). If you need custom error handling, wrap the tool's `execute` function.
