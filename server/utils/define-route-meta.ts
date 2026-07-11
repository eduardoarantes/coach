import type { NitroRouteMeta } from 'nitropack/types'

type OpenAPIParameter = {
  name: string
  in: string
  required?: boolean
  description?: string
  schema?: Record<string, unknown>
}

export type AppRouteMetaOpenAPI = NonNullable<NitroRouteMeta['openAPI']> & {
  inputSchema?: OpenAPIParameter[]
}

export type AppRouteMeta = Omit<NitroRouteMeta, 'openAPI'> & {
  openAPI?: AppRouteMetaOpenAPI
}

export function defineRouteMeta(meta: AppRouteMeta): NitroRouteMeta {
  return meta as NitroRouteMeta
}
