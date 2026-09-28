import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const outdir = 'dist/extension';

// Ensure output directory exists
fs.mkdirSync(outdir, { recursive: true });

// Bundle background script (service worker)
await esbuild.build({
  entryPoints: ['src/extension/background.ts'],
  bundle: true,
  outfile: path.join(outdir, 'background.js'),
  platform: 'browser',
  target: 'chrome120',
  format: 'iife',
  minify: false,
  sourcemap: true,
  logLevel: 'info',
});

// Bundle content script
await esbuild.build({
  entryPoints: ['src/extension/content.ts'],
  bundle: true,
  outfile: path.join(outdir, 'content.js'),
  platform: 'browser',
  target: 'chrome120',
  format: 'iife',
  minify: false,
  sourcemap: true,
  logLevel: 'info',
});

// Copy manifest
fs.copyFileSync('src/extension/manifest.json', path.join(outdir, 'manifest.json'));

console.log('Extension built successfully!');