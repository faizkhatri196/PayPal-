import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const FFMPEG_PATH = 'C:\\Users\\Infinity\\.gemini\\antigravity-ide\\scratch\\ai-candidate-analyzer\\node_modules\\ffmpeg-static\\ffmpeg.exe';
const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const ROOT_DIR = path.resolve(process.cwd());
const DEMO_DIR = path.join(ROOT_DIR, 'demo');
const ASSETS_DIR = path.join(DEMO_DIR, 'assets');
const AUDIO_PATH = path.join(ASSETS_DIR, 'professional_voiceover.wav');
const OUTPUT_MP4 = path.join(DEMO_DIR, 'Holdfast-Protocol-Professional-Demo.mp4');
const MIRROR_MP4 = path.join(DEMO_DIR, 'Holdfast-Protocol-Demo.mp4');

console.log('=== Holdfast Protocol: Frame-Accurate Live UI Demo Recording ===');
console.log(`Chrome:     ${CHROME_PATH}`);
console.log(`FFmpeg:     ${FFMPEG_PATH}`);
console.log(`Audio:      ${AUDIO_PATH}`);
console.log(`Target MP4: ${OUTPUT_MP4}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('\n[1/5] Launching Chrome at 1920x1080...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--force-device-scale-factor=1',
      '--disable-features=TranslateUI',
      '--disable-extensions',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  console.log('[2/5] Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1000);

  console.log('[3/5] Starting CDP screencast and spawning FFmpeg pipeline...');
  const client = await page.target().createCDPSession();

  let latestFrame = null;
  client.on('Page.screencastFrame', async ({ data, sessionId }) => {
    latestFrame = Buffer.from(data, 'base64');
    try {
      await client.send('Page.screencastFrameAck', { sessionId });
    } catch (_) {}
  });

  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 95,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1,
  });

  // Spawn FFmpeg to encode exactly 30 FPS constant video with H.264 High Profile and AAC audio
  const ffmpeg = spawn(FFMPEG_PATH, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', '30',
    '-i', '-',
    '-i', AUDIO_PATH,
    '-vf', 'scale=1920:1080,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', '00:02:46.00',
    OUTPUT_MP4,
  ]);

  ffmpeg.stdin.on('error', () => {
    // Pipe closed by ffmpeg on completion
  });

  ffmpeg.stderr.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('Error') || msg.includes('fatal')) {
      console.error('[FFmpeg stderr]', msg.trim());
    }
  });

  // Wait for first frame
  while (!latestFrame) {
    await sleep(50);
  }

  let totalFramesPushed = 0;

  // Frame pusher helper: writes exactly N frames at constant 30 FPS timing
  async function emitFrames(frameCount) {
    for (let i = 0; i < frameCount; i++) {
      if (latestFrame && ffmpeg.stdin && ffmpeg.stdin.writable) {
        try {
          ffmpeg.stdin.write(latestFrame);
          totalFramesPushed++;
        } catch (_) {}
      }
      // Small pause to allow browser events and paint cycle to process
      await sleep(15);
    }
  }

  console.log('[4/5] Executing 8-Scene Live UI Demonstration Sequence (5,040 frames = 2m 48s @ 30 FPS):');

  // --- SCENE A: 0:00 - 0:15 (15s = 450 frames) ---
  console.log('  -> Scene A (0:00-0:15): Header Wordmark, Tagline & Status (450 frames)');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await emitFrames(450);

  // --- SCENE B: 0:15 - 0:35 (20s = 600 frames) ---
  console.log('  -> Scene B (0:15-0:35): Financial Metrics Strip & Workflow Cards (600 frames)');
  await page.evaluate(() => {
    const el = document.querySelector('.top-metrics-strip');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else window.scrollBy({ top: 280, behavior: 'smooth' });
  });
  await emitFrames(250);
  await page.evaluate(() => {
    const el = document.querySelector('.payment-decision-panel');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else window.scrollBy({ top: 220, behavior: 'smooth' });
  });
  await emitFrames(350);

  // --- SCENE C: 0:35 - 1:00 (25s = 750 frames) ---
  console.log('  -> Scene C (0:35-1:00): Standard Settlement ($15.00) (750 frames)');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent.includes('Standard Settlement ($15.00)'));
    if (btn) btn.click();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const panel = document.querySelector('.payment-decision-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await emitFrames(750);

  // --- SCENE D: 1:00 - 1:25 (25s = 750 frames) ---
  console.log('  -> Scene D (1:00-1:25): Ceiling Breach ($150 on $100 hold) (750 frames)');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent.includes('Ceiling Breach ($150 on $100 hold)'));
    if (btn) btn.click();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const panel = document.querySelector('.payment-decision-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await emitFrames(750);

  // --- SCENE E: 1:25 - 1:50 (25s = 750 frames) ---
  console.log('  -> Scene E (1:25-1:50): Prompt Injection Veto (750 frames)');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent.includes('Prompt Injection Veto'));
    if (btn) btn.click();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const panel = document.querySelector('.payment-decision-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await emitFrames(750);

  // --- SCENE F: 1:50 - 2:15 (25s = 750 frames) ---
  console.log('  -> Scene F (1:50-2:15): AG Grid Community Ledger & Inspector (750 frames)');
  await page.evaluate(() => {
    const grid = document.querySelector('.ag-theme-quartz');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else window.scrollBy({ top: 500, behavior: 'smooth' });
  });
  await emitFrames(100);

  // Type "Ceiling" into search box
  const searchInput = await page.$('input[placeholder*="Search ID"]');
  if (searchInput) {
    await searchInput.type('Ceiling', { delay: 60 });
    await emitFrames(120);
    // Clear search
    await page.evaluate((el) => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }, searchInput);
    await emitFrames(80);
  }

  // Sort Amount column
  await page.evaluate(() => {
    const header = Array.from(document.querySelectorAll('.ag-header-cell-text'))
      .find((el) => el.textContent.includes('Amount'));
    if (header) header.click();
  });
  await emitFrames(100);

  // Open inspector drawer
  await page.evaluate(() => {
    const inspectBtn = document.querySelector('.ag-row button, .ag-row .stage-inspect-btn');
    if (inspectBtn) inspectBtn.click();
  });
  await emitFrames(250);

  // Close inspector drawer
  await page.keyboard.press('Escape');
  await emitFrames(100);

  // --- SCENE G: 2:15 - 2:35 (20s = 600 frames) ---
  console.log('  -> Scene G (2:15-2:35): PayPal Sandbox Connection Probe & Boundary (600 frames)');
  await page.evaluate(() => {
    const badge = document.querySelector('.fintech-header [style*="cursor: pointer"]');
    if (badge) badge.click();
  });
  await emitFrames(300);
  // Close modal
  await page.keyboard.press('Escape');
  await emitFrames(60);
  // Switch to Developer Settings tab
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('nav button'))
      .find((b) => b.textContent.includes('Developer Settings'));
    if (tab) tab.click();
  });
  await emitFrames(240);

  // --- SCENE H: 2:35 - 2:48 (13s = 390 frames) ---
  console.log('  -> Scene H (2:35-2:48): Closing Shot with Repository URL (390 frames)');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await emitFrames(390);

  console.log(`\n[5/5] Finalizing recording... Total frames pushed: ${totalFramesPushed}`);

  await client.send('Page.stopScreencast');
  await browser.close();

  // End FFmpeg stream
  try {
    if (ffmpeg.stdin && ffmpeg.stdin.writable) {
      ffmpeg.stdin.end();
    }
  } catch (_) {}

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Video rendering completed successfully!');
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });

  // Mirror to standard demo path
  fs.copyFileSync(OUTPUT_MP4, MIRROR_MP4);
  console.log('Mirrored to:', MIRROR_MP4);

  const stats = fs.statSync(OUTPUT_MP4);
  console.log(`\nFinal Video File: ${OUTPUT_MP4}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);
}

run().catch((err) => {
  console.error('Fatal error during recording:', err);
  process.exit(1);
});
