import { defineNitroPlugin } from 'nitropack/runtime'
import { getCookie, setCookie } from 'h3'
import { prisma } from '../utils/db'
import { v4 as uuidv4 } from 'uuid'

export default defineNitroPlugin((nitroApp: any) => {
  nitroApp.hooks.hook('request', async (event: any) => {
    if (!process.env.AUTH_BYPASS_USER) return

    const url = event.node.req.url || ''

    if (url.startsWith('/_') || url.match(/\.(js|css|png|jpg|svg|ico|woff|woff2|ttf)/)) {
      return
    }

    const impersonatedUserId = getCookie(event, 'auth.impersonated_user_id')
    if (impersonatedUserId) {
      return
    }

    const sessionToken =
      getCookie(event, 'next-auth.session-token') ||
      getCookie(event, '__Secure-next-auth.session-token')

    if (sessionToken && sessionToken.startsWith('impersonate-')) {
      return
    }

    if (sessionToken) {
      try {
        const session = await prisma.session.findUnique({
          where: { sessionToken },
          include: { user: true }
        })

        if (session && session.expires > new Date()) {
          return
        }

        if (session) {
          await prisma.session.delete({
            where: { sessionToken }
          })
        }
      } catch (error) {
        console.error('[Auth Bypass] Error validating session:', error)
      }
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: process.env.AUTH_BYPASS_USER }
      })

      if (!user) {
        console.warn(`[Auth Bypass] User not found: ${process.env.AUTH_BYPASS_USER}`)
        return
      }

      const bypassName = process.env.AUTH_BYPASS_NAME || user.name
      console.log(`[Auth Bypass] Creating session for ${bypassName} (${user.email})`)

      await prisma.session.deleteMany({
        where: {
          userId: user.id,
          expires: {
            lt: new Date()
          }
        }
      })

      const newToken = uuidv4()
      const expires = new Date()
      expires.setDate(expires.getDate() + 30)

      await prisma.session.create({
        data: {
          sessionToken: newToken,
          userId: user.id,
          expires
        }
      })

      setCookie(event, 'next-auth.session-token', newToken, {
        httpOnly: true,
        secure: false,
        path: '/',
        expires,
        sameSite: 'lax'
      })

      if (event.node.req.headers.cookie) {
        event.node.req.headers.cookie += `; next-auth.session-token=${newToken}`
      } else {
        event.node.req.headers.cookie = `next-auth.session-token=${newToken}`
      }
    } catch (error) {
      console.error('[Auth Bypass] Error creating session:', error)
    }
  })
})
