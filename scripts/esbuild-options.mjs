import { loggerPlugin } from './esbuild-plugins.mjs';
import { getEntryPoints } from './esbuild-util.mjs';

export const options = {
  entryPoints: getEntryPoints(),
  sourcemap: 'linked',
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  metafile: true,
  plugins: [loggerPlugin],
  outdir: './lib'
};
