import os
import subprocess

FFMPEG = r"C:\Users\Infinity\.gemini\antigravity-ide\scratch\ai-candidate-analyzer\node_modules\ffmpeg-static\ffmpeg.exe"
AUDIO_DIR = r"demo\assets\audio_segments"
OUTPUT_WAV = r"demo\assets\professional_voiceover.wav"
OUTPUT_MP3 = r"demo\assets\professional_voiceover.mp3"

scenes = [f"scene_{i:02d}.mp3" for i in range(1, 11)]

# Create silence file of 0.5s
silence_wav = r"demo\assets\audio_segments\silence_05.wav"
subprocess.run([
    FFMPEG, "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.5", silence_wav
], check=True)

# Build concat list
concat_txt = r"demo\assets\audio_segments\audio_concat.txt"
with open(concat_txt, "w", encoding="utf-8") as f:
    for i, s in enumerate(scenes):
        s_path = os.path.abspath(os.path.join(AUDIO_DIR, s)).replace("\\", "/")
        f.write(f"file '{s_path}'\n")
        if i < len(scenes) - 1:
            sil_path = os.path.abspath(silence_wav).replace("\\", "/")
            f.write(f"file '{sil_path}'\n")

print("Concatenating and mastering audio...")
# Combine and apply subtle mastering: 48kHz, subtle compression, high fidelity
subprocess.run([
    FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", concat_txt,
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000",
    "-c:a", "pcm_s16le", OUTPUT_WAV
], check=True)

# Also create mp3
subprocess.run([
    FFMPEG, "-y", "-i", OUTPUT_WAV,
    "-c:a", "libmp3lame", "-b:a", "192k", OUTPUT_MP3
], check=True)

# Get final duration
res = subprocess.run([FFMPEG, "-i", OUTPUT_WAV], capture_output=True, text=True)
dur = res.stderr.split("Duration: ")[1].split(",")[0]
print(f"Mastered Voiceover Duration: {dur}")
