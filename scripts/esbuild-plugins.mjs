import { humanFileSize } from './esbuild-util.mjs';

export const loggerPlugin = {
  name: 'env',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.log('---- Build Failed ----');
        result.errors.forEach((err) => {
          console.log('err: ', err);
        });
      } else {
        console.log('---- Build complete ----');
        Object.keys(result.metafile.outputs).forEach((path) => {
          console.log(`${path}: ${humanFileSize(result.metafile.outputs[path].bytes)}`);
        });
      }
    });
  }
};
