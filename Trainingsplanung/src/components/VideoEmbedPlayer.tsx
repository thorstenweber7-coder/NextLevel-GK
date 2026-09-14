import React, { useState } from 'react';
import { Video, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export function getEmbedUrl(url?: string): { type: 'youtube' | 'vimeo' | 'direct' | 'unsupported'; embedUrl: string } | null {
  if (!url || !url.trim()) return null;
  const cleanUrl = url.trim();

  // YouTube
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&enablejsapi=1`
    };
  }

  // Vimeo
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}`
    };
  }

  // Direct video (mp4, webm, ogg)
  if (/\.(mp4|webm|ogg)($|\?)/i.test(cleanUrl)) {
    return {
      type: 'direct',
      embedUrl: cleanUrl
    };
  }

  return {
    type: 'unsupported',
    embedUrl: cleanUrl
  };
}

interface VideoEmbedPlayerProps {
  url?: string;
  title?: string;
  className?: string;
}

export const VideoEmbedPlayer: React.FC<VideoEmbedPlayerProps> = ({
  url,
  title = 'Übungsvideo',
  className
}) => {
  const [hasError, setHasError] = useState<boolean>(false);
  const embedInfo = getEmbedUrl(url);

  if (!embedInfo) return null;

  if (embedInfo.type === 'direct') {
    return (
      <div className={cn("relative rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md", className)}>
        <video 
          controls 
          className="w-full h-full max-h-[360px] object-contain"
          preload="metadata"
        >
          <source src={embedInfo.embedUrl} />
          Dein Browser unterstützt dieses Videoformat leider nicht.
        </video>
      </div>
    );
  }

  if (embedInfo.type === 'youtube' || embedInfo.type === 'vimeo') {
    return (
      <div className={cn("relative rounded-xl overflow-hidden bg-black border border-slate-800 shadow-lg aspect-video", className)}>
        <iframe
          src={embedInfo.embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={() => setHasError(true)}
          className="w-full h-full border-0"
        />
        {hasError && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-300">
            <AlertCircle className="w-6 h-6 text-amber-400 mb-1.5" />
            <span>Video konnte nicht direkt eingebettet werden.</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sky-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Auf externer Plattform öffnen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    );
  }

  // Fallback for unsupported video links
  return (
    <div className={cn("p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs", className)}>
      <div className="flex items-center gap-2 text-slate-300 min-w-0">
        <Video className="w-4 h-4 text-rose-400 flex-shrink-0" />
        <span className="truncate font-medium">{url}</span>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1 text-[11px] flex-shrink-0 transition shadow cursor-pointer"
      >
        <span>Video öffnen</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
};
