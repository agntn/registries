import type { Dependency, Package } from "@agntn/registries";

/**
 * Answers recorded through the library on 2026-09-03, so the landing has content
 * before the docs worker answers and when it cannot. Every panel labels a recorded
 * answer as a sample and swaps to a live one as soon as it arrives.
 *
 * Regenerate with the library (see docs/AGENTS.md); do not edit by hand.
 */

export interface SampleVersion {
  readonly number: string;
  readonly publishedAt: string | null;
  readonly status: string;
  readonly licenses: string;
}

export interface SampleMaintainer {
  readonly login: string;
  readonly name: string;
  readonly role: string;
  readonly url: string;
}

export interface LookupSample {
  readonly purl: string;
  readonly ecosystem: string;
  readonly name: string;
  readonly package: Package;
  readonly urls: { readonly registry: string; readonly documentation: string; readonly readme: string; readonly purl: string };
  readonly versionsTotal: number;
  readonly versions: readonly SampleVersion[];
  readonly dependencies: readonly Dependency[];
  readonly dependenciesTotal: number;
  readonly maintainers: readonly SampleMaintainer[];
  readonly maintainersTotal: number;
  /** Whether the answer came from the docs worker in this session. */
  readonly live: boolean;
}

export const LANDING_SAMPLES: readonly LookupSample[] = [
  {
    "purl": "pkg:npm/lodash",
    "ecosystem": "npm",
    "name": "lodash",
    "package": {
      "name": "lodash",
      "description": "Lodash modular utilities.",
      "homepage": "https://lodash.com/",
      "documentation": "",
      "repository": "https://github.com/lodash/lodash",
      "licenses": "MIT",
      "keywords": [
        "modules",
        "stdlib",
        "util"
      ],
      "namespace": "",
      "latestVersion": "4.18.1",
      "metadata": {}
    },
    "urls": {
      "registry": "https://www.npmjs.com/package/lodash",
      "documentation": "https://lodash.com/",
      "readme": "https://cdn.jsdelivr.net/npm/lodash@4.18.1/README.md",
      "purl": "pkg:npm/lodash@4.18.1"
    },
    "versionsTotal": 117,
    "versions": [
      {
        "number": "4.18.1",
        "publishedAt": "2026-04-01T21:01:20.458Z",
        "status": "",
        "licenses": "MIT"
      },
      {
        "number": "4.18.0",
        "publishedAt": "2026-03-31T18:18:42.717Z",
        "status": "deprecated",
        "licenses": "MIT"
      },
      {
        "number": "4.17.23",
        "publishedAt": "2026-01-21T17:29:52.831Z",
        "status": "",
        "licenses": "MIT"
      },
      {
        "number": "4.17.21",
        "publishedAt": "2021-02-20T15:42:16.891Z",
        "status": "",
        "licenses": "MIT"
      }
    ],
    "dependencies": [],
    "dependenciesTotal": 0,
    "maintainers": [
      {
        "login": "john.david.dalton",
        "name": "jdalton",
        "role": "",
        "url": ""
      },
      {
        "login": "mathias",
        "name": "Mathias Bynens",
        "role": "contributor",
        "url": ""
      }
    ],
    "maintainersTotal": 2,
    "live": false
  },
  {
    "purl": "pkg:cargo/serde",
    "ecosystem": "cargo",
    "name": "serde",
    "package": {
      "name": "serde",
      "description": "A generic serialization/deserialization framework",
      "homepage": "https://serde.rs",
      "documentation": "https://docs.rs/serde",
      "repository": "https://github.com/serde-rs/serde",
      "licenses": "MIT OR Apache-2.0",
      "keywords": [
        "serialization",
        "no_std",
        "serde"
      ],
      "namespace": "",
      "latestVersion": "1.0.229",
      "metadata": {}
    },
    "urls": {
      "registry": "https://crates.io/crates/serde",
      "documentation": "https://docs.rs/serde",
      "readme": "https://crates.io/api/v1/crates/serde/1.0.229/readme",
      "purl": "pkg:cargo/serde@1.0.229"
    },
    "versionsTotal": 316,
    "versions": [
      {
        "number": "1.0.229",
        "publishedAt": "2026-07-18T23:05:13.266Z",
        "status": "",
        "licenses": "MIT OR Apache-2.0"
      },
      {
        "number": "1.0.228",
        "publishedAt": "2025-09-27T16:51:35.265Z",
        "status": "",
        "licenses": "MIT OR Apache-2.0"
      },
      {
        "number": "1.0.227",
        "publishedAt": "2025-09-25T23:43:08.742Z",
        "status": "",
        "licenses": "MIT OR Apache-2.0"
      },
      {
        "number": "1.0.226",
        "publishedAt": "2025-09-20T23:37:58.558Z",
        "status": "",
        "licenses": "MIT OR Apache-2.0"
      }
    ],
    "dependencies": [
      {
        "name": "serde_core",
        "requirements": "=1.0.229",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "serde_derive",
        "requirements": "^1",
        "scope": "runtime",
        "optional": true
      }
    ],
    "dependenciesTotal": 2,
    "maintainers": [
      {
        "login": "dtolnay",
        "name": "David Tolnay",
        "role": "",
        "url": "https://github.com/dtolnay"
      }
    ],
    "maintainersTotal": 1,
    "live": false
  },
  {
    "purl": "pkg:pypi/flask",
    "ecosystem": "pypi",
    "name": "flask",
    "package": {
      "name": "Flask",
      "description": "A simple framework for building complex web applications.",
      "homepage": "",
      "documentation": "https://flask.palletsprojects.com/",
      "repository": "https://github.com/pallets/flask",
      "licenses": "",
      "keywords": [],
      "namespace": "",
      "latestVersion": "3.1.3",
      "metadata": {}
    },
    "urls": {
      "registry": "https://pypi.org/project/flask",
      "documentation": "https://flask.palletsprojects.com/",
      "readme": "https://pypi.org/project/flask/3.1.3/",
      "purl": "pkg:pypi/flask@3.1.3"
    },
    "versionsTotal": 64,
    "versions": [
      {
        "number": "3.1.3",
        "publishedAt": "2026-02-19T05:00:57.678Z",
        "status": "",
        "licenses": ""
      },
      {
        "number": "3.1.2",
        "publishedAt": "2025-08-19T21:03:21.205Z",
        "status": "",
        "licenses": ""
      },
      {
        "number": "3.1.1",
        "publishedAt": "2025-05-13T15:01:17.447Z",
        "status": "",
        "licenses": ""
      },
      {
        "number": "3.1.0",
        "publishedAt": "2024-11-13T18:24:38.127Z",
        "status": "",
        "licenses": ""
      }
    ],
    "dependencies": [
      {
        "name": "blinker",
        "requirements": ">=1.9.0",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "click",
        "requirements": ">=8.1.3",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "importlib-metadata",
        "requirements": ">=3.6.0",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "itsdangerous",
        "requirements": ">=2.2.0",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "jinja2",
        "requirements": ">=3.1.2",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "markupsafe",
        "requirements": ">=2.1.1",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "werkzeug",
        "requirements": ">=3.1.0",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "asgiref",
        "requirements": ">=3.2",
        "scope": "runtime",
        "optional": true
      }
    ],
    "dependenciesTotal": 9,
    "maintainers": [],
    "maintainersTotal": 0,
    "live": false
  },
  {
    "purl": "pkg:gem/rails",
    "ecosystem": "gem",
    "name": "rails",
    "package": {
      "name": "rails",
      "description": "",
      "homepage": "https://rubyonrails.org",
      "documentation": "https://api.rubyonrails.org/v8.1.3.1/",
      "repository": "https://github.com/rails/rails/tree/v8.1.3.1",
      "licenses": "MIT",
      "keywords": [],
      "namespace": "",
      "latestVersion": "8.1.3.1",
      "metadata": {}
    },
    "urls": {
      "registry": "https://rubygems.org/gems/rails",
      "documentation": "https://api.rubyonrails.org/v8.1.3.1/",
      "readme": "https://rubygems.org/gems/rails/versions/8.1.3.1",
      "purl": "pkg:gem/rails@8.1.3.1"
    },
    "versionsTotal": 519,
    "versions": [
      {
        "number": "8.0.5.1",
        "publishedAt": "2026-07-29T15:10:16.536Z",
        "status": "",
        "licenses": ""
      },
      {
        "number": "7.2.3.2",
        "publishedAt": "2026-07-29T15:08:39.997Z",
        "status": "",
        "licenses": ""
      },
      {
        "number": "8.1.3.1",
        "publishedAt": "2026-07-29T15:02:41.060Z",
        "status": "",
        "licenses": ""
      },
      {
        "number": "8.1.3",
        "publishedAt": "2026-03-24T20:27:42.098Z",
        "status": "",
        "licenses": ""
      }
    ],
    "dependencies": [
      {
        "name": "actioncable",
        "requirements": "= 8.1.3.1",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "actionmailbox",
        "requirements": "= 8.1.3.1",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "actionmailer",
        "requirements": "= 8.1.3.1",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "actionpack",
        "requirements": "= 8.1.3.1",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "actiontext",
        "requirements": "= 8.1.3.1",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "actionview",
        "requirements": "= 8.1.3.1",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "activejob",
        "requirements": "= 8.1.3.1",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "activemodel",
        "requirements": "= 8.1.3.1",
        "scope": "runtime",
        "optional": false
      }
    ],
    "dependenciesTotal": 13,
    "maintainers": [
      {
        "login": "fxn",
        "name": "fxn",
        "role": "",
        "url": ""
      },
      {
        "login": "tenderlove",
        "name": "tenderlove",
        "role": "",
        "url": ""
      },
      {
        "login": "cantoniodasilva",
        "name": "cantoniodasilva",
        "role": "",
        "url": ""
      },
      {
        "login": "guilleiguaran",
        "name": "guilleiguaran",
        "role": "",
        "url": ""
      }
    ],
    "maintainersTotal": 10,
    "live": false
  },
  {
    "purl": "pkg:composer/laravel/framework",
    "ecosystem": "composer",
    "name": "laravel/framework",
    "package": {
      "name": "laravel/framework",
      "description": "The Laravel Framework.",
      "homepage": "",
      "documentation": "",
      "repository": "https://github.com/laravel/framework",
      "licenses": "MIT",
      "keywords": [],
      "namespace": "laravel",
      "latestVersion": "v13.30.1",
      "metadata": {}
    },
    "urls": {
      "registry": "https://packagist.org/packages/laravel/framework",
      "documentation": "https://packagist.org/packages/laravel/framework",
      "readme": "https://packagist.org/packages/laravel/framework",
      "purl": "pkg:composer/laravel/framework@v13.30.1"
    },
    "versionsTotal": 1318,
    "versions": [
      {
        "number": "13.x-dev",
        "publishedAt": "2026-09-02T18:28:06.000Z",
        "status": "",
        "licenses": "MIT"
      },
      {
        "number": "dev-master",
        "publishedAt": "2026-09-02T16:58:00.000Z",
        "status": "",
        "licenses": "MIT"
      },
      {
        "number": "v13.30.1",
        "publishedAt": "2026-09-01T21:42:30.000Z",
        "status": "",
        "licenses": "MIT"
      },
      {
        "number": "12.x-dev",
        "publishedAt": "2026-09-01T21:36:25.000Z",
        "status": "",
        "licenses": "MIT"
      }
    ],
    "dependencies": [
      {
        "name": "composer-runtime-api",
        "requirements": "^2.2",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "brick/math",
        "requirements": "^0.14.2 || ^0.15 || ^0.16 || ^0.17 || ^0.18 || ^0.19",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "doctrine/inflector",
        "requirements": "^2.0.5",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "dragonmantank/cron-expression",
        "requirements": "^3.4",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "egulias/email-validator",
        "requirements": "^4.0",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "fruitcake/php-cors",
        "requirements": "^1.3",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "guzzlehttp/guzzle",
        "requirements": "^7.8.2 || ^8.0",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "guzzlehttp/promises",
        "requirements": "^2.0.3 || ^3.0",
        "scope": "runtime",
        "optional": false
      }
    ],
    "dependenciesTotal": 65,
    "maintainers": [
      {
        "login": "taylor",
        "name": "Taylor Otwell",
        "role": "",
        "url": ""
      },
      {
        "login": "taylorotwell",
        "name": "Taylor Otwell",
        "role": "",
        "url": ""
      }
    ],
    "maintainersTotal": 2,
    "live": false
  },
  {
    "purl": "pkg:alpm/arch/pacman",
    "ecosystem": "alpm",
    "name": "arch/pacman",
    "package": {
      "name": "pacman",
      "description": "A library-based package manager with dependency support",
      "homepage": "https://www.archlinux.org/pacman/",
      "documentation": "",
      "repository": "",
      "licenses": "GPL-2.0-or-later",
      "keywords": [],
      "namespace": "arch",
      "latestVersion": "7.1.0.r9.g54d9411-2",
      "metadata": {}
    },
    "urls": {
      "registry": "https://archlinux.org/packages/?name=pacman",
      "documentation": "https://www.archlinux.org/pacman/",
      "readme": "",
      "purl": "pkg:alpm/arch/pacman@7.1.0.r9.g54d9411-2"
    },
    "versionsTotal": 1,
    "versions": [
      {
        "number": "7.1.0.r9.g54d9411-2",
        "publishedAt": "2026-05-07T12:12:14.379Z",
        "status": "",
        "licenses": "GPL-2.0-or-later"
      }
    ],
    "dependencies": [
      {
        "name": "bash",
        "requirements": "",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "coreutils",
        "requirements": "",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "curl",
        "requirements": "",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "gawk",
        "requirements": "",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "gettext",
        "requirements": "",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "glibc",
        "requirements": "",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "gnupg",
        "requirements": "",
        "scope": "runtime",
        "optional": false
      },
      {
        "name": "gpgme",
        "requirements": "",
        "scope": "runtime",
        "optional": false
      }
    ],
    "dependenciesTotal": 26,
    "maintainers": [
      {
        "login": "anthraxx",
        "name": "anthraxx",
        "role": "maintainer",
        "url": ""
      }
    ],
    "maintainersTotal": 1,
    "live": false
  }
];
