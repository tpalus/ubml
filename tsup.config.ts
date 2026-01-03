import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'node/index': 'src/node/index.ts',
    'eslint/index': 'src/eslint/index.ts',
    'cli': 'bin/ubml.ts',
  },
  format: ['esm'],
  dts: true,
  splitting: false,
  clean: true,
  shims: true,
});
