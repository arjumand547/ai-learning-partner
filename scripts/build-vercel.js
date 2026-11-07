'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of ['index.html', 'manifest.json', 'service-worker.js']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
for (const folder of ['css', 'js', 'icons']) {
  fs.cpSync(path.join(root, folder), path.join(output, folder), { recursive: true });
}
