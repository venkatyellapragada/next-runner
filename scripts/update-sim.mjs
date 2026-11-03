// Rebuilds the Campx AI-University simulation as a static export under /sim and copies it into
// public/sim, so the runner serves it from its own site (and offline in LAN mode).
//
//   node scripts/update-sim.mjs [path-to-campx-ai-university]   (default: ../campx-ai-university)
//
// Then commit public/sim and push.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.resolve(here, '..');
const sim = path.resolve(process.argv[2] || path.join(runner, '../campx-ai-university'));
if (!existsSync(path.join(sim, 'package.json'))) throw new Error(`No simulation checkout at ${sim}`);

const run = (cmd) => execSync(cmd, { cwd: sim, stdio: 'inherit', env: { ...process.env, DIORAMA_BASE_PATH: '/sim' } });
if (!existsSync(path.join(sim, 'node_modules'))) run('npm ci --no-audit --no-fund');
run('npm run build');

const out = path.join(runner, 'public/sim');
rmSync(out, { recursive: true, force: true });
cpSync(path.join(sim, 'out'), out, { recursive: true });
console.log(`Copied ${path.join(sim, 'out')} to public/sim. Commit it and push.`);
