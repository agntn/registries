import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '../../src/core/client.ts'
import { HTTPError, NotFoundError } from '../../src/core/errors.ts'
import { create } from '../../src/core/registry.ts'
import '../../src/registries/index.ts'

function fedoraPackageResponse(overrides: Record<string, unknown> = {}) {
  return {
    epoch: '0',
    version: '5.3.9',
    release: '3.fc44',
    repo: 'release',
    arch: 'x86_64',
    summary: 'The GNU Bourne Again shell',
    description: 'Bash shell implementation',
    basename: 'bash',
    url: 'https://www.gnu.org/software/bash',
    requires: [
      { epoch: '', version: '', release: '', name: '/bin/sh', flags: '' },
      { epoch: '', version: '', release: '', name: 'bash', flags: '' },
      { epoch: '0', version: '3', release: '', name: 'filesystem', flags: 'GE' },
      { epoch: '', version: '', release: '', name: 'rpmlib(PayloadIsZstd)', flags: '' },
    ],
    'co-packages': ['bash', 'bash-devel', 'bash-doc'],
    ...overrides,
  }
}

function fedoraChangelogResponse(overrides: Record<string, unknown> = {}) {
  return {
    repo: 'release',
    changelogs: [
      {
        author: 'Fedora Release Engineering <releng@fedoraproject.org> - 5.3.9-3',
        changelog: '- mass rebuild',
        date: 1768564801,
      },
      {
        author: 'Siteshwar Vashisht <svashisht@redhat.com> - 5.3.9-1',
        changelog: '- Update package',
        date: 1767614400,
      },
      {
        author: 'Katerina Dudka <kdudka@redhat.com> - 5.3.8-1',
        changelog: '- Fix tests',
        date: 1766000000,
      },
    ],
    ...overrides,
  }
}

describe('fedora registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch and normalize package from default rawhide branch', async () => {
    const client = new Client()
    vi.spyOn(client, 'getJSON').mockResolvedValueOnce(fedoraPackageResponse())

    const registry = create('rpm', undefined, client)
    const pkg = await registry.fetchPackage('bash')

    expect(pkg.name).toBe('bash')
    expect(pkg.description).toBe('The GNU Bourne Again shell')
    expect(pkg.homepage).toBe('https://www.gnu.org/software/bash')
    expect(pkg.repository).toBe('https://src.fedoraproject.org/rpms/bash')
    expect(pkg.namespace).toBe('fedora')
    expect(pkg.latestVersion).toBe('5.3.9-3.fc44')
    expect(pkg.keywords).toEqual(['bash-devel', 'bash-doc'])
    expect(pkg.metadata.branch).toBe('rawhide')
  })

  it('should fetch package from explicit fedora branch', async () => {
    const client = new Client()
    const getJSON = vi.spyOn(client, 'getJSON').mockResolvedValueOnce(
      fedoraPackageResponse({ version: '5.2.37', release: '1.fc42' }),
    )

    const registry = create('rpm', undefined, client)
    const pkg = await registry.fetchPackage('fedora/f42/bash')

    expect(pkg.namespace).toBe('fedora')
    expect(pkg.latestVersion).toBe('5.2.37-1.fc42')
    expect(getJSON).toHaveBeenCalledWith(
      expect.stringContaining('/f42/pkg/bash'),
      undefined,
    )
  })

  it('should list versions across fedora branches when namespace is omitted', async () => {
    const client = new Client()
    vi.spyOn(client, 'getJSON').mockImplementation(async (url: string) => {
      if (url.endsWith('/')) {
        return ['rawhide', 'f43', 'f42', 'src_f43']
      }
      if (url.includes('/rawhide/pkg/bash')) {
        return fedoraPackageResponse({ version: '5.3.9', release: '3.fc44' })
      }
      if (url.includes('/f43/pkg/bash')) {
        return fedoraPackageResponse({ version: '5.3.0', release: '2.fc43' })
      }
      if (url.includes('/f42/pkg/bash')) {
        return fedoraPackageResponse({ version: '5.2.37', release: '1.fc42' })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    const registry = create('rpm', undefined, client)
    const versions = await registry.fetchVersions('bash')

    expect(versions).toHaveLength(3)
    expect(versions[0]?.number).toBe('5.3.9-3.fc44')
    expect(versions[0]?.metadata.branch).toBe('rawhide')
    expect(versions[1]?.metadata.branch).toBe('f43')
    expect(versions[2]?.metadata.branch).toBe('f42')
  })

  it('should parse dependency requirements and skip file/rpmlib requires', async () => {
    const client = new Client()
    vi.spyOn(client, 'getJSON').mockResolvedValueOnce(fedoraPackageResponse())

    const registry = create('rpm', undefined, client)
    const deps = await registry.fetchDependencies('bash', '5.3.9-3.fc44')

    expect(deps).toHaveLength(2)
    expect(deps[0]).toEqual({
      name: 'bash',
      requirements: '',
      scope: 'runtime',
      optional: false,
    })
    expect(deps[1]).toEqual({
      name: 'filesystem',
      requirements: '>=3',
      scope: 'runtime',
      optional: false,
    })
  })

  it('should enforce exact package version for dependency lookup', async () => {
    const client = new Client()
    vi.spyOn(client, 'getJSON').mockResolvedValueOnce(fedoraPackageResponse())

    const registry = create('rpm', undefined, client)

    await expect(registry.fetchDependencies('bash', '5.3.9-2.fc44')).rejects.toThrow(
      NotFoundError,
    )
  })

  it('should derive maintainers from changelog and skip releng entries', async () => {
    const client = new Client()
    vi.spyOn(client, 'getJSON').mockResolvedValueOnce(fedoraChangelogResponse())

    const registry = create('rpm', undefined, client)
    const maintainers = await registry.fetchMaintainers('bash')

    expect(maintainers).toHaveLength(2)
    expect(maintainers[0]).toMatchObject({
      login: 'svashisht',
      name: 'Siteshwar Vashisht',
      email: 'svashisht@redhat.com',
      role: 'maintainer',
    })
  })

  it('should map HTTP 404 to NotFoundError', async () => {
    const client = new Client()
    vi.spyOn(client, 'getJSON').mockRejectedValueOnce(
      new HTTPError(404, 'https://mdapi.fedoraproject.org/rawhide/pkg/missing', 'Not Found'),
    )

    const registry = create('rpm', undefined, client)

    await expect(registry.fetchPackage('missing')).rejects.toThrow(NotFoundError)
  })

  it('should build expected fedora URLs and PURLs', () => {
    const registry = create('rpm')
    const urls = registry.urls()

    expect(urls.registry('bash')).toBe('https://packages.fedoraproject.org/pkgs/bash/bash/')
    expect(urls.download('fedora/f42/bash', '5.2.37-1.fc42')).toBe('https://packages.fedoraproject.org/pkgs/bash/bash/fedora-42.html')
    expect(urls.purl('bash', '5.3.9-3.fc44')).toBe('pkg:rpm/fedora/bash@5.3.9-3.fc44')
    expect(urls.purl('fedora/f42/bash', '5.2.37-1.fc42')).toBe('pkg:rpm/fedora/f42/bash@5.2.37-1.fc42')
  })
})
