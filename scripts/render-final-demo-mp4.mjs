import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const FFMPEG = 'C:\\Users\\Infinity\\.gemini\\antigravity-ide\\scratch\\ai-candidate-analyzer\\node_modules\\ffmpeg-static\\ffmpeg.exe';
const BRAIN_DIR = 'C:\\Users\\Infinity\\.gemini\\antigravity-ide\\brain\\f023c068-e354-4f6d-a453-93a43cf68c81';

const ROOT_DEMO_DIR = path.resolve('demo');
const ROOT_ASSETS_DIR = path.join(ROOT_DEMO_DIR, 'assets');
const SUBMISSION_DEMO_DIR = path.resolve('..', 'Holdfast-Protocol-Submission', 'demo');
const SUBMISSION_ASSETS_DIR = path.join(SUBMISSION_DEMO_DIR, 'assets');
const LOCAL_SUB_DEMO_DIR = path.resolve('Holdfast-Protocol-Submission', 'demo');
const LOCAL_SUB_ASSETS_DIR = path.join(LOCAL_SUB_DEMO_DIR, 'assets');

[ROOT_DEMO_DIR, ROOT_ASSETS_DIR, SUBMISSION_DEMO_DIR, SUBMISSION_ASSETS_DIR, LOCAL_SUB_DEMO_DIR, LOCAL_SUB_ASSETS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const AUDIO_SRC = path.join(ROOT_ASSETS_DIR, 'voiceover_timed.wav');
const OUTPUT_MP4 = path.join(ROOT_DEMO_DIR, 'Holdfast-Protocol-Demo.mp4');

// If audio not yet in root assets, copy from where it was created
const backupAudio = path.join(LOCAL_SUB_ASSETS_DIR, 'voiceover_timed.wav');
if (!fs.existsSync(AUDIO_SRC) && fs.existsSync(backupAudio)) {
  fs.copyFileSync(backupAudio, AUDIO_SRC);
}

// Exact screenshots from live UI
const sceneImages = [
  { file: 'initial_page_1792057189818.png', duration: 20, title: 'HOLDFAST PROTOCOL - SAFEGUARD LAYER FOR AGENT COMMERCE' },
  { file: 'scrolled_down_1792057239310.png', duration: 22, title: 'ESCROW CAPITAL LEDGER - NON-CUSTODIAL PRE-AUTH VS SETTLED FUNDS' },
  { file: 'milestones_view_1792057291977.png', duration: 24, title: 'GATE 1: DETERMINISTIC ASSERTIONS - ONLY CODE CAN RELEASE FUNDS' },
  { file: 'vetoed_alert_1792058027181.png', duration: 24, title: 'GATE 2: ADVERSARIAL AUDITOR - PROMPT INJECTION VETOED' },
  { file: 'acceptance_receipt_modal_1792221657052.png', duration: 28, title: 'CRYPTOGRAPHIC ACCEPTANCE RECEIPT - HMAC-SHA256 SIGNATURE' },
  { file: 'after_submitting_milestone2_1792057841430.png', duration: 20, title: 'PAYPAL PAYMENTS V2 - AUTOMATED TRANCHE CAPTURE WITH IDEMPOTENCY' },
  { file: 'reconciliation_contract_1792058076634.png', duration: 18, title: 'NETWORK DROP FAULT RECOVERY - ZERO DUPLICATE CAPTURES' },
  { file: 'live_telemetry_tab_1792058231882.png', duration: 12, title: 'MODEL CONTEXT PROTOCOL (MCP) & AUTOMATED PROOF SUITES' }
];

console.log('Verifying scene screenshots...');
const concatListFile = path.join(ROOT_ASSETS_DIR, 'concat_list.txt');
let concatContent = '';

for (const s of sceneImages) {
  const fullPath = path.join(BRAIN_DIR, s.file);
  if (!fs.existsSync(fullPath)) {
    console.error('Missing screenshot:', fullPath);
    process.exit(1);
  }
  console.log(`  ✓ Scene: ${s.title} (${s.duration}s)`);
  concatContent += `file '${fullPath.replace(/\\/g, '/')}'\r\nduration ${s.duration}\r\n`;
}
// Concat demuxer requirement: repeat last file once
const lastPath = path.join(BRAIN_DIR, sceneImages[sceneImages.length - 1].file);
concatContent += `file '${lastPath.replace(/\\/g, '/')}'\r\n`;

fs.writeFileSync(concatListFile, concatContent, 'utf8');
console.log('Wrote concat list to:', concatListFile);

// Build FFmpeg command:
// 1920x1080 resolution, 30 fps, x264 high profile, AAC audio 192k, synchronized with voiceover
const cmd = `"${FFMPEG}" -y -f concat -safe 0 -i "${concatListFile}" -i "${AUDIO_SRC}" ` +
  `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p" ` +
  `-c:v libx264 -preset fast -crf 18 -r 30 ` +
  `-c:a aac -b:a 192k -shortest ` +
  `"${OUTPUT_MP4}"`;

console.log('Executing FFmpeg export command...');
try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('✅ Successfully exported demo video to:', OUTPUT_MP4);
  
  // Mirror to submission directories
  fs.copyFileSync(OUTPUT_MP4, path.join(SUBMISSION_DEMO_DIR, 'Holdfast-Protocol-Demo.mp4'));
  fs.copyFileSync(OUTPUT_MP4, path.join(LOCAL_SUB_DEMO_DIR, 'Holdfast-Protocol-Demo.mp4'));
  console.log('✅ Successfully mirrored to submission folders.');
} catch (err) {
  console.error('FFmpeg execution failed:', err);
  process.exit(1);
}
