import asyncio
import os
import edge_tts

SCENES = [
    {
        "id": 1,
        "name": "Scene 1: Introduction",
        "target_duration": 12.0,
        "text": "Welcome to Holdfast Protocol: trust infrastructure for AI-powered commerce. As autonomous agents conduct transactions, businesses cannot rely solely on an AI model's judgment to authorize payments."
    },
    {
        "id": 2,
        "name": "Scene 2: Product Architecture",
        "target_duration": 18.0,
        "text": "Holdfast introduces a dual-gate architecture. When an agent requests a payment, it must first pass deterministic financial invariant checks, followed by cryptographic evidence verification, before entering the authorized payment workflow. AI advises, but mathematical rules govern."
    },
    {
        "id": 3,
        "name": "Scene 3: Application Overview",
        "target_duration": 15.0,
        "text": "Here in the Holdfast operations cockpit, operators monitor pre-authorized holds, settled volume, and live system health. Every transaction tracks through a verifiable four-stage payment lifecycle recorded directly into the audit ledger."
    },
    {
        "id": 4,
        "name": "Scene 4: Successful Simulated Payment",
        "target_duration": 20.0,
        "text": "Let us execute a standard fifteen-dollar payment scenario. In this simulated demonstration, clearly labeled Demo Simulated, the transaction passes deterministic policy rules, completes evidence verification, and mints an HMAC-SHA256 acceptance receipt with zero exposure to live funds."
    },
    {
        "id": 5,
        "name": "Scene 5: Financial Policy Enforcement",
        "target_duration": 20.0,
        "text": "Next, we test financial policy enforcement. An agent attempts to charge one hundred fifty dollars against a strict one hundred dollar hold ceiling. The deterministic engine immediately rejects the request before capture, ensuring zero dollars moved and preventing balance depletion."
    },
    {
        "id": 6,
        "name": "Scene 6: Prompt-Injection Defence",
        "target_duration": 20.0,
        "text": "Now we simulate an adversarial prompt injection attempting unauthorized fee escalation. Holdfast applies a strict veto-only principle: security audits can veto transactions, but can never authorize them. The attack is flagged, logged, and safely neutralized."
    },
    {
        "id": 7,
        "name": "Scene 7: Ledger and Receipts",
        "target_duration": 20.0,
        "text": "In the AG Grid ledger, operators can search transactions, sort by amount, and filter by status. Selecting a transaction opens the inspector drawer, revealing cryptographic payload hashes, verification timestamps, and complete deterministic audit trails."
    },
    {
        "id": 8,
        "name": "Scene 8: PayPal Sandbox Integration",
        "target_duration": 20.0,
        "text": "Holdfast integrates directly with PayPal Sandbox APIs. The platform continuously monitors OAuth connectivity and token health, maintaining a strict architectural boundary between sandbox testing and buyer approval, authorization, and capture workflows."
    },
    {
        "id": 9,
        "name": "Scene 9: Architecture and Open Source",
        "target_duration": 15.0,
        "text": "Built with a React TypeScript frontend, Node.js backend, deterministic policy engine, and Model Context Protocol server, the entire codebase is fully open source on GitHub at faizkhatri196 slash PayPal-Hackthon."
    },
    {
        "id": 10,
        "name": "Scene 10: Conclusion",
        "target_duration": 10.0,
        "text": "Holdfast Protocol: verifiable safeguards for AI-powered commerce. Deterministic security for the next generation of autonomous payments."
    }
]

VOICE = "en-US-ChristopherNeural"
OUT_DIR = "demo/assets/audio_segments"
os.makedirs(OUT_DIR, exist_ok=True)

async def generate():
    for s in SCENES:
        out_path = os.path.join(OUT_DIR, f"scene_{s['id']:02d}.mp3")
        print(f"Generating {s['name']}...")
        comm = edge_tts.Communicate(s['text'], VOICE, rate="+0%")
        await comm.save(out_path)
        print(f"Saved {out_path}")

if __name__ == "__main__":
    asyncio.run(generate())
