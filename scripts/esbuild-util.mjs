import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';


export function humanFileSize(size) {
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(2) * 1} ${['B', 'kB', 'MB', 'GB', 'TB'][i]}`;
}

const testRegex = '(\\.|/)(test|spec)\\.[jt]s$';
const filter = new RegExp(testRegex);

export function getEntryPoints() {
  let files = [];
  function buildFileListForDir(directory) {
    readdirSync(directory).forEach((file) => {
      const absPath = join(directory, file);
      if (statSync(absPath).isDirectory()) {
        return buildFileListForDir(absPath);
      } else {
        // skip test files
        if (!filter.test(absPath)) {
          return files.push(absPath);
        }
      }
    });
  }

  buildFileListForDir('./src/');
  return files;
}
