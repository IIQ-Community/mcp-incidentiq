import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// CommonJS script under test (no "type": "module" in package.json).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { syncReleaseVersion } = require('../../../scripts/sync-release-version.js');

describe('syncReleaseVersion', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-rel-'));
    fs.writeFileSync(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'demo', version: '0.0.0', scripts: { build: 'tsc' } }, null, 2) + '\n'
    );
    fs.writeFileSync(
      path.join(tmp, 'CITATION.cff'),
      'cff-version: 1.2.0\ntitle: "Demo"\nversion: 0.0.0\ndate-released: "2000-01-01"\nlicense: MIT\n'
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('bumps package.json version, preserving 2-space indent and trailing newline', () => {
    syncReleaseVersion('1.2.3', { date: '2030-05-01', cwd: tmp });
    const raw = fs.readFileSync(path.join(tmp, 'package.json'), 'utf8');
    expect(JSON.parse(raw).version).toBe('1.2.3');
    expect(JSON.parse(raw).scripts.build).toBe('tsc'); // other fields untouched
    expect(raw.endsWith('\n')).toBe(true);
    expect(raw).toContain('  "version": "1.2.3"'); // 2-space indent preserved
  });

  it('bumps CITATION.cff version + date-released, leaving other lines intact', () => {
    syncReleaseVersion('1.2.3', { date: '2030-05-01', cwd: tmp });
    const cff = fs.readFileSync(path.join(tmp, 'CITATION.cff'), 'utf8');
    expect(cff).toMatch(/^version: 1\.2\.3$/m);
    expect(cff).toMatch(/^date-released: "2030-05-01"$/m);
    expect(cff).toMatch(/^license: MIT$/m); // unrelated line untouched
    expect(cff).toMatch(/^cff-version: 1\.2\.0$/m); // cff-version NOT touched by the version bump
  });

  it('defaults the date to today (YYYY-MM-DD) when no date is given', () => {
    syncReleaseVersion('2.0.0', { cwd: tmp });
    const cff = fs.readFileSync(path.join(tmp, 'CITATION.cff'), 'utf8');
    expect(cff).toMatch(/^date-released: "\d{4}-\d{2}-\d{2}"$/m);
  });

  it('bumps the hardcoded Server version literal in src/index.ts', () => {
    fs.mkdirSync(path.join(tmp, 'src'));
    fs.writeFileSync(
      path.join(tmp, 'src', 'index.ts'),
      "const server = new Server(\n  {\n    name: 'demo',\n    version: '0.0.0',\n  },\n);\n"
    );
    syncReleaseVersion('1.2.3', { date: '2030-05-01', cwd: tmp });
    const idx = fs.readFileSync(path.join(tmp, 'src', 'index.ts'), 'utf8');
    expect(idx).toMatch(/version: '1\.2\.3'/);
    expect(idx).not.toContain("'0.0.0'");
    expect(idx).toContain("name: 'demo'"); // unrelated line untouched
  });
});
