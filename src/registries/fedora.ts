import type { Client } from '../core/client.ts'
import type {
  Dependency,
  Maintainer,
  Package,
  Registry,
  RegistryFactory,
  URLBuilder,
  Version,
} from '../core/types.ts'
import { register } from '../core/registry.ts'
import { HTTPError, NotFoundError } from '../core/errors.ts'

interface FedoraDependencyRef {
  epoch: string
  version: string
  release: string
  name: string
  flags: string
}

interface FedoraPackageResponse {
  epoch: string
  version: string
  release: string
  repo: string
  arch: string
  summary: string
  description: string
  basename: string
  url: string
  requires: FedoraDependencyRef[]
  'co-packages': string[]
}

interface FedoraChangelogEntry {
  author: string
  changelog: string
  date: number
}

interface FedoraChangelogResponse {
  repo: string
  changelogs: FedoraChangelogEntry[]
}

interface ParsedName {
  namespace: string
  branch: string
  packageName: string
  explicitNamespace: boolean
  explicitBranch: boolean
}

const RAW_HIDE = 'rawhide'
const FEDORA_BRANCH = /^f\d+$/
const DEFAULT_NAMESPACE = 'fedora'

class FedoraRegistry implements Registry {
  constructor(
    baseURL: string,
    client: Client,
  ) {
    this.baseURL = baseURL
    this.client = client
  }

  readonly baseURL: string
  readonly client: Client

  ecosystem(): string {
    return 'rpm'
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const parsed = this.parseName(name)
    const data = await this.fetchBranchPackage(parsed.branch, parsed.packageName, signal)

    return {
      name: data.basename,
      description: data.summary || data.description || '',
      homepage: data.url || '',
      documentation: '',
      repository: `https://src.fedoraproject.org/rpms/${data.basename}`,
      licenses: '',
      keywords: this.extractKeywords(data),
      namespace: parsed.namespace,
      latestVersion: this.formatNEVR(data),
      metadata: {
        namespace: parsed.namespace,
        branch: parsed.branch,
        arch: data.arch,
        repo: data.repo,
        summary: data.summary,
      },
    }
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const parsed = this.parseName(name)

    if (parsed.explicitBranch) {
      const data = await this.fetchBranchPackage(parsed.branch, parsed.packageName, signal)
      return [this.toVersionEntry(parsed.branch, data)]
    }

    const branches = await this.listFedoraBranches(signal)
    const settled = await Promise.all(
      branches.map(async (branch) => {
        try {
          const data = await this.fetchBranchPackage(branch, parsed.packageName, signal)
          return this.toVersionEntry(branch, data)
        }
        catch (error) {
          if (error instanceof NotFoundError) {
            return null
          }
          throw error
        }
      }),
    )

    return settled.filter((entry): entry is Version => entry !== null)
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const parsed = this.parseName(name)
    const data = await this.fetchBranchPackage(parsed.branch, parsed.packageName, signal)
    const currentVersion = this.formatNEVR(data)

    if (version && version !== currentVersion) {
      throw new NotFoundError('rpm', name, version)
    }

    const dependencies: Dependency[] = []

    for (const dep of data.requires) {
      if (dep.name.startsWith('/') || dep.name.startsWith('rpmlib(')) {
        continue
      }

      dependencies.push({
        name: dep.name,
        requirements: this.buildRequirement(dep),
        scope: 'runtime',
        optional: false,
      })
    }

    return dependencies
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const parsed = this.parseName(name)
    const changelog = await this.fetchBranchChangelog(parsed.branch, parsed.packageName, signal)
    const maintainers: Maintainer[] = []
    const seen = new Set<string>()

    for (const entry of changelog.changelogs) {
      const parsedAuthor = this.parseAuthor(entry.author)
      if (!parsedAuthor) {
        continue
      }

      const key = `${parsedAuthor.name}:${parsedAuthor.email}`
      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      maintainers.push({
        uuid: '',
        login: parsedAuthor.email ? parsedAuthor.email.split('@')[0] ?? '' : '',
        name: parsedAuthor.name,
        email: parsedAuthor.email,
        url: '',
        role: 'maintainer',
      })
    }

    return maintainers
  }

