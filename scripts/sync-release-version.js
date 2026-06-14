// Sync the release version into package.json and CITATION.cff.
// Invoked by @semantic-release/exec during the `prepare` step:
//   node scripts/sync-release-version.js ${nextRelease.version}
// CommonJS (package.json has no "type": "module") so Jest can require it directly.
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Update package.json `version` and CITATION.cff `version`/`date-released`.
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
}

module.exports = { syncReleaseVersion };

if (require.main === module) {
  syncReleaseVersion(process.argv[2], { date: process.argv[3] });
}
