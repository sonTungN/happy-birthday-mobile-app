// Photos are resized to 1080px, converted to WebP and stripped of EXIF data (including GPS location)
// at build time, so you can drop the original photos from your phone straight into src/assets/photos/
// (or a folder inside it: `photoUrl("darkroom/x.jpg")`). Lowercase extensions only: the pipeline skips the rest.
const photoModules = import.meta.glob<string>(
  "../assets/photos/**/*.{jpg,jpeg,png,webp,avif}",
  {
    eager: true,
    import: "default",
    query: { w: 1080, format: "webp", quality: 80 },
  },
);

const audioModules = import.meta.glob<string>(
  "../assets/audio/*.{mp3,m4a,aac,wav,ogg,MP3,M4A}",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

// Clips are served as they are: an H.264 .mp4 plays everywhere (avconvert --preset Preset960x540 makes one)
const videoModules = import.meta.glob<string>(
  "../assets/video/*.{mp4,webm,mov,MP4,MOV}",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

const isUrl = (file: string) => /^(https?:|data:|blob:)/.test(file);

function lookup(modules: Record<string, string>, file: string): string | null {
  const suffix = `/${file}`;
  for (const [path, url] of Object.entries(modules)) {
    if (path.endsWith(suffix)) return url;
  }
  return null;
}

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

function missingPhoto(file: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#2a2a2a"/><text x="200" y="190" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#f2eee5">Missing photo</text><text x="200" y="228" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#8d8a84">${escapeXml(file)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** URL of a photo in src/assets/photos. A missing file shows a "Missing photo" tile instead of breaking the page. */
export function photoUrl(file: string): string {
  if (isUrl(file)) return file;
  const url = lookup(photoModules, file);
  if (url) return url;
  console.warn(`[film roll] Photo not found: src/assets/photos/${file}`);
  return missingPhoto(file);
}

/** URL of a clip in src/assets/video (or an external link). null if there is none. */
export function videoUrl(file: string | null): string | null {
  if (!file) return null;
  if (isUrl(file)) return file;
  const url = lookup(videoModules, file);
  if (!url) console.warn(`[film roll] Clip not found: src/assets/video/${file}`);
  return url;
}

/** URL of a file in src/assets/audio (or an external link). null if there is none. */
export function audioUrl(file: string | null): string | null {
  if (!file) return null;
  if (isUrl(file)) return file;
  const url = lookup(audioModules, file);
  if (!url)
    console.warn(`[film roll] Audio file not found: src/assets/audio/${file}`);
  return url;
}

/** Preloads every photo so chapter transitions never flash an empty frame. */
export function preloadPhotos(): void {
  for (const url of Object.values(photoModules)) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}