  urls(): URLBuilder {
    return {
      registry: (name: string, _version?: string) => {
        const parsed = this.parseName(name)
        return `https://packages.fedoraproject.org/pkgs/${parsed.packageName}/${parsed.packageName}/`
      },
      download: (name: string, _version: string) => {
        const parsed = this.parseName(name)
        return `https://packages.fedoraproject.org/pkgs/${parsed.packageName}/${parsed.packageName}/${this.branchToSlug(parsed.branch)}.html`
      },
      documentation: (name: string, _version?: string) => {
        const parsed = this.parseName(name)
        return `https://packages.fedoraproject.org/pkgs/${parsed.packageName}/${parsed.packageName}/`
      },
      readme: (name: string, _version?: string) => {
        const parsed = this.parseName(name)
        return `https://packages.fedoraproject.org/pkgs/${parsed.packageName}/${parsed.packageName}/`
      },
      purl: (name: string, version?: string) => {
        const parsed = this.parseName(name)
        const versionSuffix = version ? `@${version}` : ''

        if (parsed.explicitBranch) {
          return `pkg:rpm/${parsed.namespace}/${parsed.branch}/${parsed.packageName}${versionSuffix}`
        }

        return `pkg:rpm/${parsed.namespace}/${parsed.packageName}${versionSuffix}`
      },
    }
  }

  private parseName(fullName: string): ParsedName {
    const normalized = fullName.trim().toLowerCase()
    if (!normalized) {
      throw new NotFoundError('rpm', fullName)
    }

    const segments = normalized.split('/').filter(Boolean)
    if (segments.length === 1) {
      return {
        namespace: DEFAULT_NAMESPACE,
        branch: RAW_HIDE,
        packageName: normalized,
        explicitNamespace: false,
        explicitBranch: false,
      }
    }

    if (segments.length === 2) {
      const [first, second] = segments
      if (!first || !second) {
        throw new NotFoundError('rpm', fullName)
      }

      if (this.isFedoraBranch(first)) {
        return {
          namespace: DEFAULT_NAMESPACE,
          branch: first,
          packageName: second,
          explicitNamespace: false,
          explicitBranch: true,
        }
      }

      return this.parseNamespaced(first, RAW_HIDE, second, fullName, true, false)
    }

    if (segments.length === 3) {
      const [namespace, branch, packageName] = segments
      if (!namespace || !branch || !packageName || !this.isFedoraBranch(branch)) {
        throw new NotFoundError('rpm', fullName)
      }

      return this.parseNamespaced(namespace, branch, packageName, fullName, true, true)
    }

    throw new NotFoundError('rpm', fullName)
  }

  private isFedoraBranch(branch: string): boolean {
    return branch === RAW_HIDE || FEDORA_BRANCH.test(branch)
  }

  private async listFedoraBranches(signal?: AbortSignal): Promise<string[]> {
    const url = `${this.baseURL}/`

    try {
      const branches = await this.client.getJSON<string[]>(url, signal)
      return branches
        .filter(branch => this.isFedoraBranch(branch))
        .sort((a, b) => {
          if (a === RAW_HIDE) return -1
          if (b === RAW_HIDE) return 1

          const aNum = Number.parseInt(a.slice(1), 10)
          const bNum = Number.parseInt(b.slice(1), 10)
          return bNum - aNum
        })
    }
    catch (error) {
      if (error instanceof HTTPError && (error.isNotFound() || error.statusCode === 400)) {
        throw new NotFoundError('rpm', `${DEFAULT_NAMESPACE}/${RAW_HIDE}`)
      }
      throw error
    }
  }

