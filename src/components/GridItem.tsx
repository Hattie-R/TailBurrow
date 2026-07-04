import React, { useRef, useEffect, useCallback } from "react";
import { Play } from "lucide-react";
import type { LibraryItem } from "../types";
import { VIDEO_EXTENSIONS } from "../constants";
import { getDisplayArtists } from "../helpers";
import { Thumbnail } from "./Thumbnail";

export const GridItem = React.memo(({ item, index, onSelect, isSelected, isMultiSelected, onMultiClick }: {
  item: LibraryItem;
  index: number;
  onSelect: (index: number) => void;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  onMultiClick?: (index: number, e: React.MouseEvent) => void;
}) => {
  const isVid = VIDEO_EXTENSIONS.includes((item.ext || "").toLowerCase());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      const video = videoRef.current;
      if (video && !video.paused) {
        video.pause();
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    hoverTimeoutRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }, 120);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const video = videoRef.current;
    if (video && !video.paused) {
      video.pause();
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      onMultiClick?.(index, e);
    } else {
      onSelect(index);
    }
  }, [index, onSelect, onMultiClick]);

  return (
    <div
      onClick={handleClick}
      className={`relative group cursor-pointer bg-gray-800 rounded-lg overflow-hidden transition-all ${
        isMultiSelected
          ? 'ring-2 ring-yellow-400 border border-yellow-400'
          : isSelected
          ? 'ring-2 ring-purple-500 border border-purple-500'
          : 'border border-gray-700 hover:border-purple-500'
      }`}
    >
      {/* Selection checkbox */}
      {isMultiSelected !== undefined && (
        <div
          className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isMultiSelected
              ? 'bg-yellow-400 border-yellow-400'
              : 'border-white/30 bg-black/30 opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
              e.stopPropagation();
              onMultiClick?.(index, {
                  ctrlKey: true,
                  metaKey: false,
                  shiftKey: false,
                  preventDefault: () => {},
                  stopPropagation: () => {},
              } as unknown as React.MouseEvent);
          }}
        >
          {isMultiSelected && (
            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {isVid ? (
        <div className="relative">
          <video
            ref={videoRef}
            src={item.url}
            className="w-full h-auto object-cover max-h-[600px]"
            muted
            loop
            preload="metadata"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
          <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full">
            <Play className="w-3 h-3 text-white" />
          </div>
        </div>
      ) : (
        <Thumbnail item={item} className="w-full h-auto object-cover max-h-[600px]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
            item.source === 'e621' ? 'bg-blue-600'
              : item.source === 'local' ? 'bg-emerald-600'
              : 'bg-orange-600'
          }`}>
            {item.source === 'e621' ? 'E6' : item.source === 'local' ? 'LC' : 'FA'}
          </span>
          <span className="text-white text-sm font-medium truncate">
            {getDisplayArtists(item)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-300 border-t border-white/20 pt-1">
          <span>⭐ {item.fav_count || 0}</span>
          <span className={`font-bold uppercase ${item.rating === 'e' ? 'text-red-400' : item.rating === 'q' ? 'text-yellow-400' : 'text-green-400'}`}>
            {item.rating || 'S'}
          </span>
        </div>
      </div>
    </div>
  );
});
