import { useState, useEffect, useCallback } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type { LibraryItem } from "../types";
import { ANIMATED_EXTENSIONS } from "../constants";

export const Thumbnail = ({ item, className, onLoad }: { item: LibraryItem; className?: string; onLoad?: () => void }) => {
  const [src, setSrc] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const fileRel = item.file_rel;
  const fallbackUrl = item.url;
  const ext = (item.ext || "").toLowerCase();

  useEffect(() => {
    let active = true;
    setSrc("");
    setLoaded(false);

    if (ANIMATED_EXTENSIONS.includes(ext)) {
      setSrc(fallbackUrl);
      return;
    }

    const fetchThumb = async () => {
      try {
        const thumbPath = await invoke<string>("ensure_thumbnail", { fileRel });
        if (active) {
          setSrc(thumbPath ? convertFileSrc(thumbPath) : fallbackUrl);
        }
      } catch {
        if (active) setSrc(fallbackUrl);
      }
    };
    fetchThumb();
    return () => { active = false; };
  }, [fileRel, fallbackUrl, ext]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  return (
    <div className="relative">
      {/* Skeleton shown until image is fully loaded */}
      {!loaded && (
        <div className={`${className} aspect-square animate-pulse bg-gray-700 rounded`} />
      )}
      {src && (
        <img
          src={src}
          className={`${className} ${loaded ? "" : "absolute inset-0 opacity-0"}`}
          loading="lazy"
          alt=""
          onLoad={handleLoad}
        />
      )}
    </div>
  );
};