  private async fetchBranchPackage(branch: string, packageName: string, signal?: AbortSignal): Promise<FedoraPackageResponse> {
    const url = `${this.baseURL}/${branch}/pkg/${encodeURIComponent(packageName)}`

    try {
      return await this.client.getJSON<FedoraPackageResponse>(url, signal)
    }
    catch (error) {
      if (error instanceof HTTPError && (error.isNotFound() || error.statusCode === 400)) {
        throw new NotFoundError('rpm', `${DEFAULT_NAMESPACE}/${branch}/${packageName}`)
      }
      throw error
    }
  }

  private async fetchBranchChangelog(branch: string, packageName: string, signal?: AbortSignal): Promise<FedoraChangelogResponse> {
    const url = `${this.baseURL}/${branch}/changelog/${encodeURIComponent(packageName)}`

    try {
      return await this.client.getJSON<FedoraChangelogResponse>(url, signal)
    }
    catch (error) {
      if (error instanceof HTTPError && (error.isNotFound() || error.statusCode === 400)) {
        throw new NotFoundError('rpm', `${DEFAULT_NAMESPACE}/${branch}/${packageName}`)
      }
      throw error
    }
  }

  private parseNamespaced(
    namespace: string,
    branch: string,
    packageName: string,
    fullName: string,
    explicitNamespace: boolean,
    explicitBranch: boolean,
  ): ParsedName {
    if (namespace !== DEFAULT_NAMESPACE || !packageName) {
      throw new NotFoundError('rpm', fullName)
    }

    return {
      namespace,
      branch,
      packageName,
      explicitNamespace,
      explicitBranch,
    }
  }

  private toVersionEntry(branch: string, data: FedoraPackageResponse): Version {
    return {
      number: this.formatNEVR(data),
      publishedAt: null,
      licenses: '',
      integrity: '',
      status: '',
      metadata: {
        branch,
        arch: data.arch,
        repo: data.repo,
      },
    }
  }

  private formatNEVR(data: FedoraPackageResponse): string {
    const epoch = data.epoch && data.epoch !== '0' ? `${data.epoch}:` : ''
    return `${epoch}${data.version}-${data.release}`
  }

  private extractKeywords(data: FedoraPackageResponse): string[] {
    return data['co-packages'].filter(pkg => pkg !== data.basename)
  }

  private buildRequirement(dep: FedoraDependencyRef): string {
    if (!dep.version) {
      return ''
    }

    const operator = this.mapFlag(dep.flags)
    const epoch = dep.epoch && dep.epoch !== '0' ? `${dep.epoch}:` : ''
    const release = dep.release ? `-${dep.release}` : ''
    return `${operator}${epoch}${dep.version}${release}`
  }

  private mapFlag(flag: string): string {
    switch (flag) {
      case 'EQ':
        return '='
      case 'GE':
        return '>='
      case 'GT':
        return '>'
      case 'LE':
        return '<='
      case 'LT':
        return '<'
      default:
        return ''
    }
  }

  private parseAuthor(author: string): { name: string; email: string } | null {
    if (!author || author.includes('Fedora Release Engineering')) {
      return null
    }

    const match = author.match(/^(.+?)\s*<([^>]+)>/)
    if (!match) {
      return {
        name: author.trim(),
        email: '',
      }
    }

    return {
      name: match[1]!.trim(),
      email: match[2]!.trim(),
    }
  }

  private branchToSlug(branch: string): string {
    if (branch === RAW_HIDE) {
      return 'fedora-rawhide'
    }
    if (FEDORA_BRANCH.test(branch)) {
      return `fedora-${branch.slice(1)}`
    }
    return `fedora-${branch}`
  }
}

const factory: RegistryFactory = (baseURL: string, client: Client): Registry => {
  return new FedoraRegistry(baseURL, client)
}

register('rpm', 'https://mdapi.fedoraproject.org', factory)
