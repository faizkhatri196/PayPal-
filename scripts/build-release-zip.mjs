import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = path.resolve(process.cwd());
const RELEASE_DIR = path.resolve(ROOT_DIR, 'Holdfast-Protocol-Release');
const ZIP_PATH = path.resolve(ROOT_DIR, 'Holdfast-Protocol-Release.zip');
const TEMP_EXTRACT_DIR = path.resolve(ROOT_DIR, 'temp_zip_check');

console.log('=== Holdfast Protocol: Release Packaging & Verification ===');
console.log(`Source:      ${ROOT_DIR}`);
console.log(`Release Dir: ${RELEASE_DIR}`);
console.log(`Zip Path:    ${ZIP_PATH}`);

// Exclusions
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.system_generated',
  '.tempmediaStorage',
  'Holdfast-Protocol-Release',
  'Holdfast-Protocol-Submission',
  'temp_zip_check',
  'coverage',
  '.vscode',
  '.idea',
  'data',
]);

const EXCLUDE_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.DS_Store',
  'Thumbs.db',
  'Holdfast-Protocol-Release.zip',
  'Holdfast_Protocol_Submission.zip',
]);

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) {
        continue;
      }
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      if (EXCLUDE_FILES.has(entry.name)) {
        continue;
      }
      if (entry.name.endsWith('.log') || entry.name.endsWith('.tsbuildinfo')) {
        continue;
      }
      if (entry.name.startsWith('.env') && entry.name !== '.env.example') {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Clean previous release folder and zip
if (fs.existsSync(RELEASE_DIR)) {
  console.log('Removing old release directory...');
  fs.rmSync(RELEASE_DIR, { recursive: true, force: true });
}
if (fs.existsSync(ZIP_PATH)) {
  console.log('Removing old zip archive...');
  fs.rmSync(ZIP_PATH, { force: true });
}

// 2. Copy clean release tree
console.log('Copying clean project tree to Holdfast-Protocol-Release/ ...');
copyDirRecursive(ROOT_DIR, RELEASE_DIR);
console.log('Clean directory created.');

// 3. Compress to ZIP using PowerShell Compress-Archive
console.log(`Compressing ${RELEASE_DIR} into ${ZIP_PATH} ...`);
execSync(`powershell -Command "Compress-Archive -Path '${RELEASE_DIR}\\*' -DestinationPath '${ZIP_PATH}' -Force"`, {
  stdio: 'inherit',
});

if (!fs.existsSync(ZIP_PATH)) {
  console.error('❌ Failed: ZIP archive was not created.');
  process.exit(1);
}

const stats = fs.statSync(ZIP_PATH);
console.log(`✅ ZIP Archive created successfully! Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);

// 4. Test extraction and verify integrity
console.log('\nTesting extraction of archive to verify integrity...');
if (fs.existsSync(TEMP_EXTRACT_DIR)) {
  fs.rmSync(TEMP_EXTRACT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEMP_EXTRACT_DIR, { recursive: true });

execSync(`powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${TEMP_EXTRACT_DIR}' -Force"`, {
  stdio: 'inherit',
});

// Scan extracted entries
function scanDir(dir, base = '') {
  let entries = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const rel = path.join(base, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      entries.push({ path: rel, type: 'dir' });
      entries = entries.concat(scanDir(full, rel));
    } else {
      entries.push({ path: rel, type: 'file', size: stat.size });
    }
  }
  return entries;
}

const extracted = scanDir(TEMP_EXTRACT_DIR);
console.log(`Total items extracted: ${extracted.length}`);

// Secret & node_modules check
const sensitiveHits = extracted.filter(e => {
  const norm = e.path.replace(/\\/g, '/');
  return (
    (norm.endsWith('.env') && !norm.endsWith('.env.example')) ||
    norm.includes('.env.local') ||
    norm.includes('node_modules') ||
    norm.includes('.git/') ||
    norm.includes('.git\\') ||
    norm.endsWith('.log')
  );
});

if (sensitiveHits.length === 0) {
  console.log('✅ PASS: Zero sensitive files, credentials, logs, or node_modules found in ZIP.');
} else {
  console.error('❌ FAIL: Found sensitive/excluded items in ZIP:', sensitiveHits);
  process.exit(1);
}

// Key required files check
const requiredFiles = [
  'package.json',
  'package-lock.json',
  'README.md',
  'LICENSE',
  '.env.example',
  '.gitignore',
  path.join('apps', 'server', 'src', 'index.ts'),
  path.join('apps', 'server', 'src', 'api', 'routes.ts'),
  path.join('apps', 'web', 'src', 'App.tsx'),
  path.join('apps', 'web', 'src', 'components', 'TransactionExplorer.tsx'),
  path.join('tests', 'money-invariants.test.ts'),
  path.join('tests', 'proof-suite.test.ts'),
  path.join('docs', 'DEMO_SCRIPT.md'),
  path.join('demo', 'Holdfast-Protocol-Demo.mp4'),
];

console.log('\nChecking critical files in extracted archive:');
let missingCount = 0;
for (const req of requiredFiles) {
  const normReq = req.replace(/\\/g, '/');
  const found = extracted.find(e => e.path.replace(/\\/g, '/') === normReq);
  if (found) {
    console.log(`  ✓ Found: ${req} (${found.size} bytes)`);
  } else {
    console.error(`  ✗ MISSING: ${req}`);
    missingCount++;
  }
}

// Clean temp directory
fs.rmSync(TEMP_EXTRACT_DIR, { recursive: true, force: true });
console.log('\nCleaned up verification test directory.');

if (missingCount === 0) {
  console.log('\n🎉 ALL CHECKS PASSED: Holdfast-Protocol-Release.zip is verified and release-ready!');
} else {
  console.error(`\n❌ Verification failed: ${missingCount} required files missing.`);
  process.exit(1);
}
