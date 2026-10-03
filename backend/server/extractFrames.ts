import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regenerates the parallax frame sequence from a source video.
 *
 *   npm run frames -- path/to/clip.mp4
 *
 * Requires ffmpeg on PATH (https://ffmpeg.org/download.html, or
 * `winget install Gyan.FFmpeg`). This is an asset-authoring tool, not a runtime
 * dependency: the app serves the extracted JPEGs and never shells out.
 *
 * Output count and size are chosen to match FRAME_COUNT and the canvas cap in
 * src/components/landing/ScrollAnimationBackground.tsx. If you change one,
 * change the other.
 */

const FRAME_COUNT = 48;
const FRAME_WIDTH = 1600;
const JPEG_QUALITY = 4;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'frontend', 'public', 'frames', 'cattle_frames_60fps');

/**
 * No shell: ffmpeg and ffprobe are .exe, and Node quotes their arguments
 * correctly on Windows. Going through a shell breaks on any path containing a
 * space - "C:\Users\Sai Argade\..." truncates the output path at the first space.
 */
function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(`${command} was not found on PATH. Install ffmpeg and try again.`));
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main(): Promise<void> {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: npm run frames -- <source.mp4>');
    process.exitCode = 1;
    return;
  }

  try {
    await fs.access(input);
  } catch {
    console.error(`Cannot read "${input}". Pass a path to a video file on this machine.`);
    process.exitCode = 1;
    return;
  }

  // Start clean: a stale frame_NNNN from a longer previous run would otherwise
  // linger and desync the scrub.
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  // fps is derived from the clip length so we always get exactly FRAME_COUNT
  // frames regardless of how long the source is. -2 keeps the aspect ratio and
  // forces width to an even number, which H.264/JPEG decoders prefer.
  const probe = await new Promise<string>((resolve, reject) => {
    const child = spawn(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', input],
      { stdio: ['ignore', 'pipe', 'ignore'] }
    );
    let out = '';
    child.stdout?.on('data', (chunk) => (out += String(chunk)));
    child.on('error', reject);
    child.on('close', () => resolve(out.trim()));
  });

  const duration = Number(probe);
  if (!Number.isFinite(duration) || duration <= 0) {
    console.error(`Could not read the duration of "${input}". Is it a video file?`);
    process.exitCode = 1;
    return;
  }

  const fps = (FRAME_COUNT / duration).toFixed(4);
  console.log(`Extracting ${FRAME_COUNT} frames from ${duration.toFixed(2)}s at ${fps} fps...`);

  await run('ffmpeg', [
    '-y',
    '-i', input,
    '-vf', `fps=${fps},scale=${FRAME_WIDTH}:-2`,
    '-q:v', String(JPEG_QUALITY),
    '-frames:v', String(FRAME_COUNT),
    path.join(outDir, 'frame_%04d.jpg'),
  ]);

  const files = (await fs.readdir(outDir)).filter((f) => f.endsWith('.jpg'));
  let bytes = 0;
  for (const file of files) bytes += (await fs.stat(path.join(outDir, file))).size;

  console.log(`\nDone. ${files.length} frames in public/frames/cattle_frames_60fps/`);
  console.log(`Total ${(bytes / 1024 / 1024).toFixed(1)} MB.`);
  if (files.length !== FRAME_COUNT) {
    console.warn(`Expected ${FRAME_COUNT} frames but got ${files.length}. Update FRAME_COUNT if this is intended.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
