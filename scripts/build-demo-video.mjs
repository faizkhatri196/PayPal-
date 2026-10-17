import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.resolve(process.cwd(), 'artifacts');
const SUBMISSION_DIR = process.env.SUBMISSION_DIR 
  ? path.resolve(process.env.SUBMISSION_DIR, 'final_video')
  : path.resolve(process.cwd(), '..', 'Holdfast-Protocol-Submission', 'final_video');
const AUDIO_FILE = path.join(SUBMISSION_DIR, 'voiceover.wav');
const SRT_FILE = path.join(SUBMISSION_DIR, 'Holdfast_Protocol_Demo.srt');
const OUTPUT_MP4 = path.join(SUBMISSION_DIR, 'Holdfast_Protocol_Demo.mp4');

// Verify files
if (!fs.existsSync(AUDIO_FILE)) {
  console.error('Audio file not found:', AUDIO_FILE);
  process.exit(1);
}

// Find screenshot files
const findLatest = (prefix) => {
  const files = fs.readdirSync(ARTIFACT_DIR).filter(f => f.startsWith(prefix) && f.endsWith('.png'));
  if (files.length === 0) return null;
  files.sort((a, b) => fs.statSync(path.join(ARTIFACT_DIR, b)).mtimeMs - fs.statSync(path.join(ARTIFACT_DIR, a)).mtimeMs);
  return path.join(ARTIFACT_DIR, files[0]);
};

const scenes = [
  { img: findLatest('initial_page'), duration: 22, label: 'HOLDFAST PROTOCOL — SAFEGUARD LAYER FOR AGENTIC COMMERCE' },
  { img: findLatest('scrolled_down'), duration: 24, label: 'ESCROW CAPITAL LEDGER — NON-CUSTODIAL PRE-AUTH VS SETTLED FUNDS' },
  { img: findLatest('milestones_view'), duration: 26, label: 'GATE 1: DETERMINISTIC ASSERTIONS — ONLY CODE CAN RELEASE FUNDS' },
  { img: findLatest('receipt_modal'), duration: 34, label: 'CRYPTOGRAPHIC ACCEPTANCE RECEIPT — HMAC-SHA256 DIGITAL SIGNATURE' },
  { img: findLatest('after_submitting_milestone2'), duration: 20, label: 'PAYPAL PAYMENTS V2 — AUTOMATED TRANCHE CAPTURE WITH IDEMPOTENCY' },
  { img: findLatest('vetoed_alert'), duration: 30, label: 'GATE 2: ADVERSARIAL AUDITOR — PROMPT-INJECTION ATTEMPT VETOED' },
  { img: findLatest('reconciliation_contract'), duration: 24, label: 'NETWORK DROP FAULT RECOVERY — ZERO DUPLICATE CAPTURES' },
  { img: findLatest('judge_scenarios_tab'), duration: 18, label: 'INTERACTIVE JUDGE SCENARIO SUITE' },
  { img: findLatest('live_telemetry_tab'), duration: 11, label: 'LIVE AUDIT TELEMETRY STREAM & PAYPAL RESOLUTION PACKET' },
];

console.log('Scenes configured:');
scenes.forEach((s, i) => console.log(`  Scene ${i+1}: ${s.label} (${s.duration}s) -> ${path.basename(s.img)}`));

// Create temporary concat demuxer file
const concatListFile = path.join(ARTIFACT_DIR, 'concat_list.txt');
let concatContent = '';

for (const s of scenes) {
  if (!s.img || !fs.existsSync(s.img)) {
    console.error('Missing image for scene:', s);
    process.exit(1);
  }
  // Format for concat demuxer (escaped path)
  concatContent += `file '${s.img.replace(/\\/g, '/')}'\r\nduration ${s.duration}\r\n`;
}
// Concat demuxer requires last file repeated once without duration
concatContent += `file '${scenes[scenes.length - 1].img.replace(/\\/g, '/')}'\r\n`;

fs.writeFileSync(concatListFile, concatContent, 'utf8');
console.log('Wrote concat list to:', concatListFile);

// Build FFmpeg command
// 1920x1080 resolution, 30 fps, x264 high profile, AAC audio 192k, synchronized with voiceover
const cmd = `"${FFMPEG}" -y -f concat -safe 0 -i "${concatListFile}" -i "${AUDIO_FILE}" ` +
  `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p" ` +
  `-c:v libx264 -preset fast -crf 18 -r 30 ` +
  `-c:a aac -b:a 192k -shortest ` +
  `"${OUTPUT_MP4}"`;

console.log('Executing FFmpeg export command...');
try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('✅ Successfully exported demo video to:', OUTPUT_MP4);
} catch (err) {
  console.error('FFmpeg execution failed:', err);
  process.exit(1);
}
