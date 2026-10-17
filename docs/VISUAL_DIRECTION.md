# Holdfast Protocol — Visual Direction & Screen Aesthetics Guide

**Audience:** Judges, Technical Evaluators, and Engineers  
**Aesthetic Principle:** Restrained, functional, modern fintech engineering. The product interface must look like a high-tier enterprise payment tool (resembling Stripe, GitHub, or Linear) rather than an overdesigned hackathon toy.

---

## 1. Core Visual Principles

### A. High Contrast & Readable Hierarchy
- **Backgrounds:** Sleek dark mode using slate/zinc tones (`#090D16` primary background, `#111827` card surface, `#1E293B` borders).
- **Typography:** Modern sans-serif stack (`Inter`, `system-ui`, `-apple-system`).
  - Page Titles: 24px Semi-Bold (`#F8FAFC`)
  - Section Headings: 16px Medium (`#94A3B8`)
  - Financial Metric Values: 28px Bold Mono (`#38BDF8` or `#10B981`)
  - Body Text: 14px Regular (`#CBD5E1`)
  - Code & Hashes: 12px JetBrains Mono / Fira Code (`#A5B4FC`)
- **Spacing:** Strict 8px grid system (`8px`, `16px`, `24px`, `32px` padding and margins). Cards must feel spacious and uncluttered.

### B. Functional Color Coding (Zero Neon Fluff)
| Semantic Role | Color Code | Application |
|---|---|---|
| **Primary Brand / Action** | `#0070BA` (PayPal Classic Blue) | Primary action buttons, active navigation indicators |
| **Protected / Hold** | `#F59E0B` (Amber 500) | Funds Protected, authorization hold status badges |
| **Verified / Captured** | `#10B981` (Emerald 500) | Gate 1 pass, captured tranches, valid HMAC signatures |
| **Adversarial Veto / Error** | `#EF4444` (Rose 500) | Gate 2 prompt injection veto, invalid payload error state |
| **Border / Dividers** | `#334155` (Slate 700) | Card borders, table dividers, modal outlines |

### C. What to Strictly Avoid
- ❌ **No Flashy Neon Effects:** Avoid glowing cyan/magenta borders or blinding animations that distract from text.
- ❌ **No Overloaded Layouts:** Do not cram 20 metric widgets onto one screen. Keep the 3 core numbers ("Funds Protected", "Payments Completed", "Action Required") front and center.
- ❌ **No Fabricated Charts:** Do not display meaningless random line graphs or fake transaction volumes.
- ❌ **No Giant Video Captions:** Avoid loud, jumping TikTok-style captions. Subtitles must be standard bottom-aligned text (24–28pt, white text with semi-transparent black background).

---

## 2. Screen Framing & Video Recording Standards

### A. Viewport & Browser Dimensions
- **Resolution:** 1920x1080 (1080p, 16:9 aspect ratio).
- **Browser Zoom:** Set Google Chrome / Edge zoom to **110%** or **125%** so that all text, badge numbers, and JSON keys are easily readable on mobile or laptop judge displays.
- **Window Arrangement:** Full-screen browser window without extraneous toolbars, browser bookmarks bar, or unrelated extensions visible.
- **Operating System Chrome:** Hide Windows taskbar during full-screen recording or crop cleanly to 1920x1080.

### B. Cursor & Interaction Discipline
- **Mouse Movement:** Move the cursor deliberately and smoothly. Never rapidly shake or jerk the cursor across the screen.
- **Hover Pauses:** When navigating to a button (e.g., *"Inspect Contract"* or *"Verify Cryptographic Integrity"*), hover for 0.5s before clicking, allowing the viewer's eye to follow.
- **Scroll Behavior:** Use smooth, slow page scrolling. Never flick or spin the scroll wheel quickly.

### C. Modal & Inspector Presentations
- When opening the **Cryptographic Acceptance Receipt Modal**, allow it to occupy the center 60% of the screen.
- Ensure the SHA-256 hash string (`0x8a7f...`) is displayed in a distinct monospaced font with a copy button and a prominent green verification badge.

---

## 3. Transition & Overlay Rules

- **Cuts Over Flashy Wipes:** Use simple hard cuts or 300ms cross-dissolves between major scenes. Do not use 3D page flips or star wipes.
- **Minimal On-Screen Text:** Never display paragraphs of text on the video screen. On-screen text should be limited to small, discreet pill tags in the upper-left or bottom-left corner indicating current state:
  - `PayPal Orders v2: Authorization Active`
  - `Gate 1: Deterministic Schema Verification`
  - `Gate 2: Gemini Flash Adversarial Review`
  - `HMAC-SHA256 Tamper Detection`
- **Audio-Visual Harmony:** Let visual transitions occur on natural pauses in the voice-over narration.
