Add-Type -AssemblyName System.Speech

$outputDir = "C:\Users\Infinity\OneDrive\Desktop\Paypal Hackthon\demo\assets"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$audioPath = Join-Path $outputDir "professional_voiceover.wav"
$srtPath = Join-Path $outputDir "Holdfast_Protocol_Professional_Demo.srt"

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $synth.SelectVoice("Microsoft Zira Desktop")
} catch {
    # Fallback to default voice if Zira not installed
}
$synth.Rate = 0  # Standard natural pacing
$synth.Volume = 100

Write-Output "Synthesizing professional voiceover narration to $audioPath..."

$synth.SetOutputToWaveFile($audioPath)

$segments = @(
    @{
        Title = "A. Opening"
        Start = "00:00:00,000"
        End   = "00:00:15,000"
        Text  = "Holdfast Protocol. Trust infrastructure for AI-powered commerce. Payments for AI agents, with verifiable safeguards."
    },
    @{
        Title = "B. Problem and Product"
        Start = "00:00:15,000"
        End   = "00:00:35,000"
        Text  = "AI agents can prepare work, recommend actions, and request payments. But a payment system needs enforceable rules and verifiable evidence. Holdfast adds a verification layer between an agent's request and an eligible payment operation."
    },
    @{
        Title = "C. Valid Settlement"
        Start = "00:00:35,000"
        End   = "00:01:00,000"
        Text  = "In Demo Simulated mode, we trigger our standard settlement scenario. A worker agent submits market extraction data. Gate 1 executes deterministic schema and boundary validation, while Gate 2 performs an adversarial security review. Both gates pass, issuing an HMAC acceptance receipt. Notice the clear indicator: this scenario is simulated and moves zero real funds."
    },
    @{
        Title = "D. Financial Policy Violation"
        Start = "00:01:00,000"
        End   = "00:01:25,000"
        Text  = "Next, what happens when an agent requests more than its authorized limit? Here, the agent requests one hundred and fifty dollars against a one hundred dollar hold. Holdfast checks the requested amount against deterministic financial invariants. This request exceeds the authorized ceiling, so the policy blocks it before capture is dispatched. Exactly zero dollars are moved."
    },
    @{
        Title = "E. Prompt-Injection Veto"
        Start = "00:01:25,000"
        End   = "00:01:50,000"
        Text  = "In our third scenario, an adversarial payload attempts a prompt injection override. Gate 2 evaluates the content under our strict Veto-Only Principle. The AI security reviewer can flag or veto suspicious requests. It cannot grant payment authority or override deterministic financial rules. The injection is detected and capture is blocked."
    },
    @{
        Title = "F. AG Grid Community Ledger"
        Start = "00:01:50,000"
        End   = "00:02:15,000"
        Text  = "All contract events are surfaced in our full-width AG Grid Community ledger. Operators can search transactions, sort numeric amounts, and filter by payment state or environment. Selecting any row instantly focuses the payment decision panel, and clicking Inspect opens our slide-over drawer with provider references and evidence details without squeezing the table."
    },
    @{
        Title = "G. PayPal Sandbox"
        Start = "00:02:15,000"
        End   = "00:02:35,000"
        Text  = "Holdfast integrates directly with PayPal. Our live connection probe verifies OAuth with the PayPal Sandbox API. In production, Holdfast enforces a clean five-stage boundary: OAuth verification, order creation, interactive buyer approval, pre-authorization hold, and programmatic capture upon verified evidence."
    },
    @{
        Title = "H. Close"
        Start = "00:02:35,000"
        End   = "00:02:50,000"
        Text  = "Holdfast Protocol. Verifiable safeguards for AI-powered commerce. Explore our open source repository, automated test suites, and documentation at github dot com slash faizkhatri196 slash PayPal-Hackthon. Thank you."
    }
)

$srtContent = ""
$i = 1

foreach ($seg in $segments) {
    Write-Output "Recording: $($seg.Title)"
    $synth.Speak($seg.Text)
    $synth.Speak("  ") # Natural pause between segments
    
    $srtContent += "$i`r`n$($seg.Start) --> $($seg.End)`r`n$($seg.Text)`r`n`r`n"
    $i++
}

$synth.Dispose()

Set-Content -Path $srtPath -Value $srtContent -Encoding utf8
Write-Output "✅ Generated professional voiceover: $audioPath"
Write-Output "✅ Generated subtitles: $srtPath"
