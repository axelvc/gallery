import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const smokeScriptPath = path.join(scriptDirectory, 'ig-smoke.ts');

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--experimental-specifier-resolution=node', smokeScriptPath, ...process.argv.slice(2)],
  {
  env: {
    ...process.env,
    NODE_NO_WARNINGS: '1',
  },
  stdio: 'inherit',
  }
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
