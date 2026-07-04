import React from "react";
import {
  X, Upload, Tag, Trash2, BookOpen, Pencil,
  ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Clock, Maximize,
} from "lucide-react";
import Masonry from "react-masonry-css";
import type { LibraryItem, PoolInfo } from "../types";
import { getDisplayArtists, getSocialMediaName } from "../helpers";
import { GridItem } from "./GridItem";
import { TagSection } from "./TagSection";
import { InfiniteSentinel } from "./InfiniteSentinel";
import { ResizeHandle } from "./ResizeHandle";
import { SkeletonGridItem } from "./Skeleton";

interface LibraryPanelProps {
  items: LibraryItem[];
  currentIndex: number;
  currentItem: LibraryItem | null;
  itemCount: number;
  initialLoading: boolean;
  isSearching: boolean;
  isLoadingMore: boolean;
  hasMoreItems: boolean;
  libraryDetailOpen: boolean;
  libraryDetailWidth: number;
  currentPostPools: PoolInfo[];
  selectedItemIds: Set<number>;
  showBulkTagModal: boolean;
  bulkTagInput: string;
  bulkTagMode: 'add' | 'remove';
  gridColumns: number;
  fadeIn: boolean;
  imageLoading: boolean;
  isSlideshow: boolean;
  slideshowSpeed: number;
  autoMuteVideos: boolean;
  waitForVideoEnd: boolean;
  globalMute: boolean;
  viewerOverlay: boolean;
  showSpeedSlider: boolean;

