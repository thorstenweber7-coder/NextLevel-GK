// Utility to load Logo.png and dynamically produce a transparent version via HTML5 Canvas
let transparentLogoCache: string | null = null;

export async function getTransparentLogoUrl(): Promise<string> {
  if (transparentLogoCache) return transparentLogoCache;

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('/Logo.png');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/Logo.png';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('/Logo.png');
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const w = canvas.width;
        const h = canvas.height;

        // Flood fill from outer edges to isolate outer white background only
        const visited = new Uint8Array(w * h);
        const isBg = new Uint8Array(w * h);
        const queue: number[] = [];

        const isWhite = (idx: number) => {
          const off = idx * 4;
          const r = data[off];
          const g = data[off + 1];
          const b = data[off + 2];
          const brightness = (r + g + b) / 3;
          return brightness > 235;
        };

        // Seed with perimeter pixels
        for (let y = 0; y < h; y++) {
          const left = y * w;
          const right = y * w + (w - 1);
          if (isWhite(left)) { queue.push(left); visited[left] = 1; isBg[left] = 1; }
          if (isWhite(right)) { queue.push(right); visited[right] = 1; isBg[right] = 1; }
        }

        for (let x = 0; x < w; x++) {
          const top = x;
          const bottom = (h - 1) * w + x;
          if (!visited[top] && isWhite(top)) { queue.push(top); visited[top] = 1; isBg[top] = 1; }
          if (!visited[bottom] && isWhite(bottom)) { queue.push(bottom); visited[bottom] = 1; isBg[bottom] = 1; }
        }

        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % w;
          const cy = Math.floor(curr / w);

          const neighbors = [
            cy > 0 ? curr - w : -1,
            cy < h - 1 ? curr + w : -1,
            cx > 0 ? curr - 1 : -1,
            cx < w - 1 ? curr + 1 : -1
          ];

          for (const n of neighbors) {
            if (n >= 0 && !visited[n]) {
              visited[n] = 1;
              if (isWhite(n)) {
                isBg[n] = 1;
                queue.push(n);
              }
            }
          }
        }

        // Apply alpha masking to background
        for (let i = 0; i < isBg.length; i++) {
          if (isBg[i] === 1) {
            const off = i * 4;
            const brightness = (data[off] + data[off + 1] + data[off + 2]) / 3;
            if (brightness >= 248) {
              data[off + 3] = 0;
            } else {
              const alpha = Math.max(0, Math.min(255, (255 - brightness) * 18));
              data[off + 3] = alpha;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        transparentLogoCache = canvas.toDataURL('image/png');
        resolve(transparentLogoCache);
      } catch {
        resolve('/Logo.png');
      }
    };
    img.onerror = () => {
      resolve('/Logo.png');
    };
  });
}

// ----------------------------------------------------------------------------
// TACTICAL BOARD IMAGE STORAGE & COMPRESSION UTILITIES
// ----------------------------------------------------------------------------

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Converts a base64 / Data URL to a compressed WebP (or PNG fallback) Blob
 */
export async function dataUrlToWebpBlob(
  dataUrl: string, 
  quality: number = 0.88
): Promise<Blob> {
  if (typeof window === 'undefined') {
    // Node / Server environment fallback
    const byteString = atob(dataUrl.split(',')[1] || '');
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  return new Promise((resolve) => {
    let resolved = false;
    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        fetch(dataUrl).then(r => r.blob()).then(resolve).catch(() => resolve(new Blob()));
      }
    }, 2000);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;
    img.onload = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutTimer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 720;
        canvas.height = img.naturalHeight || img.height || 500;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Direct fallback from fetch
          fetch(dataUrl).then(r => r.blob()).then(resolve).catch(() => resolve(new Blob()));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to PNG blob if webp failed
            canvas.toBlob((pngBlob) => {
              resolve(pngBlob || new Blob());
            }, 'image/png');
          }
        }, 'image/webp', quality);
      } catch {
        fetch(dataUrl).then(r => r.blob()).then(resolve).catch(() => resolve(new Blob()));
      }
    };
    img.onerror = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutTimer);
      fetch(dataUrl).then(r => r.blob()).then(resolve).catch(() => resolve(new Blob()));
    };
  });
}

/**
 * Uploads a tactical board image to Firebase Storage under /exercises/{exerciseId}/tactics.webp
 * and returns the public HTTPS download URL with a strict timeout so saving never hangs.
 */
export async function uploadTacticsImageToStorage(
  exerciseId: string, 
  imageSource: string | Blob
): Promise<string> {
  if (!exerciseId) {
    throw new Error('Exercise ID is required for storage upload');
  }

  const uploadTask = async (): Promise<string> => {
    let blob: Blob;
    if (typeof imageSource === 'string') {
      if (imageSource.startsWith('data:image')) {
        blob = await dataUrlToWebpBlob(imageSource);
      } else if (imageSource.startsWith('http')) {
        // Already an HTTP URL, no upload needed
        return imageSource;
      } else {
        throw new Error('Invalid image source string');
      }
    } else {
      blob = imageSource;
    }

    const isWebp = blob.type === 'image/webp';
    const fileExt = isWebp ? 'webp' : 'png';
    const storagePath = `exercises/${exerciseId}/tactics.${fileExt}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, blob, {
      contentType: blob.type || (isWebp ? 'image/webp' : 'image/png'),
      cacheControl: 'public, max-age=31536000' // Cache for 1 year
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  };

  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('Firebase Storage upload timed out after 3.5s')), 3500)
  );

  return Promise.race([uploadTask(), timeoutPromise]);
}

// In-memory cache for remote image data URLs to speed up PDF generation & avoid re-fetching
const remoteImageDataUrlCache = new Map<string, string>();

/**
 * Asynchronously loads an image from an HTTPS URL (or Data URL) and returns a Data URL string.
 * This ensures jsPDF can embed the image synchronously without network delay errors.
 */
export async function loadImageAsDataUrl(urlOrDataUrl?: string): Promise<string> {
  if (!urlOrDataUrl) return '';
  if (urlOrDataUrl.startsWith('data:image')) return urlOrDataUrl;
  if (remoteImageDataUrlCache.has(urlOrDataUrl)) {
    return remoteImageDataUrlCache.get(urlOrDataUrl)!;
  }

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(urlOrDataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = urlOrDataUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(urlOrDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        remoteImageDataUrlCache.set(urlOrDataUrl, dataUrl);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Could not convert remote image to data URL:', err);
        resolve(urlOrDataUrl);
      }
    };
    img.onerror = () => {
      console.warn('Failed to load image from URL:', urlOrDataUrl);
      resolve('');
    };
  });
}

