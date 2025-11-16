#!/usr/bin/env node
/**
 * Create a compatibility stub for html-entities@2.x where some tooling
 * (source-map-loader) expects legacy path html-entities/lib/index.js.
 * This writes node_modules/html-entities/lib/index.js if missing.
 */

const fs = require('fs');
const path = require('path');

try {
  const pkgRoot = path.dirname(require.resolve('html-entities/package.json'));
  const legacyDir = path.join(pkgRoot, 'lib');
  const legacyFile = path.join(legacyDir, 'index.js');

  if (!fs.existsSync(legacyFile)) {
    if (!fs.existsSync(legacyDir)) fs.mkdirSync(legacyDir);
    fs.writeFileSync(
      legacyFile,
      "// Auto-generated compatibility shim.\n" +
      "module.exports = require('../dist/commonjs/index.js');\n"
    );
    console.log('[postinstall] Created html-entities legacy shim at lib/index.js');
  } else {
    console.log('[postinstall] Legacy shim already present, skipping.');
  }
} catch (e) {
  console.warn('[postinstall] Failed to create html-entities shim:', e.message);
}
