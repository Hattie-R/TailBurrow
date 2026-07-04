import React from "react";
import { createPortal } from "react-dom";
import {
  Search, Rss, Plus, Pencil, Star, Loader2, ChevronLeft,
  ChevronRight, Volume2, VolumeX, Clock, Maximize, Tag, X,
} from "lucide-react";
import Masonry from "react-masonry-css";
import type { Feed, FeedPagingState, E621Post, E621CredInfo } from "../types";
import { ARTIST_DENY_LIST } from "../constants";
import { getSocialMediaName } from "../helpers";
import { TagSection } from "./TagSection";
import { ResizeHandle } from "./ResizeHandle";
import { SkeletonFeedPost } from "./Skeleton";
import { FeedPostItem } from "./FeedPostItem";
import { InfiniteSentinel } from "./InfiniteSentinel";

interface FeedDragState { id: number; ghostX: number; ghostY: number; ghostWidth: number; ghostHeight: number; ghostLabel: string; insertIndex: number; }
interface FeedsPanelProps {
  feeds: Feed[];
  feedPosts: Record<number, E621Post[]>;
  loadingFeeds: Record<number, boolean>;
  feedPaging: Record<number, FeedPagingState>;
  selectedFeedId: number | null;
  feedSearchInput: string;
  feedSearchResults: E621Post[];
  feedSearchLoading: boolean;
  feedDetailOpen: boolean;
  feedDetailWidth: number;
  selectedFeedPost: E621Post | null;
  feedPostIndex: number;
  feedSlideshow: boolean;
  feedFadeIn: boolean;
  feedImageLoading: boolean;
  feedViewerOverlay: boolean;
  showSpeedSlider: boolean;
  feedActionBusy: Record<number, boolean>;
  gridColumns: number;
  slideshowSpeed: number;
  autoMuteVideos: boolean;
  waitForVideoEnd: boolean;
  globalMute: boolean;
  e621CredInfo: E621CredInfo;
  downloadedE621Ids: Set<number>;
  feedDrag: FeedDragState | null;
  showAddFeedModal: boolean;
  newFeedName: string;
  newFeedQuery: string;
  editingFeedId: number | null;
  setFeedSearchInput: (v: string) => void;
  setFeedSearchResults: (v: E621Post[] | ((prev: E621Post[]) => E621Post[])) => void;
  setSelectedFeedId: (v: number | null) => void;
  setFeedDetailOpen: (v: boolean) => void;
  setFeedDetailWidth: (v: number | ((prev: number) => number)) => void;
  setSelectedFeedPost: (v: E621Post | null) => void;
  setFeedPostIndex: (v: number | ((prev: number) => number)) => void;
  setFeedSlideshow: (v: boolean) => void;
  setFeedFadeIn: (v: boolean) => void;
  setFeedImageLoading: (v: boolean) => void;
  setFeedViewerOverlay: (v: boolean) => void;
  setShowSpeedSlider: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowAddFeedModal: (v: boolean) => void;
  setNewFeedName: (v: string) => void;
  setNewFeedQuery: (v: string) => void;
  setEditingFeedId: (v: number | null) => void;
  setFeedDrag: (v: FeedDragState | null) => void;
  fetchFeedPosts: (feedId: number, query: string, opts?: { reset?: boolean }) => Promise<void>;
  searchFeedPosts: (query: string) => Promise<void>;
  removeFeed: (feedId: number) => void;
  saveFeeds: (feeds: Feed[]) => void;
  ensureFavorite: (feedId: number, post: E621Post) => Promise<void>;
  goToPrevFeedPost: () => void;
  goToNextFeedPost: () => void;
  openExternalUrl: (url: string) => void;
  feedsContainerRef: React.RefObject<HTMLDivElement | null>;
  feedPillRefs: React.MutableRefObject<Map<number, HTMLElement>>;
  speedSliderRef: React.RefObject<HTMLDivElement | null>;
  feedDetailVideoRef: React.RefObject<HTMLVideoElement | null>;
  feedFullscreenVideoRef: React.RefObject<HTMLVideoElement | null>;
  savedFeedVideoTimeRef: React.MutableRefObject<number>;
  feedDragStartRef: React.MutableRefObject<{ x: number; y: number; id: number; index: number } | null>;
  feedDragRef: React.MutableRefObject<FeedDragState | null>;
  feedDragCleanupRef: React.MutableRefObject<(() => void) | null>;
  setSlideshowSpeed: (v: number | ((prev: number) => number)) => void;
  toast: (msg: string, type: 'info' | 'error' | 'success') => void;
  setAutoMuteVideos: React.Dispatch<React.SetStateAction<boolean>>;
  setWaitForVideoEnd: React.Dispatch<React.SetStateAction<boolean>>;
}

