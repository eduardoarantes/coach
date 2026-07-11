export const MCP_RESOURCE_PATH = '/mcp'

export function getMcpResourceUrl(siteUrl: string): string {
  const url = new URL(MCP_RESOURCE_PATH, siteUrl)
  url.hash = ''
  url.search = ''
  return normalizeResourceUrl(url.href)!
}

export function normalizeResourceUrl(resource: string): string | null {
  try {
    const url = new URL(resource)
    if (url.hash) return null
    url.hash = ''
    url.search = ''
    let normalized = `${url.origin}${url.pathname}`
    if (normalized.endsWith('/') && url.pathname !== '/') {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  } catch {
    return null
  }
}

export function isMcpResourceRequest(
  resource: string | undefined | null,
  siteUrl: string
): boolean {
  if (!resource) return false
  const normalized = normalizeResourceUrl(resource)
  const expected = getMcpResourceUrl(siteUrl)
  return normalized === expected
}

export function assertMcpResource(resource: string | undefined | null, siteUrl: string): string {
  const normalized = resource ? normalizeResourceUrl(resource) : null
  const expected = getMcpResourceUrl(siteUrl)
  if (!normalized || normalized !== expected) {
    throw new Error(`Invalid resource. Expected ${expected}`)
  }
  return normalized
}
