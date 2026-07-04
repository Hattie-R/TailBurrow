import React from "react";
import {
  ArrowLeft, BookOpen, ChevronsDown, Loader2, Pause,
  Trash2, ZoomIn, ZoomOut,
} from "lucide-react";
import Masonry from "react-masonry-css";
import type { PoolInfo, PoolPost } from "../types";
import { PoolCover } from "./PoolCover";
import { ComicPage } from "./ComicPage";

interface ComicsPanelProps {
  activeTab: string;
  selectedPool: PoolInfo | null;
  pools: PoolInfo[];
  poolsLoading: boolean;
  poolPosts: PoolPost[];
  poolPostsLoading: boolean;
  filteredPools: PoolInfo[];
  comicScale: number;
  comicAutoscroll: boolean;
  comicAutoscrollSpeed: number;
  poolScanProgress: { current: number; total: number } | null;

  setComicScale: (v: number | ((prev: number) => number)) => void;
  setComicAutoscroll: (v: boolean) => void;
  setComicAutoscrollSpeed: (v: number) => void;

  loadPools: () => Promise<void>;
  openPool: (pool: PoolInfo) => Promise<void>;
  closePool: () => void;
  handleClearPoolsCache: () => void;

  comicContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function ComicsPanel({
  activeTab, selectedPool, pools, poolsLoading, poolPosts, poolPostsLoading,
  filteredPools, comicScale, comicAutoscroll, comicAutoscrollSpeed, poolScanProgress,
  setComicScale, setComicAutoscroll, setComicAutoscrollSpeed,
  loadPools, openPool, closePool, handleClearPoolsCache,
  comicContainerRef,
}: ComicsPanelProps) {
  if (activeTab !== 'comics') return null;

  return (
    <div className="flex-1 overflow-hidden flex flex-col w-full min-w-0 bg-[#0f0f17]">
      {selectedPool ? (
        // Comic reader view
        <div className="flex-1 relative overflow-hidden flex flex-col w-full min-w-0">
          {/* Floating Header */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 pointer-events-none flex justify-between items-start">
            <div className="pointer-events-auto flex items-center gap-3 p-2.5 pr-5 rounded-2xl backdrop-blur-md border shadow-xl bg-[#161621]/80 border-[#1d1b2d]">
              <button onClick={closePool} className="p-2 rounded-xl transition-colors hover:bg-[#1d1b2d] text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-bold text-sm tracking-wide text-white drop-shadow-md">{selectedPool.name}</h2>
                <p className="text-xs font-medium drop-shadow-md text-[#9e98aa]">
                  Pool #{selectedPool.pool_id} • {poolPosts.filter(p => p.item_id !== 0).length} local • {poolPosts.length} total
                </p>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-2 p-2 rounded-2xl backdrop-blur-md border shadow-xl bg-[#161621]/80 border-[#1d1b2d]">
              <button onClick={() => setComicScale(s => Math.max(10, s - 10))} className="p-2 rounded-xl text-white hover:bg-[#1d1b2d]"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-sm font-medium w-12 text-center text-white drop-shadow-md">{comicScale}%</span>
              <button onClick={() => setComicScale(s => Math.min(100, s + 10))} className="p-2 rounded-xl text-white hover:bg-[#1d1b2d]"><ZoomIn className="w-4 h-4" /></button>
              <div className="w-px h-6 bg-gray-500/50 mx-1" />
              <button onClick={() => setComicAutoscroll(!comicAutoscroll)} className={`p-2 rounded-xl flex items-center gap-1.5 transition-colors text-white ${comicAutoscroll ? 'bg-[#967abc]' : 'hover:bg-[#1d1b2d]'}`}>
                {comicAutoscroll ? <Pause className="w-4 h-4" /> : <ChevronsDown className="w-4 h-4" />}
              </button>
              {comicAutoscroll && (
                <input type="range" min="0.5" max="5" step="0.5" value={comicAutoscrollSpeed}
                  onChange={(e) => setComicAutoscrollSpeed(Number(e.target.value))}
                  className="w-20 cursor-pointer mr-2 accent-[#967abc]" />
              )}
            </div>
          </div>

          {/* Comic pages */}
          <div ref={comicContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0">
            {poolPostsLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#967abc]" /></div>
            ) : poolPosts.length === 0 ? (
              <div className="text-center py-20 text-[#4c4b5a]">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No pages from this pool in your library</p>
                <p className="text-sm mt-2">Favorite more posts from this pool on e621</p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 w-full min-w-0 px-0" style={{ gap: '2px' }}>
                {poolPosts.map((post) => (
                  <ComicPage key={`${post.source_id}-${post.position}`} post={post} comicScale={comicScale} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Pool grid view
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 w-full min-w-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold flex-shrink-0">Comics & Pools</h2>

            <div className="flex gap-2 flex-shrink-0">
              {pools.length > 0 && !poolsLoading && (
                <button onClick={handleClearPoolsCache} className="p-2 rounded-xl transition-colors bg-[#1d1b2d] hover:bg-red-900/50 text-[#9e98aa] hover:text-red-400" title="Clear Cache"><Trash2 className="w-5 h-5" /></button>
              )}
              <button onClick={loadPools} disabled={poolsLoading}
                className="relative overflow-hidden flex items-center justify-center min-w-[40px] px-3 py-2 rounded-xl transition-colors bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#9e98aa]"
                title="Scan Favorites for Pools">
                {poolsLoading && poolScanProgress ? (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-300 bg-[#967abc]" style={{ width: `${(poolScanProgress.current / poolScanProgress.total) * 100}%` }} />
                    <span className="relative z-10 text-xs font-mono font-medium flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />{poolScanProgress.current} / {poolScanProgress.total} unscanned</span>
                  </>
                ) : poolsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8V3"/><path d="M21 3v5h-5"/></svg>
                )}
              </button>
            </div>
          </div>

          {filteredPools.length === 0 && !poolsLoading ? (
            <div className="text-center py-20 text-[#4c4b5a]">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl mb-2">Comics & Pools</p>
              <p className="text-sm mb-6">Scan your e621 favorites to find pools (comics, series, etc.)</p>
              <button onClick={loadPools} className="px-6 py-3 rounded-xl text-white font-medium flex items-center gap-2 mx-auto bg-[#967abc] hover:bg-[#967abc]/80">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8V3"/><path d="M21 3v5h-5"/></svg>
                Start Scan
              </button>
            </div>
          ) : filteredPools.length === 0 && poolsLoading ? (
            <div className="text-center py-20 text-[#4c4b5a]">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-10 animate-pulse" />
              <p>Looking for comics...</p>
            </div>
          ) : (
            <Masonry breakpointCols={{ default: 5, 1400: 4, 1000: 3, 700: 2, 500: 1 }} className="flex w-auto gap-3" columnClassName="flex flex-col gap-3">
              {filteredPools.map((pool) => (
                <div key={pool.pool_id} onClick={() => openPool(pool)} className="group cursor-pointer rounded-lg overflow-hidden border transition-all bg-[#161621] border-[#1d1b2d] hover:border-[#967abc]">
                  <PoolCover pool={pool} />
                  <div className="p-3 bg-[#161621]">
                    <h3 className="font-medium text-sm truncate">{pool.name}</h3>
                    <p className="text-xs mt-1 text-[#4c4b5a]">{pool.post_count} pages</p>
                  </div>
                </div>
              ))}
            </Masonry>
          )}
        </div>
      )}
    </div>
  );
}