# Design system

The shared rules (direction, color roles, type, the `console-*` grammar, hero, docs chrome, density, motion, checks) live in the one agntn design system document, kept with the agntn skills until it ships in the shared package. This file records only what registries owns and where it departs from the shared rules. It does not repeat them.

The instruments registries owns:

| Instrument | Where | Object |
| --- | --- | --- |
| [LandingHero.vue](app/components/content/LandingHero.vue) | landing, first screen | hero zone, circuit `look up` into the lookup form |
| [LookupSearch.vue](app/components/LookupSearch.vue) | under the hero on the landing and `/lookup` | the lookup form: PURL, the registry it names, its host, an example per registry |
| [LandingPackage.vue](app/components/content/LandingPackage.vue) | "PURL in, package out" | one `fetchPackageFromPURL` answer, walked across the samples |
| [LandingRotatingCode.vue](app/components/content/LandingRotatingCode.vue) | "Same calls, every adapter" | the same nine lines for every sample, as a file |
| [LandingVersions.vue](app/components/content/LandingVersions.vue) | "A terminal client with a lockfile" | four rows of `registries versions` |
| [RegistryMatrix.vue](app/components/content/RegistryMatrix.vue) | landing and `/registries` | roster of the registries on `UTable`, sortable |
| [LandingToolCall.vue](app/components/content/LandingToolCall.vue) | "One tool call, four hosts" | `registries_package` arguments, answer and `content[0].text` |
| [LandingStart.vue](app/components/content/LandingStart.vue) | closing section | install, notes, first lookup as a file |
| [RegistryFacts.vue](app/components/content/RegistryFacts.vue) | every registry page | registry dossier: ID bar with position, reticle, identifiers, lookups, access |
| [LookupAnswer.vue](app/components/LookupAnswer.vue) | `/lookup` | one PURL: the package on the subject band, the four lookups as tabs, rows on `UTable` |
| [Landing.takumi.vue](app/components/OgImage/Landing.takumi.vue), [Docs.takumi.vue](app/components/OgImage/Docs.takumi.vue) | OG images | the hero zone in 1200 by 600; a docs page as one instrument with the section tag, ruler and the four lookups |

Registry names, icons, class names, hosts, example PURLs and the roster sentence come from [registries.ts](app/utils/registries.ts). The hero counts the adapters through `/api/ecosystems`, which reads the library's `builtins`. The landing samples come from [landing-fixtures.ts](app/utils/landing-fixtures.ts), recorded through the library.

## Nuxt UI variants

Controls are Nuxt UI components; `app.config.ts` gives each variant its family look with classes from `app.css`, the same mapping as explorers.

| Component and variant | Look | Used for |
| --- | --- | --- |
| `UButton` primary solid | amber action segment, glyph in its own cell | get started, look up, read the guide |
| `UButton` neutral outline | quiet action segment | GitHub, open the explorer |
| `UButton` neutral subtle | boxed control, `square` for a step | copy, previous and next |
| `UButton` variant `chip`, neutral or primary | chip, the picked one on the accent edge | the example PURLs |
| `UBadge` neutral outline, primary outline | boxed mono word: quiet, accent | version status (`ok`, `deprecated`, `yanked`), optional, maintainer role |
| `UTabs` link | mono capitals on a rule, accent segment under the open tab | the four lookups on `/lookup` |
| `UInput` none | the readout row is the frame, the value mono | the PURL field |
| `UAlert` error outline | red edge, message in mono | a failed lookup |

## Anatomy

- **Lookup form.** Bar `Call fetchPackageFromPURL("<purl>")`, meta the registry count. The reticle carries the glyph of the registry the PURL names. Readout rows: `PURL` holds the `UInput`, `Registry` answers in the accent with label and class, `Host` the API host. An unknown type reads `no adapter for pkg:<type>` in the dimmed color. The submit is a primary `UButton`, the six examples `chip` buttons. The landing sends the lookup to `/lookup`; the explorer runs it in place and keeps the ruler cursor looping while it waits.
- **Lookup answer.** Bar tagged with the open lookup and its `*FromPURL` helper, meta the version total and the fetch time. Subject band: reticle, `Package / <registry>`, name with the latest version in the accent, the registry's description as text, readout of licenses, repository, registry page and keywords. Under it `UTabs` for the four lookups, then the open one: package links as rows, versions and maintainers on `UTable` with the roster classes, dependencies grouped by scope under rule titles. The worker's whole JSON is the `03 Full answer` dialog. The footer carries the same lookup as a CLI line with copy.
- **Registry dossier.** ID bar with the key and `01 / 06`, meta `keyless` and the API host. Subject band: reticle with the registry glyph, class name and PURL type as boxed identifiers, the roster sentence. Readout: API, marks (the version statuses, accent when the registry marks any), maintainers source. Bands `Lookups [ Registry contract ]` with one cell per method, each a link into the explorer, and `Access` with leads `Create`, `Import`, `PURL`, `Try`.
- **Roster.** `ecosystems()` in the bar, manifest order until a header is clicked. Columns: registry, PURL form, how the adapter reads it, and the marks at the end of a dotted leader, `nothing` in the dimmed color for Packagist.
- **Landing instruments.** Every one keeps one height across the six samples at every width: values end in an ellipsis with the whole value in a `UTooltip`, and the versions list keeps four slots because Arch has one version per package.

## Motion

| Change | Motion |
| --- | --- |
| landing sample advances (3.2 s, paused on hover and focus) | ruler cursor once, scan and reticle arcs on the package and tool call, rows slide in, file name rolls |
| lookup in flight | ruler cursor loops (`console-cursor-busy`) on the form and the answer |
| reduced motion | no walk; previous and next still work |

## Differences

Departures from the shared rules, recorded for the shared package:

- The landing instruments walk recorded samples and swap in the worker's live answer when it lands; the bar meta says `recorded` or `live`, as on explorers.
- The landing's hero instrument is a working form, so it stays on a phone (`hero-instrument-keep`).
- The lookup page has no metrics row in its hero zone: its only number, the rate limit, lives in `server/utils/query.ts`, which the page cannot read.
- Brand glyphs come from `simple-icons` (npm, crates.io, PyPI, RubyGems, Composer, Arch Linux): package registries have no monochrome set of their own like `token` for chains.
- Below 360px the landing's header and footer take the 16px docs gutter: the logo and three icon cells do not fit in 320px with 32px on each side.
- The version comes from the root `package.json`; no data version exists, so ID strips and footers carry none.
- The OG images ship local Figtree and Fira Code TTFs, the keys mechanism.

## Checks

Beyond the shared checks: the landing at 1440, 1024, 390 and 320 px with the heights of the four walked instruments through all six samples, `/lookup?purl=pkg:cargo/serde&op=versions`, `/registries` and one registry page.
