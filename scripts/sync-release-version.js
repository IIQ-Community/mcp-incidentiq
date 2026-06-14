// Sync the release version into package.json, CITATION.cff, and the src/index.ts Server literal.
// Invoked by @semantic-release/exec during the `prepare` step:
//   node scripts/sync-release-version.js ${nextRelease.version}
// CommonJS (package.json has no "type": "module") so the test runner can require it directly.
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Update package.json `version`, CITATION.cff `version`/`date-released`, and the hardcoded
 * Server `version` literal in src/index.ts.
 * @param {string} version - the new semver version (e.g. "0.2.0")
 * @param {{ date?: string, cwd?: string }} [opts] - date defaults to today (YYYY-MM-DD); cwd defaults to process.cwd()
 */
function syncReleaseVersion(version, opts = {}) {
  if (!version) {
    throw new Error('syncReleaseVersion: a version argument is required');
  }
  const cwd = opts.cwd || process.cwd();
  const date = opts.date || new Date().toISOString().slice(0, 10);

  // package.json - parse/stringify to preserve structure; 2-space indent + trailing newline.
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // CITATION.cff - line-anchored text edits (no YAML dependency). `^version:` does not
  // match `cff-version:`, so cff-version is left intact.
  const cffPath = path.join(cwd, 'CITATION.cff');
  let cff = fs.readFileSync(cffPath, 'utf8');
  cff = cff.replace(/^version: .*$/m, `version: ${version}`);
  cff = cff.replace(/^date-released: .*$/m, `date-released: "${date}"`);
  fs.writeFileSync(cffPath, cff);

  // src/index.ts - update the hardcoded Server version literal. The non-global, multiline
  // regex matches the FIRST `version: '...'` line (the `new Server({ name, version })` field),
  // leaving everything else intact. Skipped if the file is absent so the script stays safe.
  const indexPath = path.join(cwd, 'src', 'index.ts');
  if (fs.existsSync(indexPath)) {
    let index = fs.readFileSync(indexPath, 'utf8');
    index = index.replace(/^(\s*version:\s*)'[^']*'/m, `$1'${version}'`);
    fs.writeFileSync(indexPath, index);
  }
}

module.exports = { syncReleaseVersion };

if (require.main === module) {
  syncReleaseVersion(process.argv[2], { date: process.argv[3] });
}
