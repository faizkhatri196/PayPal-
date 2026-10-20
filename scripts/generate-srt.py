import os
import subprocess

FFMPEG = r"C:\Users\Infinity\.gemini\antigravity-ide\scratch\ai-candidate-analyzer\node_modules\ffmpeg-static\ffmpeg.exe"
AUDIO_DIR = r"demo\assets\audio_segments"
SRT_PATH = r"demo\assets\Holdfast_Protocol_Professional_Demo.srt"

SCENES_META = [
    {
        "id": 1,
        "title": "Introduction",
        "subs": [
            ("Welcome to Holdfast Protocol: trust infrastructure for AI-powered commerce.", 0.0, 5.5),
            ("As autonomous agents conduct transactions, businesses cannot rely solely on an AI model's judgment to authorize payments.", 5.5, 14.04)
        ]
    },
    {
        "id": 2,
        "title": "Product Architecture",
        "subs": [
            ("Holdfast introduces a dual-gate architecture.", 0.0, 3.8),
            ("When an agent requests a payment, it must first pass deterministic financial invariant checks,", 3.8, 9.8),
            ("followed by cryptographic evidence verification, before entering the authorized payment workflow.", 9.8, 15.2),
            ("AI advises, but mathematical rules govern.", 15.2, 19.10)
        ]
    },
    {
        "id": 3,
        "title": "Application Overview",
        "subs": [
            ("Here in the Holdfast operations cockpit, operators monitor pre-authorized holds, settled volume, and live system health.", 0.0, 8.5),
            ("Every transaction tracks through a verifiable four-stage payment lifecycle recorded directly into the audit ledger.", 8.5, 15.12)
        ]
    },
    {
        "id": 4,
        "title": "Successful Simulated Payment",
        "subs": [
            ("Let us execute a standard fifteen-dollar payment scenario.", 0.0, 4.2),
            ("In this simulated demonstration, clearly labeled Demo Simulated,", 4.2, 8.8),
            ("the transaction passes deterministic policy rules, completes evidence verification,", 8.8, 14.2),
            ("and mints an HMAC-SHA256 acceptance receipt with zero exposure to live funds.", 14.2, 20.28)
        ]
    },
    {
        "id": 5,
        "title": "Financial Policy Enforcement",
        "subs": [
            ("Next, we test financial policy enforcement.", 0.0, 3.5),
            ("An agent attempts to charge one hundred fifty dollars against a strict one hundred dollar hold ceiling.", 3.5, 9.8),
            ("The deterministic engine immediately rejects the request before capture,", 9.8, 14.0),
            ("ensuring zero dollars moved and preventing balance depletion.", 14.0, 18.02)
        ]
    },
    {
        "id": 6,
        "title": "Prompt-Injection Defence",
        "subs": [
            ("Now we simulate an adversarial prompt injection attempting unauthorized fee escalation.", 0.0, 6.2),
            ("Holdfast applies a strict veto-only principle:", 6.2, 9.5),
            ("security audits can veto transactions, but can never authorize them.", 9.5, 14.5),
            ("The attack is flagged, logged, and safely neutralized.", 14.5, 18.14)
        ]
    },
    {
        "id": 7,
        "title": "Ledger and Receipts",
        "subs": [
            ("In the AG Grid ledger, operators can search transactions, sort by amount, and filter by status.", 0.0, 7.2),
            ("Selecting a transaction opens the inspector drawer,", 7.2, 10.8),
            ("revealing cryptographic payload hashes, verification timestamps, and complete deterministic audit trails.", 10.8, 17.71)
        ]
    },
    {
        "id": 8,
        "title": "PayPal Sandbox Integration",
        "subs": [
            ("Holdfast integrates directly with PayPal Sandbox APIs.", 0.0, 4.0),
            ("The platform continuously monitors OAuth connectivity and token health,", 4.0, 9.5),
            ("maintaining a strict architectural boundary between sandbox testing and buyer approval, authorization, and capture workflows.", 9.5, 17.11)
        ]
    },
    {
        "id": 9,
        "title": "Architecture and Open Source",
        "subs": [
            ("Built with a React TypeScript frontend, Node.js backend, deterministic policy engine, and Model Context Protocol server,", 0.0, 8.5),
            ("the entire codebase is fully open source on GitHub at faizkhatri196 slash PayPal-Hackthon.", 8.5, 15.12)
        ]
    },
    {
        "id": 10,
        "title": "Conclusion",
        "subs": [
            ("Holdfast Protocol: verifiable safeguards for AI-powered commerce.", 0.0, 5.0),
            ("Deterministic security for the next generation of autonomous payments.", 5.0, 10.06)
        ]
    }
]

def format_ts(seconds):
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

current_offset = 0.0
sub_counter = 1
srt_lines = []

for s in SCENES_META:
    for text, start, end in s["subs"]:
        abs_start = current_offset + start
        abs_end = current_offset + end
        srt_lines.append(f"{sub_counter}\n{format_ts(abs_start)} --> {format_ts(abs_end)}\n{text}\n\n")
        sub_counter += 1
    # add scene audio duration + 0.5s pause
    scene_dur = s["subs"][-1][2]
    current_offset += scene_dur + 0.5

with open(SRT_PATH, "w", encoding="utf-8") as f:
    f.writelines(srt_lines)

print(f"Generated {sub_counter-1} subtitle entries ending at {format_ts(current_offset)}")
