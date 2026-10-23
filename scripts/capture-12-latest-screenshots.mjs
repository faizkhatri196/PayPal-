import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve('demo', 'assets', 'devpost', 'latest');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('=== Holdfast Protocol: Devpost 12-Screenshot Capture ===');
  console.log(`Target Output Directory: ${OUT_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,960',
      '--force-device-scale-factor=1',
      '--disable-features=TranslateUI',
      '--disable-extensions',
    ],
    defaultViewport: {
      width: 1440,
      height: 960,
      deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });

  // -------------------------------------------------------------
  // 01 — 01-latest-dashboard.png
  // Main Holdfast Protocol dashboard, branding, metrics & ledger
  // -------------------------------------------------------------
  console.log('\n[01/12] Capturing 01-latest-dashboard.png...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);

  // Click standard settlement scenario for a clean, stable initial state
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Standard Settlement ($15.00)'));
    if (btn) btn.click();
  });
  await sleep(1200);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(600);
  await page.screenshot({ path: path.join(OUT_DIR, '01-latest-dashboard.png'), type: 'png' });
  console.log('  ✓ 01-latest-dashboard.png captured');

  // -------------------------------------------------------------
  // 02 — 02-payment-proposal.png
  // Interface for creating or reviewing a payment proposal
  // -------------------------------------------------------------
  console.log('\n[02/12] Capturing 02-payment-proposal.png...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const createBtn = btns.find(b => b.textContent.includes('Create Payment'));
    if (createBtn) createBtn.click();
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '02-payment-proposal.png'), type: 'png' });
  console.log('  ✓ 02-payment-proposal.png captured');

  // Close Create Payment modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // -------------------------------------------------------------
  // 03 — 03-policy-configuration.png
  // Real policy settings, spending limits, and invariant catalog
  // -------------------------------------------------------------
  console.log('\n[03/12] Capturing 03-policy-configuration.png...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('nav button'));
    const polTab = tabs.find(t => t.textContent.includes('Policy Engine') || t.textContent.includes('Policy'));
    if (polTab) polTab.click();
  });
  await sleep(1200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(600);
  await page.screenshot({ path: path.join(OUT_DIR, '03-policy-configuration.png'), type: 'png' });
  console.log('  ✓ 03-policy-configuration.png captured');

  // -------------------------------------------------------------
  // 04 — 04-valid-payment-decision.png
  // Genuine payment proposal passing implemented policy checks
  // Open the Verification Trace Details modal showing Gate 1 & Gate 2 passed checks
  // -------------------------------------------------------------
  console.log('\n[04/12] Capturing 04-valid-payment-decision.png...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('nav button'));
    const wsTab = tabs.find(t => t.textContent.includes('Payment Workspace') || t.textContent.includes('Workspace'));
    if (wsTab) wsTab.click();
  });
  await sleep(800);

  // Set the verification trace modal to show genuine verified checks
  await page.evaluate(async () => {
    const res = await fetch('/api/contracts/ct_intel_pipeline_2026');
    if (res.ok) {
      const data = await res.json();
      const m1 = data.contract?.milestones?.[0];
      if (m1 && m1.verification_trace) {
        // Trigger React modal by finding the inspect button or milestone inspect
        const verifyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View Verification Details'));
        if (verifyBtn) verifyBtn.click();
      }
    }
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '04-valid-payment-decision.png'), type: 'png' });
  console.log('  ✓ 04-valid-payment-decision.png captured');

  // Close verification modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // -------------------------------------------------------------
  // 05 — 05-spending-limit-rejection.png
  // Actual rejected proposal exceeding configured spending limit
  // -------------------------------------------------------------
  console.log('\n[05/12] Capturing 05-spending-limit-rejection.png...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('nav button'));
    const polTab = tabs.find(t => t.textContent.includes('Policy Engine') || t.textContent.includes('Policy'));
    if (polTab) polTab.click();
  });
  await sleep(1000);

  // In sandbox, click "Evaluate Against Policy Engine"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const evalBtn = btns.find(b => b.textContent.includes('Evaluate Against Policy Engine'));
    if (evalBtn) evalBtn.click();
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '05-spending-limit-rejection.png'), type: 'png' });
  console.log('  ✓ 05-spending-limit-rejection.png captured');

  // -------------------------------------------------------------
  // 06 — 06-adversarial-input.png
  // Actual adversarial / prompt-injection test input supported by app
  // -------------------------------------------------------------
  console.log('\n[06/12] Capturing 06-adversarial-input.png...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('nav button'));
    const devTab = tabs.find(t => t.textContent.includes('Developer Settings'));
    if (devTab) devTab.click();
  });
  await sleep(800);

  await page.evaluate(() => {
    const subTabs = Array.from(document.querySelectorAll('button'));
    const aiTab = subTabs.find(t => t.textContent.trim() === 'AI Intelligence');
    if (aiTab) aiTab.click();
  });
  await sleep(800);

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const injTab = btns.find(b => b.textContent.includes('Adversarial Injection Defense') || b.textContent.includes('Injection'));
    if (injTab) injTab.click();
  });
  await sleep(800);
  await page.screenshot({ path: path.join(OUT_DIR, '06-adversarial-input.png'), type: 'png' });
  console.log('  ✓ 06-adversarial-input.png captured');

  // -------------------------------------------------------------
  // 07 — 07-security-decision.png
  // Result of security/policy evaluation for adversarial scenario
  // -------------------------------------------------------------
  console.log('\n[07/12] Capturing 07-security-decision.png...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.textContent.includes('Submit Payload to Gate 2 Auditor'));
    if (submitBtn) submitBtn.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '07-security-decision.png'), type: 'png' });
  console.log('  ✓ 07-security-decision.png captured');

  // -------------------------------------------------------------
  // 08 — 08-paypal-integration.png
  // PayPal Sandbox Configuration modal showing OAuth Handshake & credentials
  // -------------------------------------------------------------
  console.log('\n[08/12] Capturing 08-paypal-integration.png...');
  // Go back to workspace
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('nav button'));
    const wsTab = tabs.find(t => t.textContent.includes('Payment Workspace') || t.textContent.includes('Workspace'));
    if (wsTab) wsTab.click();
  });
  await sleep(800);

  // Click PayPal Sandbox badge in header to open genuine Sandbox configuration modal
  await page.evaluate(() => {
    const badge = document.querySelector('header div[style*="cursor: pointer"]');
    if (badge) badge.click();
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '08-paypal-integration.png'), type: 'png' });
  console.log('  ✓ 08-paypal-integration.png captured');

  // Close Sandbox Configuration modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // -------------------------------------------------------------
  // 09 — 09-payment-authorization.png
  // Real authorization workflow & current state
  // -------------------------------------------------------------
  console.log('\n[09/12] Capturing 09-payment-authorization.png...');
  await page.evaluate(() => {
    const stage2Card = document.querySelectorAll('.workflow-stage-card')[1];
    if (stage2Card) {
      const inspectBtn = stage2Card.querySelector('.stage-inspect-btn');
      if (inspectBtn) inspectBtn.click();
    }
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '09-payment-authorization.png'), type: 'png' });
  console.log('  ✓ 09-payment-authorization.png captured');

  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // -------------------------------------------------------------
  // 10 — 10-payment-capture.png
  // Genuine capture workflow & current state
  // -------------------------------------------------------------
  console.log('\n[10/12] Capturing 10-payment-capture.png...');
  await page.evaluate(() => {
    const stage4Card = document.querySelectorAll('.workflow-stage-card')[3];
    if (stage4Card) {
      const inspectBtn = stage4Card.querySelector('.stage-inspect-btn');
      if (inspectBtn) inspectBtn.click();
    }
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '10-payment-capture.png'), type: 'png' });
  console.log('  ✓ 10-payment-capture.png captured');

  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // -------------------------------------------------------------
  // 11 — 11-audit-records.png
  // Genuine audit records & inspection drawer
  // Open the Transaction Detail Drawer on an active transaction
  // -------------------------------------------------------------
  console.log('\n[11/12] Capturing 11-audit-records.png...');
  await page.evaluate(() => {
    // Click Inspect on the first row in the AG Grid ledger
    const inspectBtn = document.querySelector('.ag-row .stage-inspect-btn, .ag-row button');
    if (inspectBtn) inspectBtn.click();
  });
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT_DIR, '11-audit-records.png'), type: 'png' });
  console.log('  ✓ 11-audit-records.png captured');

  // Close drawer
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[title="Close drawer"], .drawer-close-btn, div[style*="position: fixed"] button');
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // -------------------------------------------------------------
  // 12 — 12-technical-workflow.png
  // Technical workflow: Reconciliation Center auditing upstream sync
  // -------------------------------------------------------------
  console.log('\n[12/12] Capturing 12-technical-workflow.png...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('nav button'));
    const reconTab = tabs.find(t => t.textContent.includes('Reconciliation'));
    if (reconTab) reconTab.click();
  });
  await sleep(1200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(600);
  await page.screenshot({ path: path.join(OUT_DIR, '12-technical-workflow.png'), type: 'png' });
  console.log('  ✓ 12-technical-workflow.png captured');

  await browser.close();
  console.log('\nAll 12 Devpost screenshots successfully captured at 1440x960 in demo/assets/devpost/latest/!');
}

run().catch((err) => {
  console.error('Fatal error during 12-screenshot capture:', err);
  process.exit(1);
});
