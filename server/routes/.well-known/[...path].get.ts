import {
  buildCoachWattsOAuthMetadata,
  buildCoachWattsProtectedResourceMetadata
} from '../../utils/oauth/metadata'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl
  const pathParam = getRouterParam(event, 'path') || ''
  const metadataOptions = {
    includeRegistrationEndpoint: config.mcpDcrEnabled === true
  }

  setHeader(event, 'Access-Control-Allow-Origin', '*')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  if (pathParam === 'oauth-protected-resource/mcp' || pathParam === 'oauth-protected-resource') {
    return buildCoachWattsProtectedResourceMetadata(siteUrl, metadataOptions)
  }

  if (pathParam === 'oauth-authorization-server') {
    return buildCoachWattsOAuthMetadata(siteUrl, metadataOptions)
  }

  throw createError({ statusCode: 404, message: 'Not found' })
})
