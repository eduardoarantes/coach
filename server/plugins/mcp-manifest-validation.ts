import { findManifestDrift } from '../utils/mcp/manifest-validation'

export default defineNitroPlugin(() => {
  if (process.env.NUXT_MCP_ENABLED === 'false') {
    return
  }

  try {
    const issues = findManifestDrift()
    for (const issue of issues) {
      const prefix = issue.level === 'error' ? '[mcp-manifest:error]' : '[mcp-manifest:warn]'
      console.warn(`${prefix} ${issue.message}`)
    }
  } catch (error) {
    console.warn('[mcp-manifest] validation skipped:', error)
  }
})
