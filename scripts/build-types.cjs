const fs = require('node:fs');
const path = require('node:path');

// NodeNext needs an ESM declaration entrypoint, not a CommonJS default namespace.
fs.writeFileSync(path.join(__dirname, '../dist/types/index.d.mts'),
  "export * from './index.js';\nexport { Graph as default } from './index.js';\n");
