import type { OAuthTokenVerifier, AuthInfo } from '@modelcontextprotocol/server'
import { OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server'
import { oauthRepository } from '../repositories/oauthRepository'
import { prisma } from '../db'
import { getMcpResourceUrl, normalizeResourceUrl } from '../oauth/resource'

export function createMcpTokenVerifier(siteUrl: string): OAuthTokenVerifier {
  const expectedResource = getMcpResourceUrl(siteUrl)

  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const record = await oauthRepository.getAccessToken(token)
      if (!record) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid access token')
      }

      if (record.accessTokenExpiresAt < new Date()) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Access token expired')
      }

      if (record.user.deactivatedAt) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Account deactivated')
      }

      const tokenResource = record.resource ? normalizeResourceUrl(record.resource) : null
      if (!tokenResource || tokenResource !== expectedResource) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Token audience mismatch')
      }

      prisma.oAuthToken
        .update({
          where: { id: record.id },
          data: { lastUsedAt: new Date() }
        })
        .catch(() => undefined)

      return {
        token,
        clientId: record.app.clientId,
        scopes: record.scopes,
        expiresAt: Math.floor(record.accessTokenExpiresAt.getTime() / 1000),
        resource: new URL(expectedResource),
        extra: {
          userId: record.userId,
          appId: record.appId,
          tokenId: record.id
        }
      }
    }
  }
}

export function authInfoToMcpContext(
  authInfo: AuthInfo,
  requestId: string,
  idempotencyKey?: string
) {
  const userId = authInfo.extra?.userId
  const appId = authInfo.extra?.appId
  const tokenId = authInfo.extra?.tokenId

  if (typeof userId !== 'string' || typeof appId !== 'string' || typeof tokenId !== 'string') {
    throw new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid token context')
  }

  return {
    userId,
    appId,
    tokenId,
    scopes: authInfo.scopes,
    requestId,
    idempotencyKey,
    authInfo
  }
}
