import { useState, useEffect } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { Loader2, Database } from "lucide-react";
import type { PoolPost as PoolPostType } from "../types";

export const ComicPage = ({ post, comicScale }: {
  post: PoolPostType; comicScale: number;
}) => {
  const isVideo = ['mp4', 'webm'].includes(post.ext.toLowerCase());
  const isLocal = post.item_id !== 0;
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc('');
    setLoading(true);
    setError(false);

    if (isLocal) {
      setSrc(convertFileSrc(post.file_abs));
      setLoading(false);
      return;
    }

    // Remote content — proxy videos through backend, images load directly
    if (isVideo) {
      invoke<string>("proxy_remote_media", { url: post.file_abs })
        .then(localPath => {
          if (!cancelled) {
            setSrc(convertFileSrc(localPath));
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
        });
    } else {
      setSrc(post.file_abs);
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [post.file_abs, post.item_id, isLocal, isVideo]);

  return (
    <div style={{ width: `${comicScale}%` }} className="relative group max-w-full overflow-hidden">
      {isLocal && (
        <div className="absolute top-2 left-2 z-10 bg-green-500/80 text-white p-1.5 rounded-full pointer-events-none">
          <Database className="w-3.5 h-3.5" />
        </div>
      )}
      {loading ? (
        <div
          className="w-full max-w-full aspect-video flex items-center justify-center"
          style={{ backgroundColor: '#0a0a12' }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      ) : error ? (
        <div
          className="w-full aspect-video flex flex-col items-center justify-center gap-2 text-gray-500"
          style={{ backgroundColor: '#0a0a12' }}
        >
          <p className="text-sm">Failed to load video</p>
          <button
            onClick={() => {
              try {
                const url = `https://e621.net/posts/${post.source_id}`;
                openUrl(url);
              } catch { /* ignore */ }
            }}
            className={`text-xs px-3 py-1.5 rounded-lg bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#967abc]`}
          >
            View on e621
          </button>
        </div>
      ) : isVideo ? (
        <video
          key={src}
          src={src}
          controls
          playsInline
          preload="auto"
          className="w-full h-auto max-w-full"
          style={{ backgroundColor: '#0a0a12'}}
        />
      ) : (
        <img
          src={src}
          alt={`Page ${post.position + 1}`}
          className="w-full h-auto block max-w-full"
          loading="lazy"
          style={{ backgroundColor: '#0a0a12' }}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
};
