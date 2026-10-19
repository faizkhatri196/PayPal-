import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const FFMPEG = 'C:\\Users\\Infinity\\.gemini\\antigravity-ide\\scratch\\ai-candidate-analyzer\\node_modules\\ffmpeg-static\\ffmpeg.exe';
const BRAIN_DIR = 'C:\\Users\\Infinity\\.gemini\\antigravity-ide\\brain\\f023c068-e354-4f6d-a453-93a43cf68c81';

const ROOT_DEMO_DIR = path.resolve('demo');
const ASSETS_DIR = path.join(ROOT_DEMO_DIR, 'assets');
const AUDIO_FILE = path.join(ASSETS_DIR, 'professional_voiceover.wav');
const OUTPUT_MP4 = path.join(ROOT_DEMO_DIR, 'Holdfast-Protocol-Professional-Demo.mp4');

console.log('=== Holdfast Protocol: Professional Demo Video Production ===');
console.log(`Audio Source: ${AUDIO_FILE}`);
console.log(`Output MP4:   ${OUTPUT_MP4}`);

if (!fs.existsSync(AUDIO_FILE)) {
  console.error('Audio file not found:', AUDIO_FILE);
  process.exit(1);
}

// 8 Scenes perfectly matched to Phase 2 (A through H)
const scenes = [
  { file: 'initial_page_1792057189818.png', duration: 15, title: 'A. Opening: Title and Thesis (0:00-0:15)' },
  { file: 'scrolled_down_1792057239310.png', duration: 20, title: 'B. Problem and Product (0:15-0:35)' },
  { file: 'milestones_view_1792057291977.png', duration: 25, title: 'C. Valid Settlement ($15.00) (0:35-1:00)' },
  { file: 'after_submitting_milestone2_1792057841430.png', duration: 25, title: 'D. Financial Policy Violation ($150 on $100 hold) (1:00-1:25)' },
  { file: 'vetoed_alert_1792058027181.png', duration: 25, title: 'E. Prompt-Injection Veto (1:25-1:50)' },
  { file: 'acceptance_receipt_modal_1792221657052.png', duration: 25, title: 'F. AG Grid Community Ledger & Inspector (1:50-2:15)' },
  { file: 'reconciliation_contract_1792058076634.png', duration: 20, title: 'G. PayPal Sandbox OAuth Connection Probe (2:15-2:35)' },
  { file: 'live_telemetry_tab_1792058231882.png', duration: 15, title: 'H. Close with Repository Link (2:35-2:50)' }
];

const concatListFile = path.join(ASSETS_DIR, 'professional_concat_list.txt');
let concatContent = '';

for (const s of scenes) {
  const fullPath = path.join(BRAIN_DIR, s.file);
  if (!fs.existsSync(fullPath)) {
    console.error('Missing scene image:', fullPath);
    process.exit(1);
  }
  console.log(`  ✓ Scene: ${s.title} [${s.duration}s] -> ${s.file}`);
  concatContent += `file '${fullPath.replace(/\\/g, '/')}'\r\nduration ${s.duration}\r\n`;
}
// Concat demuxer requirement: repeat last file once
const lastPath = path.join(BRAIN_DIR, scenes[scenes.length - 1].file);
concatContent += `file '${lastPath.replace(/\\/g, '/')}'\r\n`;

fs.writeFileSync(concatListFile, concatContent, 'utf8');
console.log('Wrote concat list to:', concatListFile);

// Build FFmpeg command:
// 1920x1080 resolution, 30 fps, x264 high profile, AAC audio 192k, synchronized with voiceover
const cmd = `"${FFMPEG}" -y -f concat -safe 0 -i "${concatListFile}" -i "${AUDIO_FILE}" ` +
  `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p" ` +
  `-c:v libx264 -preset fast -crf 18 -r 30 ` +
  `-c:a aac -b:a 192k -shortest ` +
  `"${OUTPUT_MP4}"`;

console.log('Rendering video with FFmpeg...');
try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('✅ Successfully exported professional demo video to:', OUTPUT_MP4);

  // Also ensure Holdfast-Protocol-Demo.mp4 exists in demo/
  const standardDemo = path.join(ROOT_DEMO_DIR, 'Holdfast-Protocol-Demo.mp4');
  if (!fs.existsSync(standardDemo)) {
    fs.copyFileSync(OUTPUT_MP4, standardDemo);
    console.log('Copied to standard demo path:', standardDemo);
  }

  const stats = fs.statSync(OUTPUT_MP4);
  console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);
} catch (err) {
  console.error('FFmpeg execution failed:', err);
  process.exit(1);
}