  setLibraryDetailOpen: (v: boolean) => void;
  setSelectedItemIds: (v: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setShowBulkTagModal: (v: boolean) => void;
  setBulkTagInput: (v: string) => void;
  setBulkTagMode: (v: 'add' | 'remove') => void;
  setShowSettings: (v: boolean) => void;
  setImageLoading: (v: boolean) => void;
  setIsSlideshow: (v: boolean) => void;
  setSlideshowSpeed: (v: number | ((prev: number) => number)) => void;
  setAutoMuteVideos: (v: boolean | ((prev: boolean) => boolean)) => void;
  setWaitForVideoEnd: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowSpeedSlider: (v: boolean | ((prev: boolean) => boolean)) => void;
  setViewerOverlay: (v: boolean) => void;
  setActiveTab: (v: string) => void;
  setConfirmModal: (v: unknown) => void;

  loadMoreItems: () => Promise<void>;
  goToPrev: (manual: boolean) => void;
  goToNext: (manual: boolean) => void;
  handleItemSelect: (index: number) => void;
  handleGridClick: (index: number, e: React.MouseEvent) => void;
  handleLibraryDetailResize: (clientX: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  openEditModal: () => void;
  bulkTrash: () => Promise<void>;
  deleteCurrentItem: () => Promise<void>;
  openPool: (pool: PoolInfo) => Promise<void>;
  toggleTagAndSearch: (tag: string) => void;
  changeLibraryRoot: () => Promise<void>;

  detailVideoRef: React.RefObject<HTMLVideoElement | null>;
  fullscreenVideoRef: React.RefObject<HTMLVideoElement | null>;
  savedVideoTimeRef: React.MutableRefObject<number>;
  speedSliderRef: React.RefObject<HTMLDivElement | null>;
  openExternalUrl: (url: string) => void;

  isVideo: boolean;
}

export function LibraryPanel({
  items, currentIndex, currentItem, itemCount,
  initialLoading, isSearching, isLoadingMore, hasMoreItems,
  libraryDetailOpen, libraryDetailWidth, currentPostPools,
  selectedItemIds,
  gridColumns,
  fadeIn, imageLoading,
  isSlideshow, slideshowSpeed, autoMuteVideos, waitForVideoEnd, globalMute,
  viewerOverlay, showSpeedSlider,
  setLibraryDetailOpen,
  setSelectedItemIds,
  setShowBulkTagModal, setBulkTagInput, setBulkTagMode,
  setShowSettings, setImageLoading,
  setIsSlideshow, setSlideshowSpeed, setAutoMuteVideos, setWaitForVideoEnd,
  setShowSpeedSlider, setViewerOverlay, setActiveTab,
  setConfirmModal,
  loadMoreItems, goToPrev, goToNext,
  handleItemSelect, handleGridClick, handleLibraryDetailResize,
  selectAll, deselectAll,
  openEditModal, bulkTrash, deleteCurrentItem, openPool,
  toggleTagAndSearch,
  detailVideoRef, fullscreenVideoRef, savedVideoTimeRef,
  speedSliderRef, openExternalUrl,
  isVideo,
}: LibraryPanelProps) {

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0f0f17]">
      {/* Grid */}
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative">
        <div className="p-4">
          {(initialLoading || isSearching) ? (
            <Masonry
              breakpointCols={{ default: libraryDetailOpen ? Math.max(2, gridColumns - 2) : gridColumns, 700: 2, 500: 1 }}
              className="flex w-auto gap-3"
              columnClassName="flex flex-col gap-3"
            >
              {Array.from({ length: (libraryDetailOpen ? Math.max(2, gridColumns - 2) : gridColumns) * 3 }).map((_, i) => (
                <SkeletonGridItem key={`init-skeleton-${i}`} index={i} dark />
              ))}
            </Masonry>
          ) : itemCount > 0 ? (
            <>
              <Masonry
                breakpointCols={{ default: libraryDetailOpen ? Math.max(2, gridColumns - 2) : gridColumns, 700: 2, 500: 1 }}
                className="flex w-auto gap-3"
                columnClassName="flex flex-col gap-3"
              >
                {items.map((item, index) => (
                  <GridItem
                    key={item.item_id}
                    item={item}
                    index={index}
                    onSelect={(i) => {
                      if (selectedItemIds.size > 0) {
                        setSelectedItemIds(new Set());
                      }
                      handleItemSelect(i);
                    }}
                    isSelected={libraryDetailOpen && index === currentIndex}
                    isMultiSelected={selectedItemIds.has(item.item_id)}
                    onMultiClick={handleGridClick}
                  />
                ))}
                {isLoadingMore && Array.from({ length: (libraryDetailOpen ? Math.max(2, gridColumns - 2) : gridColumns) * 2 }).map((_, i) => (
                  <SkeletonGridItem key={`skeleton-${i}`} index={i} dark />
                ))}
              </Masonry>
              {hasMoreItems && <InfiniteSentinel onVisible={loadMoreItems} disabled={isLoadingMore} />}
            </>
          ) : (
            <div className="flex items-center justify-center text-[#4c4b5a] min-h-[60vh]">
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl font-semibold text-gray-200">Library is Ready</p>
                <p className="text-sm mt-2 mb-6 text-[#9e98aa]">
                  Your database is set up. Go to <b>Settings</b> to sync your favorites.
                </p>
                <button onClick={() => setShowSettings(true)} className="px-4 py-2 rounded-xl text-white transition-colors bg-[#1d1b2d] hover:bg-[#4c4b5a]">Open Settings</button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Action Bar */}
        {selectedItemIds.size > 0 && (
          <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#161621]/95 backdrop-blur-md border border-[#1d1b2d] shadow-2xl">
              <span className="text-sm font-medium text-white mr-1">{selectedItemIds.size} selected</span>
              <div className="w-px h-6 bg-[#1d1b2d]" />
              <button onClick={selectAll} className="px-3 py-1.5 text-xs rounded-lg bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#9e98aa] hover:text-white transition-colors">Select All</button>
              <button onClick={() => { setBulkTagMode('add'); setBulkTagInput(''); setShowBulkTagModal(true); }} className="px-3 py-1.5 text-xs rounded-lg bg-[#967abc] hover:bg-[#967abc]/80 text-white transition-colors flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Add Tag</button>
              <button onClick={() => { setBulkTagMode('remove'); setBulkTagInput(''); setShowBulkTagModal(true); }} className="px-3 py-1.5 text-xs rounded-lg bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#9e98aa] hover:text-white transition-colors flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Remove Tag</button>
              <button onClick={() => setConfirmModal({ title: "Bulk Trash", message: `Move ${selectedItemIds.size} selected items to trash?`, okLabel: "Move to Trash", onConfirm: bulkTrash })} className="px-3 py-1.5 text-xs rounded-lg bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white transition-colors flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Trash</button>
              <div className="w-px h-6 bg-[#1d1b2d]" />
              <button onClick={deselectAll} className="p-1.5 rounded-lg hover:bg-[#1d1b2d] text-[#9e98aa] hover:text-white transition-colors" title="Clear selection"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Pane */}
      {libraryDetailOpen && currentItem && (
        <>
          <ResizeHandle onDrag={handleLibraryDetailResize} />
          <div style={{ width: libraryDetailWidth, maxWidth: '60vw', minWidth: 300 }} className="flex-shrink-0 flex flex-col h-full bg-[#161621] border-l border-[#1d1b2d]">
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Media */}
              <div className="relative bg-[#0a0a12] flex items-center justify-center overflow-hidden" style={{ height: 'calc(100vh - 120px)', minHeight: '300px' }}>
                {currentItem && !isVideo && (
                  <div className="absolute inset-0 scale-110 blur-3xl opacity-20" style={{ backgroundImage: `url(${currentItem.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                <button onClick={() => setLibraryDetailOpen(false)} className="absolute top-2 right-2 z-20 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#967abc]" /></div>
                )}
                {isVideo ? (
                  <video ref={detailVideoRef} key={currentItem.url} src={currentItem.url} controls autoPlay playsInline loop={!waitForVideoEnd || !isSlideshow} muted={globalMute || autoMuteVideos || viewerOverlay}
                    className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${fadeIn ? "opacity-100" : "opacity-0"} ${viewerOverlay ? 'opacity-0 pointer-events-none' : ''}`}
                    onCanPlay={(e) => { if (viewerOverlay) return; if (!globalMute && !autoMuteVideos) (e.target as HTMLVideoElement).volume = 1.0; if (savedVideoTimeRef.current > 0) { (e.target as HTMLVideoElement).currentTime = savedVideoTimeRef.current; savedVideoTimeRef.current = 0; (e.target as HTMLVideoElement).play().catch(() => {}); } }}
                    onLoadedData={() => setImageLoading(false)} onError={() => setImageLoading(false)}
                    onEnded={() => { if (!viewerOverlay && waitForVideoEnd && isSlideshow) goToNext(false); }}
                  />
                ) : (
                  <img key={currentItem.url} src={currentItem.url} alt=""
                    className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${fadeIn ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => setImageLoading(false)}
                    onError={(e) => { setImageLoading(false); (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23374151' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%239CA3AF' font-size='20'%3EImage not found%3C/text%3E%3C/svg%3E"; }}
                  />
                )}
              </div>

              {/* Controls */}
              <div className="sticky bottom-0 z-10 p-3 border-t border-[#1d1b2d] bg-[#161621] flex items-center justify-center gap-1.5">
                <button onClick={() => goToPrev(true)} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setIsSlideshow(!isSlideshow)} className="p-1.5 bg-[#967abc] hover:bg-[#967abc]/80 rounded transition-colors">{isSlideshow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
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
                <button onClick={async () => { try { if (!document.fullscreenElement) { if (isVideo && detailVideoRef.current) savedVideoTimeRef.current = detailVideoRef.current.currentTime; await document.documentElement.requestFullscreen(); setViewerOverlay(true); } else { if (isVideo && fullscreenVideoRef.current) savedVideoTimeRef.current = fullscreenVideoRef.current.currentTime; await document.exitFullscreen(); setViewerOverlay(false); } } catch (err) { console.warn("Fullscreen failed:", err); } }} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded transition-colors"><Maximize className="w-4 h-4" /></button>
                <button onClick={deleteCurrentItem} className="p-1.5 bg-[#1d1b2d] hover:bg-red-600 rounded text-[#9e98aa] hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
                <button onClick={openEditModal} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded text-[#9e98aa] hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => goToNext(true)} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>

              {/* Info & Tags */}
              <div className="p-4">
                <div className="mb-4 pb-3 border-b border-[#1d1b2d]">
                  <div className="flex items-center gap-1.5 mb-2 min-w-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0 ${currentItem.source === 'e621' ? 'bg-blue-600' : currentItem.source === 'local' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                      {currentItem.source === 'e621' ? 'E6' : currentItem.source === 'local' ? 'LC' : 'FA'}
                    </span>
                    <span className="text-sm font-medium truncate text-white">{getDisplayArtists(currentItem)}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-[#9e98aa]">
                    <span>⭐ {currentItem.fav_count || 0}</span>
                    <span>Score: {currentItem.score.total}</span>
                    <span className={`font-bold uppercase ${currentItem.rating === 'e' ? 'text-red-400' : currentItem.rating === 'q' ? 'text-yellow-400' : 'text-green-400'}`}>{currentItem.rating === 'e' ? 'Explicit' : currentItem.rating === 'q' ? 'Questionable' : 'Safe'}</span>
                  </div>
                  {currentPostPools.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {currentPostPools.map(pool => (
                        <button key={pool.pool_id} onClick={() => { setActiveTab('comics'); openPool(pool); }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#967abc] transition-colors">
                          <BookOpen className="w-3 h-3" />{pool.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {currentItem.source === 'e621' && (<button onClick={() => openExternalUrl(`https://e621.net/posts/${currentItem.source_id}`)} className="text-[#967abc] hover:text-[#967abc]/80 underline">e621</button>)}
                    {currentItem.sources?.filter(s => currentItem.source !== 'e621' || !s.includes('e621.net/posts')).slice(0, 3).map((source, i) => (
                      <button key={i} onClick={() => openExternalUrl(source)} className="text-[#967abc] hover:text-[#967abc]/80 underline" title={source}>{getSocialMediaName(source)}</button>
                    ))}
                  </div>
                </div>

                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#9e98aa]"><Tag className="w-3.5 h-3.5" /> Tags</h3>
                <TagSection title="Artists" tags={currentItem.tags_artist} color="text-yellow-400" onTagClick={toggleTagAndSearch} />
                <TagSection title="Copyrights" tags={currentItem.tags_copyright} color="text-pink-400" onTagClick={toggleTagAndSearch} />
                <TagSection title="Characters" tags={currentItem.tags_character} color="text-green-400" onTagClick={toggleTagAndSearch} />
                <TagSection title="Species" tags={currentItem.tags_species} color="text-red-400" onTagClick={toggleTagAndSearch} />
                <TagSection title="General" tags={currentItem.tags_general} color="text-blue-300" onTagClick={toggleTagAndSearch} />
                <TagSection title="Meta" tags={currentItem.tags_meta} color="text-gray-400" onTagClick={toggleTagAndSearch} />
                <TagSection title="Lore" tags={currentItem.tags_lore} color="text-purple-300" onTagClick={toggleTagAndSearch} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
