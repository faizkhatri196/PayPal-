import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(process.cwd());
const DEST_DIR = path.resolve(process.cwd(), '..', 'Holdfast-Protocol-Submission');

console.log(`Packaging Holdfast Submission...`);
console.log(`Source:      ${SRC_DIR}`);
console.log(`Destination: ${DEST_DIR}`);

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.system_generated',
  '.tempmediaStorage',
  'Holdfast-Protocol-Submission',
  '.vscode',
  '.idea',
]);

const EXCLUDE_FILES = new Set([
  '.env',
  '.env.local',
  '.DS_Store',
  'Thumbs.db',
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

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) {
        continue;
      }
      copyDirRecursive(srcPath, destPath);
    } else if (stat.isFile()) {
      if (EXCLUDE_FILES.has(entry.name)) {
        continue;
      }
      if (entry.name.endsWith('.log') || entry.name.includes('.tmp.')) {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(DEST_DIR)) {
  console.log(`Removing existing submission directory...`);
  fs.rmSync(DEST_DIR, { recursive: true, force: true });
}

copyDirRecursive(SRC_DIR, DEST_DIR);
console.log(`✅ Successfully created clean submission copy at: ${DEST_DIR}`);