export function FeedsPanel({
  feeds, feedPosts, loadingFeeds, feedPaging, selectedFeedId,
  feedSearchInput, feedSearchResults, feedSearchLoading,
  feedDetailOpen, feedDetailWidth, selectedFeedPost,
  feedSlideshow, feedFadeIn, feedImageLoading, feedViewerOverlay,
  showSpeedSlider, feedActionBusy, gridColumns, slideshowSpeed, setSlideshowSpeed,
  setAutoMuteVideos, setWaitForVideoEnd, autoMuteVideos, waitForVideoEnd, globalMute,
  e621CredInfo, downloadedE621Ids, feedDrag,
  showAddFeedModal, newFeedName, newFeedQuery, editingFeedId,
  setFeedSearchInput, setFeedSearchResults, setSelectedFeedId,
  setFeedDetailOpen, setFeedDetailWidth, setSelectedFeedPost,
  setFeedPostIndex, setFeedImageLoading,
  setFeedViewerOverlay, setShowSpeedSlider,
  setShowAddFeedModal, setNewFeedName, setNewFeedQuery, setEditingFeedId,
  setFeedDrag,
  fetchFeedPosts, searchFeedPosts, removeFeed, saveFeeds, ensureFavorite,
  goToPrevFeedPost, goToNextFeedPost, openExternalUrl,
  feedsContainerRef, feedPillRefs, speedSliderRef,
  feedDetailVideoRef, savedFeedVideoTimeRef,
  feedDragStartRef, feedDragRef, feedDragCleanupRef,
  toast,
}: FeedsPanelProps) {

  return (
    <div ref={feedsContainerRef} className="flex-1 flex overflow-hidden bg-[#0f0f17]">
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4">
          <div className="flex justify-center items-center gap-2 mb-4 flex-wrap relative">
            {feeds.map((feed, index) => {
              const isActive = selectedFeedId === feed.id && !feedSearchInput;
              const isDragging = feedDrag?.id === feed.id;
              const insertBefore = feedDrag && feedDrag.id !== feed.id && feedDrag.insertIndex === index;
              const insertAfter = feedDrag && feedDrag.id !== feed.id && feedDrag.insertIndex === index + 1 && index === feeds.length - 1;
              return (
                <div key={feed.id} className="flex items-center" style={{ transition: isDragging ? 'none' : 'all 200ms ease' }}>
                  <div className={`transition-all duration-200 ease-out rounded-full ${insertBefore ? 'w-1 h-8 bg-[#967abc] mx-1' : 'w-0 h-8 mx-0'}`} />
                  <button
                    ref={(el) => { if (el) feedPillRefs.current.set(feed.id, el); else feedPillRefs.current.delete(feed.id); }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      feedDragStartRef.current = { x: e.clientX, y: e.clientY, id: feed.id, index };
                      const el = e.currentTarget;
                      const onMove = (ev: PointerEvent) => {
                        const start = feedDragStartRef.current;
                        if (!start) return;
                        const dx = Math.abs(ev.clientX - start.x);
                        const dy = Math.abs(ev.clientY - start.y);
                        if (!feedDrag && dx < 5 && dy < 5) return;
                        const rect = el.getBoundingClientRect();
                        let insertIdx = start.index;
                        const pills = feeds.map((f, i) => {
                          const pillEl = feedPillRefs.current.get(f.id);
                          if (!pillEl || f.id === start.id) return null;
                          const r = pillEl.getBoundingClientRect();
                          return { index: i, cx: r.left + r.width / 2 };
                        }).filter(Boolean) as { index: number; cx: number }[];
                        if (pills.length > 0) {
                          if (ev.clientX <= pills[0].cx) insertIdx = pills[0].index;
                          else if (ev.clientX >= pills[pills.length - 1].cx) insertIdx = pills[pills.length - 1].index + 1;
                          else { for (let i = 0; i < pills.length - 1; i++) { if (ev.clientX >= pills[i].cx && ev.clientX < pills[i + 1].cx) { insertIdx = pills[i + 1].index; break; } } }
                        }
                        setFeedDrag({ id: start.id, ghostX: ev.clientX, ghostY: ev.clientY, ghostWidth: rect.width, ghostHeight: rect.height, ghostLabel: feed.name, insertIndex: insertIdx });
                      };
                      const onUp = () => {
                        document.removeEventListener('pointermove', onMove);
                        document.removeEventListener('pointerup', onUp);
                        feedDragCleanupRef.current = null;
                        const start = feedDragStartRef.current;
                        const drag = feedDragRef.current;
                        if (start && drag) {
                          const fromIdx = feeds.findIndex(f => f.id === start.id);
                          let toIdx = drag.insertIndex;
                          if (fromIdx !== -1 && toIdx !== fromIdx) {
                            const reordered = [...feeds];
                            const [moved] = reordered.splice(fromIdx, 1);
                            if (toIdx > fromIdx) toIdx--;
                            reordered.splice(toIdx, 0, moved);
                            saveFeeds(reordered);
                          }
                        } else if (start && !drag) {
                          if (isActive) { fetchFeedPosts(feed.id, feed.query, { reset: true }); }
                          else { setFeedSearchInput(''); setFeedSearchResults([]); setSelectedFeedId(feed.id); if (!feedPosts[feed.id] || feedPosts[feed.id].length === 0) fetchFeedPosts(feed.id, feed.query, { reset: true }); }
                        }
                        feedDragStartRef.current = null;
                        setFeedDrag(null);
                      };
                      feedDragCleanupRef.current = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
                      document.addEventListener('pointermove', onMove);
                      document.addEventListener('pointerup', onUp);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all group select-none touch-none ${isDragging ? 'opacity-30 scale-95' : isActive ? 'bg-[#967abc] text-white shadow-lg' : 'bg-[#1c1b26] text-[#9e98aa] hover:bg-[#1d1b2d]'}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="pointer-events-none">{feed.name}</span>
                      {isActive && loadingFeeds[feed.id] && <Loader2 className="w-3 h-3 animate-spin pointer-events-none" />}
                      <span onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setNewFeedName(feed.name); setNewFeedQuery(feed.query); setEditingFeedId(feed.id); setShowAddFeedModal(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/20 rounded pointer-events-auto"><Pencil className="w-3 h-3" /></span>
                    </span>
                  </button>
                  {insertAfter && <div className="transition-all duration-200 ease-out rounded-full w-1 h-8 bg-[#967abc] mx-1" />}
                </div>
              );
            })}
            <button onClick={() => { setEditingFeedId(null); setNewFeedName(''); setNewFeedQuery(''); setShowAddFeedModal(true); }} className="p-2 rounded-full text-sm transition-all bg-[#1c1b26] text-[#9e98aa] hover:bg-[#1d1b2d]"><Plus className="w-4 h-4" /></button>
          </div>

          {feedDrag && createPortal(
            <div className="fixed z-[9999] pointer-events-none px-4 py-2 rounded-full text-sm font-medium shadow-2xl bg-[#967abc] text-white"
              style={{ left: feedDrag.ghostX - feedDrag.ghostWidth / 2, top: feedDrag.ghostY - feedDrag.ghostHeight / 2, width: feedDrag.ghostWidth, height: feedDrag.ghostHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(1.08)', transition: 'transform 100ms ease' }}>
              {feedDrag.ghostLabel}
            </div>,
            document.body
          )}

          {feedSearchInput && !feedSearchLoading && feedSearchResults.length === 0 ? (
            <div className="text-center py-20 text-[#4c4b5a]"><Search className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No results found</p></div>
          ) : feedSearchInput || feedSearchLoading ? (
            feedSearchLoading ? (
              <Masonry breakpointCols={{ default: feedDetailOpen && selectedFeedPost ? Math.max(2, gridColumns - 2) : gridColumns, 700: 2, 500: 1 }} className="flex w-auto gap-3" columnClassName="flex flex-col gap-3">
                {Array.from({ length: gridColumns * 2 }).map((_, i) => (<SkeletonFeedPost key={`search-skeleton-${i}`} index={i} dark={true} />))}
              </Masonry>
            ) : (
              <Masonry breakpointCols={{ default: feedDetailOpen && selectedFeedPost ? Math.max(2, gridColumns - 2) : gridColumns, 700: 2, 500: 1 }} className="flex w-auto gap-3" columnClassName="flex flex-col gap-3">
                {feedSearchResults.map((post) => (
                  <FeedPostItem key={post.id} post={post} feedId={-1} downloaded={downloadedE621Ids.has(post.id)} busy={!!feedActionBusy[post.id]} onFavorite={ensureFavorite}
                    onSelect={(p) => { const idx = feedSearchResults.findIndex(fp => fp.id === p.id); setFeedPostIndex(idx >= 0 ? idx : 0); setSelectedFeedPost(p); setFeedDetailOpen(true); }} />
                ))}
              </Masonry>
            )
          ) : selectedFeedId && feeds.find(f => f.id === selectedFeedId) ? (
            (() => {
              const feed = feeds.find(f => f.id === selectedFeedId)!;
              return feedPosts[feed.id] && feedPosts[feed.id].length > 0 ? (
                <>
                  <Masonry breakpointCols={{ default: feedDetailOpen && selectedFeedPost ? Math.max(2, gridColumns - 2) : gridColumns, 700: 2, 500: 1 }} className="flex w-auto gap-3" columnClassName="flex flex-col gap-3">
                    {feedPosts[feed.id].map((post) => (
                      <FeedPostItem key={post.id} post={post} feedId={feed.id} downloaded={downloadedE621Ids.has(post.id)} busy={!!feedActionBusy[post.id]} onFavorite={ensureFavorite}
                        onSelect={(p) => { const idx = (feedPosts[feed.id] || []).findIndex(fp => fp.id === p.id); setFeedPostIndex(idx >= 0 ? idx : 0); setSelectedFeedPost(p); setFeedDetailOpen(true); }} />
                    ))}
                  </Masonry>
                  <InfiniteSentinel disabled={!e621CredInfo.username || !e621CredInfo.has_api_key || !!loadingFeeds[feed.id] || !!feedPaging[feed.id]?.done} onVisible={() => fetchFeedPosts(feed.id, feed.query)} />
                  {feedPaging[feed.id]?.done && <div className="text-center text-sm py-4 text-[#4c4b5a]">End of results</div>}
                </>
              ) : loadingFeeds[feed.id] ? (
                <Masonry breakpointCols={{ default: feedDetailOpen && selectedFeedPost ? Math.max(2, gridColumns - 2) : gridColumns, 700: 2, 500: 1 }} className="flex w-auto gap-3" columnClassName="flex flex-col gap-3">
                  {Array.from({ length: gridColumns * 2 }).map((_, i) => (<SkeletonFeedPost key={`feed-skeleton-${i}`} index={i} dark={true} />))}
                </Masonry>
              ) : (<div className="text-center py-20 italic text-[#4c4b5a]">"Nobody here but us dergs"</div>);
            })()
          ) : (
            <div className="text-center py-20 text-[#4c4b5a]">
              {feeds.length > 0 ? <p className="text-xl mb-2">Select a feed or search above</p> : <><Rss className="w-16 h-16 mx-auto mb-4 opacity-50" /><p className="text-xl">No feeds yet</p><p className="text-sm mt-2">Click the + button above to create one</p></>}
            </div>
          )}
        </div>
      </div>

      {feedDetailOpen && selectedFeedPost && (
        <>
          <ResizeHandle onDrag={(clientX) => {
            if (!feedsContainerRef.current) return;
            const rect = feedsContainerRef.current.getBoundingClientRect();
            const newWidth = Math.max(300, Math.min(rect.right - clientX, rect.width * 0.65));
            setFeedDetailWidth(newWidth);
            localStorage.setItem('feed_detail_width', String(Math.round(newWidth)));
          }} />
          <div style={{ width: feedDetailWidth, maxWidth: '60vw', minWidth: 300 }} className="flex-shrink-0 flex flex-col h-full bg-[#161621] border-l border-[#1d1b2d]">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="relative bg-[#0a0a12] flex items-center justify-center overflow-hidden" style={{ height: 'calc(100vh - 120px)', minHeight: '300px' }}>
                {selectedFeedPost && selectedFeedPost.file.ext !== 'webm' && selectedFeedPost.file.ext !== 'mp4' && (
                  <div className="absolute inset-0 scale-110 blur-3xl opacity-20" style={{ backgroundImage: `url(${selectedFeedPost.sample.url || selectedFeedPost.file.url || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                <button onClick={() => { setFeedDetailOpen(false); setSelectedFeedPost(null); }} className="absolute top-2 right-2 z-20 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
                {feedImageLoading && <div className="absolute inset-0 flex items-center justify-center z-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#967abc]" /></div>}
                {selectedFeedPost.file.ext === 'webm' || selectedFeedPost.file.ext === 'mp4' ? (
                  <video ref={feedDetailVideoRef} key={selectedFeedPost.id} src={selectedFeedPost.file.url || selectedFeedPost.sample.url || ''} controls autoPlay playsInline loop={!waitForVideoEnd || !feedSlideshow}
                    muted={globalMute || autoMuteVideos || feedViewerOverlay}
                    className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${feedFadeIn ? "opacity-100" : "opacity-0"} ${feedViewerOverlay ? 'opacity-0 pointer-events-none' : ''}`}
                    onCanPlay={(e) => { if (feedViewerOverlay) return; if (!globalMute && !autoMuteVideos) (e.target as HTMLVideoElement).volume = 1.0; }}
                    onLoadedMetadata={(e) => { if (savedFeedVideoTimeRef.current > 0) { (e.target as HTMLVideoElement).currentTime = savedFeedVideoTimeRef.current; savedFeedVideoTimeRef.current = 0; } }}
                    onLoadedData={() => setFeedImageLoading(false)} onError={() => setFeedImageLoading(false)}
                    onEnded={() => { if (!feedViewerOverlay && waitForVideoEnd && feedSlideshow) goToNextFeedPost(); }}
                  />
                ) : (
                  <img src={selectedFeedPost.sample.url || selectedFeedPost.file.url || selectedFeedPost.preview.url || ''} alt=""
                    className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${feedFadeIn ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => setFeedImageLoading(false)} referrerPolicy="no-referrer" />
                )}
              </div>
              <div className="sticky bottom-0 z-10 p-3 border-t border-[#1d1b2d] bg-[#161621] flex items-center justify-center gap-1.5">
                <button onClick={goToPrevFeedPost} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <div className="relative" ref={speedSliderRef}>
                  <button onClick={() => setShowSpeedSlider(prev => !prev)} className="p-1.5 rounded bg-[#1d1b2d] hover:bg-[#4c4b5a] text-xs font-mono text-[#9e98aa] hover:text-white transition-colors">{slideshowSpeed / 1000}s</button>
                  {showSpeedSlider && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/95 backdrop-blur border border-gray-700/50 shadow-xl">
                      <input type="range" min={1} max={15} step={1} value={slideshowSpeed / 1000} onChange={(e) => setSlideshowSpeed(Number(e.target.value) * 1000)} className="w-28 h-1.5 cursor-pointer accent-[#967abc]" />
                      <span className="text-[10px] font-mono text-[#9e98aa] w-6 text-right">{slideshowSpeed / 1000}s</span>
                    </div>
                  )}
                </div>
                <button onClick={() => setAutoMuteVideos(v => !v)} className={`p-1.5 rounded transition-colors ${autoMuteVideos ? 'bg-[#967abc] hover:bg-[#967abc]/80' : 'bg-[#1d1b2d] hover:bg-[#4c4b5a]'}`}>{autoMuteVideos ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                <button onClick={() => setWaitForVideoEnd(v => !v)} className={`p-1.5 rounded transition-colors ${waitForVideoEnd ? 'bg-[#967abc] hover:bg-[#967abc]/80' : 'bg-[#1d1b2d] hover:bg-[#4c4b5a]'}`}><Clock className="w-4 h-4" /></button>
                <button onClick={() => ensureFavorite(selectedFeedId ?? -1, selectedFeedPost)} disabled={!!feedActionBusy[selectedFeedPost.id]}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${selectedFeedPost.is_favorited ? 'bg-yellow-500 text-yellow-900' : 'bg-[#967abc] hover:bg-[#967abc]/80 text-white'} ${feedActionBusy[selectedFeedPost.id] ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {feedActionBusy[selectedFeedPost.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${selectedFeedPost.is_favorited ? 'fill-current' : ''}`} />}
                  {selectedFeedPost.is_favorited ? 'Unfavorite' : 'Save'}
                </button>
                <button onClick={async () => { try { if (!document.fullscreenElement) { const isFeedVideo = selectedFeedPost.file.ext === 'webm' || selectedFeedPost.file.ext === 'mp4'; if (isFeedVideo && feedDetailVideoRef.current) { savedFeedVideoTimeRef.current = feedDetailVideoRef.current.currentTime; feedDetailVideoRef.current.pause(); } await document.documentElement.requestFullscreen(); setFeedViewerOverlay(true); } else { await document.exitFullscreen(); setFeedViewerOverlay(false); } } catch (err) { console.warn("Fullscreen failed:", err); } }} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded transition-colors" title="Fullscreen"><Maximize className="w-4 h-4" /></button>
                <button onClick={goToNextFeedPost} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="p-4">
                <div className="mb-4 pb-3 border-b border-[#1d1b2d]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-600">E6</span>
                    <span className="text-sm font-medium truncate text-white">{selectedFeedPost.tags.artist.filter(a => !ARTIST_DENY_LIST.includes(a)).join(", ") || "Unknown"}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-[#9e98aa]">
                    <span>⭐ {selectedFeedPost.fav_count}</span>
                    <span>Score: {selectedFeedPost.score.total}</span>
                    <span className={`font-bold uppercase ${selectedFeedPost.rating === 'e' ? 'text-red-400' : selectedFeedPost.rating === 'q' ? 'text-yellow-400' : 'text-green-400'}`}>{selectedFeedPost.rating === 'e' ? 'Explicit' : selectedFeedPost.rating === 'q' ? 'Questionable' : 'Safe'}</span>
                  </div>
                </div>
                {selectedFeedPost.sources && selectedFeedPost.sources.length > 0 && (
                  <div className="mb-4 pb-3 border-b border-[#1d1b2d]">
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-[#9e98aa]">Sources</h4>
                    <div className="space-y-1">{selectedFeedPost.sources.map((source, i) => (<button key={i} onClick={() => openExternalUrl(source)} className="block text-xs truncate text-[#967abc] hover:text-[#967abc]/80" title={source}>{getSocialMediaName(source)}</button>))}</div>
                  </div>
                )}
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 text-[#9e98aa]"><Tag className="w-3.5 h-3.5" /> Tags</h4>
                <TagSection title="Artists" tags={selectedFeedPost.tags.artist} color="text-yellow-400" onTagClick={(tag) => { setFeedSearchInput(tag); searchFeedPosts(tag); setFeedDetailOpen(false); setSelectedFeedPost(null); }} />
                <TagSection title="Copyrights" tags={selectedFeedPost.tags.copyright} color="text-pink-400" onTagClick={(tag) => { setFeedSearchInput(tag); searchFeedPosts(tag); setFeedDetailOpen(false); setSelectedFeedPost(null); }} />
                <TagSection title="Characters" tags={selectedFeedPost.tags.character} color="text-green-400" onTagClick={(tag) => { setFeedSearchInput(tag); searchFeedPosts(tag); setFeedDetailOpen(false); setSelectedFeedPost(null); }} />
                <TagSection title="Species" tags={selectedFeedPost.tags.species} color="text-red-400" onTagClick={(tag) => { setFeedSearchInput(tag); searchFeedPosts(tag); setFeedDetailOpen(false); setSelectedFeedPost(null); }} />
                <TagSection title="General" tags={selectedFeedPost.tags.general} color="text-blue-300" onTagClick={(tag) => { setFeedSearchInput(tag); searchFeedPosts(tag); setFeedDetailOpen(false); setSelectedFeedPost(null); }} />
                <TagSection title="Meta" tags={selectedFeedPost.tags.meta} color="text-gray-400" onTagClick={(tag) => { setFeedSearchInput(tag); searchFeedPosts(tag); setFeedDetailOpen(false); setSelectedFeedPost(null); }} />
                <TagSection title="Lore" tags={selectedFeedPost.tags.lore} color="text-purple-300" onTagClick={(tag) => { setFeedSearchInput(tag); searchFeedPosts(tag); setFeedDetailOpen(false); setSelectedFeedPost(null); }} />
              </div>
            </div>
          </div>
        </>
      )}

      {showAddFeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowAddFeedModal(false); setEditingFeedId(null); setNewFeedName(''); setNewFeedQuery(''); }} />
          <div className="relative z-10 w-full max-w-xl rounded-xl p-6 bg-[#161621] border border-[#1d1b2d]">
            <h2 className="text-xl font-bold mb-4">{editingFeedId ? 'Edit Feed' : 'Add New Feed'}</h2>
            <div className="space-y-4">
              <div><label className="text-sm mb-1 block text-[#9e98aa]">Feed Name</label><input type="text" placeholder="e.g., Cute Foxes" value={newFeedName} onChange={(e) => setNewFeedName(e.target.value)} className="w-full px-4 py-2 rounded-xl focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" /></div>
              <div><label className="text-sm mb-1 block text-[#9e98aa]">Search Query</label><input type="text" placeholder="e.g., fox cute rating:s score:>200" value={newFeedQuery} onChange={(e) => setNewFeedQuery(e.target.value)} className="w-full px-4 py-2 rounded-xl focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" /><p className="text-xs mt-1 text-[#4c4b5a]">Use e621 search syntax.</p></div>
              <div className="flex justify-between">
                {editingFeedId ? <button onClick={() => { removeFeed(editingFeedId); if (selectedFeedId === editingFeedId) setSelectedFeedId(null); setShowAddFeedModal(false); setEditingFeedId(null); setNewFeedName(''); setNewFeedQuery(''); }} className="px-4 py-2 rounded-xl text-red-400 hover:bg-red-600 hover:text-white transition-colors">Delete Feed</button> : <div />}
                <div className="flex gap-3">
                  <button onClick={() => { setNewFeedName(''); setNewFeedQuery(''); setShowAddFeedModal(false); setEditingFeedId(null); }} className="px-4 py-2 rounded-xl bg-[#1d1b2d] hover:bg-[#4c4b5a]">Cancel</button>
                  <button onClick={() => { if (!newFeedQuery.trim()) { toast("Please enter a search query.", "error"); return; } if (editingFeedId) { saveFeeds(feeds.map(f => f.id === editingFeedId ? { ...f, name: newFeedName.trim() || newFeedQuery, query: newFeedQuery.trim() } : f)); } else { const feed = { id: Date.now(), name: newFeedName.trim() || newFeedQuery, query: newFeedQuery.trim() }; saveFeeds([...feeds, feed]); setSelectedFeedId(feed.id); fetchFeedPosts(feed.id, feed.query, { reset: true }); } setNewFeedQuery(''); setNewFeedName(''); setShowAddFeedModal(false); setEditingFeedId(null); }} className="px-4 py-2 rounded-xl bg-[#967abc] hover:bg-[#967abc]/80">{editingFeedId ? 'Save Changes' : 'Create Feed'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}