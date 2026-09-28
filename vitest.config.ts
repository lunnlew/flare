import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'src/desktop'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/cli/**/*.ts', 'src/storage/**/*.ts', 'src/parsers/**/*.ts', 'src/utils/**/*.ts'],
      exclude: [
        'src/cli/commands/__tests__/**',
        'src/storage/__tests__/**',
        '**/*.d.ts',
        '**/*.test.ts',
      ],
    },
    mockReset: true,
  },
});