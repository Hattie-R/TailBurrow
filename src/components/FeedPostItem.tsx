import React from "react";
import { Star, Loader2, Database } from "lucide-react";
import type { E621Post } from "../types";
import { ARTIST_DENY_LIST } from "../constants";

export const FeedPostItem = React.memo(({ post, feedId, downloaded, busy, onFavorite, onSelect }: {
  post: E621Post;
  feedId: number;
  downloaded: boolean;
  busy: boolean;
  onFavorite: (feedId: number, post: E621Post) => void;
  onSelect?: (post: E621Post) => void;
}) => {
  const isRemoteFav = post.is_favorited;
  const imageUrl = post.sample.url || post.file.url || post.preview.url;
  const artists = post.tags.artist.filter(a => !ARTIST_DENY_LIST.includes(a));
  const w = post.sample.width || post.file.width || 1;
  const h = post.sample.height || post.file.height || 1;

  return (
    <div
      className="relative group cursor-pointer bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-all"
      onClick={() => onSelect?.(post)}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            className="w-full object-cover"
            style={{ aspectRatio: `${w} / ${h}` }}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(feedId, post); }}
            disabled={busy}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition z-20 ${isRemoteFav ? "bg-yellow-500 text-yellow-900" : "bg-black/60 text-gray-300 hover:bg-black/80"} ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${isRemoteFav ? "fill-current" : ""}`} />}
          </button>
        </>
      ) : (
        <div className="w-full h-48 flex items-center justify-center bg-gray-800">
          <p className="text-gray-500 text-sm">No image</p>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
        {downloaded && (
          <div className="absolute top-2 left-2 bg-green-500/80 text-white p-1.5 rounded-full">
            <Database className="w-3.5 h-3.5" />
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-white text-sm font-medium truncate">
            {artists.length > 0 ? artists.slice(0, 2).join(", ") : "Unknown"}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-300 border-t border-white/20 pt-1">
          <span>⭐ {post.fav_count} • Score: {post.score.total}</span>
          <span className={`font-bold uppercase ${post.rating === 'e' ? 'text-red-400' : post.rating === 'q' ? 'text-yellow-400' : 'text-green-400'}`}>
            {post.rating || 'S'}
          </span>
        </div>
      </div>
    </div>
  );
});
