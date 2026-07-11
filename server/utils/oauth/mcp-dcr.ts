import { prisma } from '../db'
import { CURSOR_MCP_APP_NAME, CURSOR_MCP_REDIRECT_URIS } from './cursor-mcp-client'
import { validateRedirectUris } from './redirect-uri'
import { oauthRepository } from '../repositories/oauthRepository'

function isLoopbackCallback(uri: string): boolean {
  try {
    const parsed = new URL(uri)
    const hostname = parsed.hostname
    return (
      parsed.protocol === 'http:' &&
      (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') &&
      parsed.pathname.endsWith('/callback')
    )
  } catch {
    return false
  }
}

export function isCursorCompatibleDcrRequest(redirectUris: string[]): boolean {
  if (!redirectUris.length) return false
  const canonical = new Set<string>(CURSOR_MCP_REDIRECT_URIS)
  return redirectUris.every((uri) => canonical.has(uri) || isLoopbackCallback(uri))
}

export async function resolveMcpDcrOwnerId(options: {
  ownerUserId?: string
  ownerEmail?: string
}): Promise<string | null> {
  if (options.ownerUserId) {
    return options.ownerUserId
  }

  if (options.ownerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: options.ownerEmail },
      select: { id: true }
    })
    if (user) return user.id
  }

  const admin = await prisma.user.findFirst({
    where: { isAdmin: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  })
  return admin?.id ?? null
}

export async function findOrCreateCursorMcpApp(options: {
  ownerId: string
  redirectUris: string[]
}) {
  const redirectUris = validateRedirectUris(options.redirectUris)

  const existing = await prisma.oAuthApp.findFirst({
    where: {
      name: CURSOR_MCP_APP_NAME,
      isPublicClient: true
    },
    orderBy: { createdAt: 'asc' },
    select: {
      clientId: true,
      name: true,
      redirectUris: true,
      createdAt: true,
      registrationType: true,
      isPublicClient: true
    }
  })

  if (existing) {
    const mergedRedirectUris = validateRedirectUris([
      ...new Set([...existing.redirectUris, ...redirectUris])
    ])

    if (mergedRedirectUris.length !== existing.redirectUris.length) {
      await prisma.oAuthApp.update({
        where: { clientId: existing.clientId },
        data: { redirectUris: mergedRedirectUris }
      })
    }

    return {
      ...existing,
      redirectUris: mergedRedirectUris
    }
  }

  return oauthRepository.createPublicMcpClient({
    ownerId: options.ownerId,
    name: CURSOR_MCP_APP_NAME,
    redirectUris: validateRedirectUris([
      ...new Set([...CURSOR_MCP_REDIRECT_URIS, ...redirectUris])
    ]),
    homepageUrl: 'https://cursor.com'
  })
}

export function serializeDcrRegistrationResponse(app: {
  clientId: string
  name: string
  redirectUris: string[]
  createdAt: Date
}) {
  return {
    client_id: app.clientId,
    client_id_issued_at: Math.floor(app.createdAt.getTime() / 1000),
    client_name: app.name,
    redirect_uris: app.redirectUris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code']
  }
}
