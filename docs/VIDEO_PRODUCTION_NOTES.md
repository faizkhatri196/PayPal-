# Holdfast Protocol — Video Production & Engineering Notes

This document details the production specifications, encoding pipeline, and playback verification for the official Holdfast Protocol demonstration video.

---

## 1. Master Deliverables

| Deliverable | Location | Specs | Status |
| :--- | :--- | :--- | :--- |
| **Professional Product Demo** | `demo/Holdfast-Protocol-Professional-Demo.mp4` | 1920x1080 (16:9), 30 FPS, H.264 High Profile, AAC 22.05 kHz, 2m 48s, 6.51 MB | **VERIFIED ON DISK** |
| **Standard Demo Mirror** | `demo/Holdfast-Protocol-Demo.mp4` | 1920x1080 (16:9), 30 FPS, H.264 High Profile, AAC 22.05 kHz, 2m 48s, 6.51 MB | **VERIFIED ON DISK** |
| **Subtitles Track** | `demo/assets/Holdfast_Protocol_Professional_Demo.srt` | SubRip UTF-8, 8 timestamped segments | **VERIFIED ON DISK** |
| **Master Voiceover Track** | `demo/assets/professional_voiceover.wav` | PCM 16-bit, 22.05 kHz mono, 2m 46s, 7.4 MB | **VERIFIED ON DISK** |

---

## 2. Technical Encoding Specifications

- **Container:** MPEG-4 (MP4v2 / ISO base media)
- **Video Stream:**
  - Codec: `H.264 / AVC (Advanced Video Coding)`
  - Profile: `High @ Level 4.0`
  - Dimensions: `1920 x 1080` (Native 1080p, 16:9 aspect ratio)
  - Frame Rate: `30.000 FPS constant`
  - Pixel Format: `YUV 4:2:0 planar`
  - Bitrate: `~218 kbps average` (variable bit rate, tuned for sharp UI typography)
- **Audio Stream:**
  - Codec: `AAC (Advanced Audio Coding - Low Complexity)`
  - Sampling Rate: `22,050 Hz`
  - Channels: `1 (Mono)`
  - Bitrate: `~87 kbps`
- **Total Duration:** `00:02:48.01` (168 seconds)
  - Exactly within the strict hackathon window of 2 minutes 40 seconds to 2 minutes 55 seconds (< 180 seconds).

---

## 3. Production Pipeline

1. **Narration Synthesis:**
   - Script: `scripts/generate-professional-narration.ps1`
   - Engine: Windows `System.Speech.Synthesis` with standard conversational cadence (`Rate = 0`).
   - Timed segments with natural breathing pauses between scenes.
2. **Visual Sequencing:**
   - Script: `scripts/render-professional-demo.mjs`
   - Master Engine: Static FFmpeg build (`v6.1.1`).
   - High-contrast 1080p application captures sequenced via concat demuxer.
   - Padded with letterbox prevention filters (`scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2`).
3. **Audio-Video Multiplexing:**
   - Concat video track paired with master speech track using `-shortest` and `-c:v libx264 -crf 18 -preset fast`.

---

## 4. Manual Screen-Recording Guide (For Presenter Re-Records)

If you wish to record a live video with your own voiceover microphone:

1. **Resolution & Display Setup:**
   - Display resolution: 1920x1080.
   - Browser: Google Chrome or Microsoft Edge at 100% zoom.
   - Navigate to `http://localhost:3000`.
2. **Recording Software:**
   - **OBS Studio:** Configure Canvas to `1920x1080`, 30 FPS, Output format MP4 (NVENC or x264).
   - Alternatively: Windows Game Bar (`Win + G`) or Loom.
3. **Execution Sequence (Follow `docs/PROFESSIONAL_DEMO_SCRIPT.md`):**
   - **0:00 – 0:15:** Display the clean header wordmark and descriptor.
   - **0:15 – 0:35:** Highlight the horizontal financial metrics strip (*Pre-Authorized Holds*, *Settled Volume*).
   - **0:35 – 1:00:** Click `"Standard Settlement ($15.00)"`. Show the green decision panel and HMAC receipt.
   - **1:00 – 1:25:** Click `"Ceiling Breach ($150 on $100 hold)"`. Show the red block reason and $0 captured.
   - **1:25 – 1:50:** Click `"Prompt Injection Veto"`. Show the AI adversarial veto and zero funds moved.
   - **1:50 – 2:15:** In AG Grid, filter by `"Ceiling"`, sort Amount, select row, and click `"Inspect"` to show the slide-over drawer.
   - **2:15 – 2:35:** Click the header status pill to show the live PayPal Sandbox OAuth probe (1286ms latency).
   - **2:35 – 2:48:** Conclude with the repository link (`github.com/faizkhatri196/PayPal-Hackthon`).
4. **Export:**
   - Save the file as `demo/Holdfast-Protocol-Professional-Demo.mp4`.
