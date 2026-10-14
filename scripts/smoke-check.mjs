import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const index = path.join(root, 'index.html');
if (!fs.existsSync(index)) {
  console.error('SMOKE TEST FAILED: dist/index.html is missing. Run npm run build first.');
  process.exit(1);
}
const html = fs.readFileSync(index, 'utf8');
if (!html.includes('SHADOW SYSTEM: DEV')) {
  console.error('SMOKE TEST FAILED: expected application title is missing.');
  process.exit(1);
}
const assets = fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(root, entry.name);
  return entry.isDirectory() ? fs.readdirSync(full).map(name => path.join(full, name)) : [full];
});
if (!assets.some(file => file.endsWith('.js')) || !assets.some(file => file.endsWith('.css'))) {
  console.error('SMOKE TEST FAILED: built JavaScript or CSS assets are missing.');
  process.exit(1);
}
console.log('SMOKE TEST PASSED: app title, JavaScript bundle, and stylesheet are present.');
