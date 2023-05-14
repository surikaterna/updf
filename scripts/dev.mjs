import * as esbuild from 'esbuild';
import { options } from './esbuild-options.mjs';

try {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} catch (e) {
  console.log('---- Build failed ----');
  console.log(e.message);
}
