/**
 * Video Utility for Keeper App
 * Handles YouTube, Google Drive, and Direct Video links seamlessly.
 * Ensures robust iframe embedding on Mobile (iOS Safari, Android Chrome)
 * and resolves Google Drive X-Frame-Options SAMEORIGIN restrictions by
 * converting preview links to embeddable formats.
 */

export interface VideoEmbedInfo {
  type: 'youtube' | 'drive' | 'direct' | 'unknown';
  embedUrl: string;
  rawUrl: string;
  title?: string;
}

/**
 * Extracts YouTube 11-character video ID from watch URLs, youtu.be short links,
 * shorts, embeds and query strings.
 */
export function getYouTubeEmbedId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Handle standard watch, youtu.be, shorts, embeds
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }

  // Fallback query parameter parsing
  try {
    const parsed = new URL(trimmed);
    const vParam = parsed.searchParams.get('v');
    if (vParam && vParam.length === 11) {
      return vParam;
    }
  } catch {
    // Invalid URL format
  }

  return null;
}

/**
 * Extracts Google Drive File ID and constructs the preview embed URL.
 * Standard URLs like drive.google.com/file/d/FILE_ID/view are blocked by X-Frame-Options.
 * Converting them to drive.google.com/file/d/FILE_ID/preview enables iframe embedding.
 */
export function getGoogleDriveEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  if (!trimmed.includes('drive.google.com')) {
    return null;
  }

  // 1. /file/d/FILE_ID/...
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }

  // 2. id=FILE_ID in query params (open?id=..., uc?id=...)
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  }

  return null;
}

/**
 * Checks if the URL points to a direct video file format (.mp4, .webm, .mov)
 * or a raw storage stream.
 */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.includes('.mp4?') ||
    lower.includes('firebasestorage.googleapis.com')
  );
}

/**
 * Unified resolver that analyzes any given video link and outputs
 * structured embed information for player rendering.
 */
export function resolveVideoInfo(url: string, title?: string): VideoEmbedInfo {
  const trimmed = (url || '').trim();

  // 1. Check YouTube
  const ytId = getYouTubeEmbedId(trimmed);
  if (ytId) {
    return {
      type: 'youtube',
      // playsinline=1 prevents forced fullscreen on iOS Safari
      // rel=0 avoids showing arbitrary external related videos
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?playsinline=1&rel=0`,
      rawUrl: trimmed,
      title: title || 'Video'
    };
  }

  // 2. Check Google Drive
  const driveEmbed = getGoogleDriveEmbedUrl(trimmed);
  if (driveEmbed) {
    return {
      type: 'drive',
      embedUrl: driveEmbed,
      rawUrl: trimmed,
      title: title || 'Google Drive Video'
    };
  }

  // 3. Check Direct video stream
  if (isDirectVideoUrl(trimmed)) {
    return {
      type: 'direct',
      embedUrl: trimmed,
      rawUrl: trimmed,
      title: title || 'Video Stream'
    };
  }

  // 4. Fallback: Unknown / standard external URL
  return {
    type: 'unknown',
    embedUrl: trimmed,
    rawUrl: trimmed,
    title: title || 'Externes Video'
  };
}
