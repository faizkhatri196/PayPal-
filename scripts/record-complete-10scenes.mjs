import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const FFMPEG_PATH = 'C:\\Users\\Infinity\\.gemini\\antigravity-ide\\scratch\\ai-candidate-analyzer\\node_modules\\ffmpeg-static\\ffmpeg.exe';
const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const ROOT_DIR = path.resolve(process.cwd());
const DEMO_DIR = path.join(ROOT_DIR, 'demo');
const ASSETS_DIR = path.join(DEMO_DIR, 'assets');
const SCENES_DIR = path.join(DEMO_DIR, 'scenes');

const AUDIO_PATH = path.join(ASSETS_DIR, 'professional_voiceover.wav');
const OUTPUT_MP4 = path.join(DEMO_DIR, 'Holdfast-Protocol-Professional-Demo.mp4');
const MIRROR_MP4 = path.join(DEMO_DIR, 'Holdfast-Protocol-Demo.mp4');

console.log('=== Holdfast Protocol: 10-Scene Real Video Production ===');
console.log(`Chrome:     ${CHROME_PATH}`);
console.log(`FFmpeg:     ${FFMPEG_PATH}`);
console.log(`Audio:      ${AUDIO_PATH}`);
console.log(`Target MP4: ${OUTPUT_MP4}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('\n[1/6] Launching Chrome at 1920x1080...');
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

  console.log('[2/6] Starting FFmpeg process for 1920x1080 30 FPS recording...');
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
    '-ar', '48000',
    '-t', '00:02:50.00',
    OUTPUT_MP4,
  ]);

  ffmpeg.stdin.on('error', () => {});
  ffmpeg.stderr.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('Error') || msg.includes('fatal')) {
      console.error('[FFmpeg error]', msg.trim());
    }
  });

  let totalFramesPushed = 0;

  async function emitFrames(frameCount) {
    for (let i = 0; i < frameCount; i++) {
      if (latestFrame && ffmpeg.stdin && ffmpeg.stdin.writable) {
        try {
          ffmpeg.stdin.write(latestFrame);
          totalFramesPushed++;
        } catch (_) {}
      }
      await sleep(18);
    }
  }

  // --- SCENE 1: Introduction (0:00 - 0:14.5) -> 436 frames ---
  console.log('\n[3/6] Recording Scene 1: Introduction (436 frames)...');
  const scene1Path = 'file:///' + path.join(SCENES_DIR, 'scene_01_intro.html').replace(/\\/g, '/');
  await page.goto(scene1Path, { waitUntil: 'load' });
  await sleep(400);
  await emitFrames(436);

  // --- SCENE 2: Product Architecture (0:14.5 - 0:34) -> 588 frames ---
  console.log('Recording Scene 2: Product Architecture (588 frames)...');
  const scene2Path = 'file:///' + path.join(SCENES_DIR, 'scene_02_architecture.html').replace(/\\/g, '/');
  await page.goto(scene2Path, { waitUntil: 'load' });
  await sleep(400);
  await emitFrames(588);

  // --- SCENE 3: Application Overview (0:34 - 0:50) -> 468 frames ---
  console.log('Recording Scene 3: Application Overview (468 frames)...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await emitFrames(200);
  await page.evaluate(() => {
    const el = document.querySelector('.top-metrics-strip');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await emitFrames(268);

  // --- SCENE 4: Successful Simulated Payment ($15.00) (0:50 - 1:11) -> 623 frames ---
  console.log('Recording Scene 4: Successful Simulated Payment ($15.00) (623 frames)...');
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
  await emitFrames(623);

  // --- SCENE 5: Financial Policy Enforcement ($150 Ceiling Breach) (1:11 - 1:29) -> 555 frames ---
  console.log('Recording Scene 5: Financial Policy Enforcement (555 frames)...');
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
  await emitFrames(555);

  // --- SCENE 6: Prompt-Injection Defence Veto (1:29 - 1:48) -> 559 frames ---
  console.log('Recording Scene 6: Prompt-Injection Defence (559 frames)...');
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
  await emitFrames(559);

  // --- SCENE 7: Ledger and Receipts (1:48 - 2:06) -> 546 frames ---
  console.log('Recording Scene 7: Ledger and Receipts (546 frames)...');
  await page.evaluate(() => {
    const grid = document.querySelector('.ag-theme-quartz');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await emitFrames(60);

  // Search "pricing"
  const searchInput = await page.$('input[placeholder*="Search"]');
  if (searchInput) {
    await searchInput.click();
    await page.keyboard.type('pricing', { delay: 40 });
    await emitFrames(90);
    // Clear search using backspaces
    await searchInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await emitFrames(50);
  }

  // Sort Amount column
  await page.evaluate(() => {
    const header = Array.from(document.querySelectorAll('.ag-header-cell-text'))
      .find((el) => el.textContent && el.textContent.includes('Amount'));
    if (header) header.click();
  });
  await emitFrames(70);

  // Open inspector drawer via the top "Inspect TXN-..." button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const inspectBtn = btns.find((b) => b.textContent && b.textContent.includes('Inspect TXN-'));
    if (inspectBtn) inspectBtn.click();
  });
  await emitFrames(220);

  // Close inspector drawer
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[title="Close Inspector"]');
    if (closeBtn) closeBtn.click();
  });
  await emitFrames(56);

  // --- SCENE 8: PayPal Sandbox Integration (2:06 - 2:24) -> 528 frames ---
  console.log('Recording Scene 8: PayPal Sandbox Integration (528 frames)...');
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  await sleep(300);

  // Click PayPal Sandbox badge in header to open Modal 5
  await page.evaluate(() => {
    const badge = Array.from(document.querySelectorAll('.fintech-header *'))
      .find((el) => el.textContent && el.textContent.includes('PayPal Sandbox: Connected'));
    if (badge) badge.click();
  });
  await sleep(400);
  await emitFrames(264);

  // Close modal and navigate to Reconciliation tab
  await page.keyboard.press('Escape');
  await sleep(300);

  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('nav button'));
    const reconTab = tabs.find((b) => b.textContent && b.textContent.includes('Reconciliation'));
    if (reconTab) reconTab.click();
  });
  await sleep(400);
  await emitFrames(264);

  // --- SCENE 9: Architecture and Open Source (2:24 - 2:39) -> 468 frames ---
  console.log('Recording Scene 9: Architecture and Open Source (468 frames)...');
  const scene9Path = 'file:///' + path.join(SCENES_DIR, 'scene_09_techstack.html').replace(/\\/g, '/');
  await page.goto(scene9Path, { waitUntil: 'load' });
  await sleep(400);
  await emitFrames(468);

  // --- SCENE 10: Conclusion (2:39 - 2:50) -> 332 frames ---
  console.log('Recording Scene 10: Conclusion (332 frames)...');
  const scene10Path = 'file:///' + path.join(SCENES_DIR, 'scene_10_conclusion.html').replace(/\\/g, '/');
  await page.goto(scene10Path, { waitUntil: 'load' });
  await sleep(400);
  await emitFrames(332);

  console.log(`\n[4/6] Pushed ${totalFramesPushed} frames. Closing browser screencast...`);
  await client.send('Page.stopScreencast');
  await browser.close();

  // Close FFmpeg stdin
  ffmpeg.stdin.end();

  console.log('[5/6] Waiting for FFmpeg to finish muxing...');
  await new Promise((resolve) => ffmpeg.on('close', resolve));

  console.log('✅ Video encoded successfully:', OUTPUT_MP4);

  // Copy to mirror path
  fs.copyFileSync(OUTPUT_MP4, MIRROR_MP4);
  console.log('Copied to mirror:', MIRROR_MP4);

  const stats = fs.statSync(OUTPUT_MP4);
  console.log(`Final file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);
}

run().catch((err) => {
  console.error('Recording failed:', err);
  process.exit(1);
});
