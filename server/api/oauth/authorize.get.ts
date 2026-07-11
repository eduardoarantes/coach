import { prisma } from '../../utils/db'
import { parseScopeString, validateMcpOAuthScopes } from '../../utils/oauth/scopes'
import { assertMcpResource, isMcpResourceRequest } from '../../utils/oauth/resource'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'Authorize OAuth Application',
    description:
      'Initiates the OAuth 2.0 authorization code flow. Validates parameters and redirects to the consent screen.'
  }
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl
  const query = getQuery(event)
  const responseType = query.response_type as string
  const clientId = query.client_id as string
  const redirectUri = query.redirect_uri as string
  const scope = query.scope as string
  const state = query.state as string
  const prompt = query.prompt as string
  const codeChallenge = query.code_challenge as string
  const codeChallengeMethod = query.code_challenge_method as string
  const resource = query.resource as string

  if (!responseType || !clientId || !redirectUri) {
    throw createError({
      statusCode: 400,
      message:
        'Missing required parameters: response_type, client_id, and redirect_uri are required.'
    })
  }

  if (responseType !== 'code') {
    throw createError({
      statusCode: 400,
      message: 'Unsupported response_type. Only "code" is supported.'
    })
  }

  const app = await prisma.oAuthApp.findUnique({
    where: { clientId }
  })

  if (!app) {
    throw createError({ statusCode: 400, message: 'Invalid client_id.' })
  }

  if (!app.redirectUris.includes(redirectUri)) {
    throw createError({
      statusCode: 400,
      message:
        'The redirect_uri provided does not match any registered redirect URIs for this application.'
    })
  }

  const isMcpFlow = isMcpResourceRequest(resource, siteUrl)

  if (isMcpFlow) {
    if (!codeChallenge) {
      throw createError({
        statusCode: 400,
        message: 'PKCE code_challenge is required for MCP authorization.'
      })
    }
    if (codeChallengeMethod && codeChallengeMethod !== 'S256') {
      throw createError({
        statusCode: 400,
        message: 'Only S256 PKCE is supported for MCP authorization.'
      })
    }

    try {
      assertMcpResource(resource, siteUrl)
      const scopes = parseScopeString(scope)
      if (scopes.length > 0) {
        validateMcpOAuthScopes(scopes)
      }
    } catch (error) {
      throw createError({
        statusCode: 400,
        message: error instanceof Error ? error.message : 'Invalid MCP authorization request'
      })
    }
  }

  const consentUrl = new URL('/oauth/authorize', siteUrl)
  consentUrl.searchParams.set('client_id', clientId)
  consentUrl.searchParams.set('redirect_uri', redirectUri)
  consentUrl.searchParams.set('scope', scope || (isMcpFlow ? '' : 'profile:read'))
  if (state) consentUrl.searchParams.set('state', state)
  if (prompt) consentUrl.searchParams.set('prompt', prompt)
  if (resource) consentUrl.searchParams.set('resource', resource)
  if (codeChallenge) {
    consentUrl.searchParams.set('code_challenge', codeChallenge)
    consentUrl.searchParams.set(
      'code_challenge_method',
      isMcpFlow ? 'S256' : codeChallengeMethod || 'S256'
    )
  }

  return sendRedirect(event, consentUrl.toString())
})
