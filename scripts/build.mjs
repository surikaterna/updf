import * as esbuild from 'esbuild';
import { options } from './esbuild-options.mjs';

try {
  await esbuild.build(options);
} catch (e) {
  console.log('---- Build failed ----');
  console.log(e.message);
}
