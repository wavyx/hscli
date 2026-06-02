import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
    coverage: {
      include: ['src/**/*.js'],
      exclude: ['src/hooks/**'],
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
})
