import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const zipPath = process.env.SUBMISSION_ZIP || path.resolve(process.cwd(), '..', 'Holdfast_Protocol_Submission.zip');
const tempExtractDir = process.env.TEMP_EXTRACT_DIR || path.resolve(process.cwd(), '..', 'zip_verify_test');

if (fs.existsSync(tempExtractDir)) {
  fs.rmSync(tempExtractDir, { recursive: true, force: true });
}
fs.mkdirSync(tempExtractDir, { recursive: true });

console.log('Testing extraction of:', zipPath);
// Use powershell Expand-Archive
execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempExtractDir}' -Force"`, { stdio: 'inherit' });

console.log('Extraction completed successfully!');

// Scan extracted directory
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

const allEntries = scanDir(tempExtractDir);
console.log(`Total extracted items: ${allEntries.length}`);

// Check for secrets
const secretSuspects = allEntries.filter(e => {
  const parts = e.path.split(/[\\/]/);
  return (
    e.path.endsWith('.env') ||
    e.path.endsWith('.env.local') ||
    parts.includes('.git') ||
    parts.includes('node_modules') ||
    e.path.endsWith('.log')
  );
});

console.log('Secret/Sensitive file check:', secretSuspects.length === 0 ? '✅ PASSED (Zero sensitive files)' : '❌ FAILED');
if (secretSuspects.length > 0) {
  console.log('Found suspects:', secretSuspects);
}

// Check key required deliverables
const requiredDeliverables = [
  'package.json',
  'README.md',
  path.join('docs', 'SUBMISSION_DESCRIPTION.md'),
  path.join('docs', 'SUBMISSION_CHECKLIST.md'),
  path.join('docs', 'SECURITY_REVIEW.md'),
  path.join('docs', 'TEST_REPORT.md'),
  path.join('docs', 'DEMO_SCRIPT.md'),
  path.join('docs', 'VIDEO_RECORDING_GUIDE.md'),
  path.join('apps', 'server', 'src', 'index.ts'),
  path.join('apps', 'web', 'src', 'App.tsx'),
  path.join('tests', 'proof-suite.test.ts'),
  path.join('tests', 'money-invariants.test.ts'),
];

console.log('\nDeliverable Verification:');
let missing = 0;
for (const req of requiredDeliverables) {
  const found = allEntries.find(e => e.path === req || e.path.replace(/\\/g, '/') === req.replace(/\\/g, '/'));
  if (found) {
    console.log(`  ✓ Found: ${req} (${found.size ? found.size + ' bytes' : 'directory'})`);
  } else {
    console.log(`  ✗ MISSING: ${req}`);
    missing++;
  }
}

if (missing === 0) {
  console.log('\n🎉 ALL REQUIRED DELIVERABLES PRESENT AND VERIFIED!');
} else {
  console.log(`\n⚠️ Missing ${missing} deliverables.`);
}

// Cleanup verification test directory
fs.rmSync(tempExtractDir, { recursive: true, force: true });
console.log('Cleaned up verification test directory.');
