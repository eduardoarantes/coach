import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/server/utils/mcp/**/*.test.ts',
      'tests/unit/server/utils/oauth/**/*.test.ts',
      'tests/unit/server/api/oauth/**/*.test.ts'
    ]
  },
  resolve: {
    alias: {
      '#auth': path.resolve(rootDir, './tests/unit/mocks/auth.ts')
    }
  }
})
