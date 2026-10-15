import fs from 'node:fs';
import path from 'node:path';

const finalDir = 'C:\\Users\\Infinity\\OneDrive\\Desktop\\Holdfast-Protocol-Submission\\final_video';
const originalSrt = path.join(finalDir, 'Holdfast_Protocol_Demo.srt');
const scaledSrt = path.join(finalDir, 'Holdfast_Protocol_Demo_3min.srt');

const srtText = fs.readFileSync(originalSrt, 'utf8');

function scaleTimestamp(ts, factor) {
  // 00:01:05,000
  const match = ts.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) return ts;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  const ms = parseInt(match[4], 10);
  const totalMs = (h * 3600 + m * 60 + s) * 1000 + ms;
  const scaledMs = Math.round(totalMs / factor);

  const newH = Math.floor(scaledMs / 3600000);
  const remH = scaledMs % 3600000;
  const newM = Math.floor(remH / 60000);
  const remM = remH % 60000;
  const newS = Math.floor(remM / 1000);
  const newMs = remM % 1000;

  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')},${String(newMs).padStart(3, '0')}`;
}

const factor = 1.1695;
const lines = srtText.split(/\r?\n/);
const scaledLines = lines.map(line => {
  if (line.includes(' --> ')) {
    const [start, end] = line.split(' --> ');
    return `${scaleTimestamp(start.trim(), factor)} --> ${scaleTimestamp(end.trim(), factor)}`;
  }
  return line;
});

fs.writeFileSync(scaledSrt, scaledLines.join('\r\n'), 'utf8');
console.log('✅ Created scaled 3-minute SRT:', scaledSrt);
