import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const FFMPEG = 'C:\\Users\\Infinity\\.gemini\\antigravity-ide\\scratch\\ai-candidate-analyzer\\node_modules\\ffmpeg-static\\ffmpeg.exe';
const BRAIN_DIR = 'C:\\Users\\Infinity\\.gemini\\antigravity-ide\\brain\\f023c068-e354-4f6d-a453-93a43cf68c81';

const ROOT_GALLERY = path.resolve('demo', 'gallery');
const SUBMISSION_GALLERY = path.resolve('..', 'Holdfast-Protocol-Submission', 'demo', 'gallery');
const LOCAL_SUB_GALLERY = path.resolve('Holdfast-Protocol-Submission', 'demo', 'gallery');

[ROOT_GALLERY, SUBMISSION_GALLERY, LOCAL_SUB_GALLERY].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const galleryItems = [
  {
    name: '01_project_cover_overview.jpg',
    src: path.join(BRAIN_DIR, 'holdfast_pro_thumbnail_1792234819193.jpg'),
    title: 'Cover: Holdfast Protocol — Trustworthy Payments for AI Commerce'
  },
  {
    name: '02_live_cockpit_dashboard.jpg',
    src: path.join(BRAIN_DIR, 'dashboard_view_1792221417072.png'),
    title: 'Executive Dashboard: Funds Protected, Payments Completed & Active Contracts'
  },
  {
    name: '03_contracts_and_escrow_ledger.jpg',
    src: path.join(BRAIN_DIR, 'contracts_list_1792221439370.png'),
    title: 'Contracts Ledger: Non-Custodial Pre-Authorization vs Settled Capital'
  },
  {
    name: '04_contract_inspection_drawer.jpg',
    src: path.join(BRAIN_DIR, 'detail_drawer_open_1920_1791897309072.png'),
    title: 'Contract Detail: Buyer & Worker Agent Identities and Milestone Specifications'
  },
  {
    name: '05_milestone_criteria_specs.jpg',
    src: path.join(BRAIN_DIR, 'milestones_view_1792057291977.png'),
    title: 'Milestone View: Schema Type, Required Keys and Tranche Budget Allocation'
  },
  {
    name: '06_gate1_deterministic_assertions.jpg',
    src: path.join(BRAIN_DIR, 'payment_requests_1920_1791897233635.png'),
    title: 'Gate 1 Deterministic Verification: Schema Type & Positive Price Mathematical Proofs'
  },
  {
    name: '07_gate2_adversarial_ai_veto.jpg',
    src: path.join(BRAIN_DIR, 'vetoed_alert_1792058027181.png'),
    title: 'Gate 2 Adversarial Auditor: Instant Veto on Prompt Injection Attack Deliverable'
  },
  {
    name: '08_cryptographic_acceptance_receipt.jpg',
    src: path.join(BRAIN_DIR, 'acceptance_receipt_modal_1792221657052.png'),
    title: 'Acceptance Receipt Modal: HMAC-SHA256 Digital Signature and Live Tamper Verification'
  },
  {
    name: '09_paypal_tranche_capture_settlement.jpg',
    src: path.join(BRAIN_DIR, 'after_submitting_milestone2_1792057841430.png'),
    title: 'PayPal Payments v2: Automated Milestone Tranche Settlement with Idempotency Key'
  },
  {
    name: '10_lost_response_reconciliation.jpg',
    src: path.join(BRAIN_DIR, 'reconciliation_contract_1792058076634.png'),
    title: 'Lost-Response Recovery: Upstream Network Drop Reconciliation Preventing Duplicate Captures'
  },
  {
    name: '11_interactive_judge_scenarios.jpg',
    src: path.join(BRAIN_DIR, 'judge_scenarios_tab_1792058137679.png'),
    title: 'Interactive Judge Cockpit: Live Scenario Testing Suite and Settlement Triggers'
  },
  {
    name: '12_live_audit_telemetry_stream.jpg',
    src: path.join(BRAIN_DIR, 'live_telemetry_tab_1792058231882.png'),
    title: 'Audit Telemetry Stream: Real-time Event Logging and Dispute Evidence Packet'
  }
];

console.log('Generating Devpost 3:2 Media Gallery (1800x1200 JPEG, < 5 MB)...');

for (let i = 0; i < galleryItems.length; i++) {
  const item = galleryItems[i];
  const outPath = path.join(ROOT_GALLERY, item.name);
  
  if (!fs.existsSync(item.src)) {
    console.warn(`[WARN] Source not found for ${item.name}: ${item.src}`);
    continue;
  }

  // 1800x1200 is exact 3:2 ratio. Pad with dark background if slight variation.
  const cmd = `"${FFMPEG}" -y -i "${item.src}" ` +
    `-vf "scale=1800:1200:force_original_aspect_ratio=decrease,pad=1800:1200:(ow-iw)/2:(oh-ih)/2:color=0x0B0F19" ` +
    `-q:v 2 "${outPath}"`;

  try {
    execSync(cmd, { stdio: 'ignore' });
    const stat = fs.statSync(outPath);
    const sizeKb = (stat.size / 1024).toFixed(1);
    console.log(`  ✓ [${i + 1}/${galleryItems.length}] ${item.name} (${sizeKb} KB) — 3:2 (1800x1200)`);
    
    // Copy to submission directories
    fs.copyFileSync(outPath, path.join(SUBMISSION_GALLERY, item.name));
    fs.copyFileSync(outPath, path.join(LOCAL_SUB_GALLERY, item.name));
  } catch (err) {
    console.error(`[ERROR] Failed to convert ${item.name}:`, err.message);
  }
}

console.log('\n✅ Successfully generated all 3:2 gallery images for Devpost!');
