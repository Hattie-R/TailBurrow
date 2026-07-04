import { useEffect } from "react";

export interface KBShortcutParams {
  activeTab: string;
  viewerOverlay: boolean;
  feedViewerOverlay: boolean;
  showSettings: boolean;
  showEditModal: boolean;
  showTrashModal: boolean;
  showAddFeedModal: boolean;
  showImportModal: boolean;
  showBulkTagModal: boolean;
  selectedPool: unknown;
  selectedFeedId: number | null;
  feedDetailOpen: boolean;
  selectedFeedPost: unknown;
  libraryDetailOpen: boolean;
  confirmModal: unknown;
  selectedItemIds: Set<number>;
  hasLock: boolean;

  setShowSettings: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowEditModal: (v: boolean) => void;
  setShowTrashModal: (v: boolean) => void;
  setShowAddFeedModal: (v: boolean) => void;
  setShowImportModal: (v: boolean) => void;
  setShowBulkTagModal: (v: boolean) => void;
  setViewerOverlay: (v: boolean) => void;
  setFeedViewerOverlay: (v: boolean) => void;
  setConfirmModal: (v: unknown) => void;
  setLibraryDetailOpen: (v: boolean) => void;
  setFeedDetailOpen: (v: boolean) => void;
  setSelectedFeedPost: (v: unknown) => void;
  setFeedPostIndex: (v: number | ((prev: number) => number)) => void;
  setComicScale: (v: number | ((prev: number) => number)) => void;

  pokeHud: () => void;
  goToPrev: (manual: boolean) => void;
  goToNext: (manual: boolean) => void;
  openEditModal: () => void;
  closePool: () => void;
  deselectAll: () => void;
  selectAll: () => void;
  goToPrevFeedPost: () => void;
  goToNextFeedPost: () => void;
  ensureFavorite: (feedId: number, post: unknown) => void;
  setIsLockedTrue: () => void;

  detailVideoRef: React.RefObject<HTMLVideoElement | null>;
  fullscreenVideoRef: React.RefObject<HTMLVideoElement | null>;
  feedDetailVideoRef: React.RefObject<HTMLVideoElement | null>;
  feedFullscreenVideoRef: React.RefObject<HTMLVideoElement | null>;
  savedVideoTimeRef: React.MutableRefObject<number>;
  savedFeedVideoTimeRef: React.MutableRefObject<number>;
  isVideo: boolean;
  selectedFeedPostData?: { file: { ext: string } } | null;
}

export function useKeyboardShortcuts(params: KBShortcutParams): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (target && target.tagName === "SELECT") { (target as HTMLElement).blur(); }

      const key = e.key.toLowerCase();

      // Escape handler
      if (e.key === "Escape") {
        e.preventDefault();
        if (params.confirmModal) { params.setConfirmModal(null); return; }
        if (params.showSettings) { params.setShowSettings(false); return; }
        if (params.showEditModal) { params.setShowEditModal(false); return; }
        if (params.showTrashModal) { params.setShowTrashModal(false); return; }
        if (params.showAddFeedModal) { params.setShowAddFeedModal(false); return; }
        if (params.showImportModal) { params.setShowImportModal(false); return; }
        if (params.viewerOverlay) {
          params.pokeHud();
          if (document.fullscreenElement) document.exitFullscreen();
          params.setViewerOverlay(false);
          return;
        }
        if (params.feedViewerOverlay) {
          if (document.fullscreenElement) document.exitFullscreen();
          params.setFeedViewerOverlay(false);
          return;
        }
        if (params.activeTab === 'feeds' && params.feedDetailOpen) {
          params.setFeedDetailOpen(false);
          params.setSelectedFeedPost(null);
          return;
        }
        if (params.activeTab === 'comics' && params.selectedPool) { params.closePool(); return; }
        if (params.showBulkTagModal) { params.setShowBulkTagModal(false); return; }
        if (params.selectedItemIds.size > 0) { params.deselectAll(); return; }
        if (params.activeTab === 'viewer' && params.libraryDetailOpen) { params.setLibraryDetailOpen(false); return; }
      }
      if (params.showImportModal) { params.setShowImportModal(false); return; }

      // Comic zoom
      if (params.activeTab === 'comics' && params.selectedPool && (e.ctrlKey || e.metaKey)) {
        if (key === '=' || key === '+') { e.preventDefault(); params.setComicScale(s => Math.min(100, s + 10)); return; }
        if (key === '-') { e.preventDefault(); params.setComicScale(s => Math.max(10, s - 10)); return; }
      }

      // Shortcuts
      if (key === "s" && params.activeTab !== "feeds") { e.preventDefault(); params.setShowSettings(prev => !prev); return; }
      if (params.activeTab === 'viewer' && key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        params.selectAll();
        return;
      }
      if (key === "l" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (params.hasLock) {
          params.setIsLockedTrue();
        }
      }

      // Viewer shortcuts
      if (params.activeTab === "viewer" && !params.showSettings) {
        if (key === "a" || e.key === "ArrowLeft") { e.preventDefault(); params.goToPrev(true); }
        else if (key === "d" || e.key === "ArrowRight") { e.preventDefault(); params.goToNext(true); }
        else if (key === "f") {
          e.preventDefault();
          (async () => {
            try {
              if (!document.fullscreenElement) {
                if (params.isVideo && params.detailVideoRef.current) {
                  params.savedVideoTimeRef.current = params.detailVideoRef.current.currentTime;
                  params.detailVideoRef.current.pause();
                }
                await document.documentElement.requestFullscreen();
                params.setViewerOverlay(true);
              } else {
                if (params.isVideo && params.fullscreenVideoRef.current) {
                  params.savedVideoTimeRef.current = params.fullscreenVideoRef.current.currentTime;
                }
                await document.exitFullscreen();
                params.setViewerOverlay(false);
              }
            } catch (err) {
              console.warn("Fullscreen request failed:", err);
            }
          })();
        }
        else if (key === "e") { e.preventDefault(); params.openEditModal(); }
      }

      // Feed shortcuts
      if (params.activeTab === "feeds" && params.feedDetailOpen && params.selectedFeedPost) {
        if (key === "a" || e.key === "ArrowLeft") { e.preventDefault(); params.goToPrevFeedPost(); }
        else if (key === "d" || e.key === "ArrowRight") { e.preventDefault(); params.goToNextFeedPost(); }
        else if (key === "s" || key === " ") {
          e.preventDefault();
          params.ensureFavorite(params.selectedFeedId ?? -1, params.selectedFeedPost);
        }
        else if (key === "f") {
          e.preventDefault();
          const sfp = params.selectedFeedPostData;
          (async () => {
            try {
              const isFeedVideo = sfp && (sfp.file.ext === 'webm' || sfp.file.ext === 'mp4');
              if (!document.fullscreenElement) {
                if (isFeedVideo && params.feedDetailVideoRef.current) {
                  params.savedFeedVideoTimeRef.current = params.feedDetailVideoRef.current.currentTime;
                  params.feedDetailVideoRef.current.pause();
                }
                await document.documentElement.requestFullscreen();
                params.setFeedViewerOverlay(true);
              } else {
                if (isFeedVideo && params.feedFullscreenVideoRef.current) {
                  params.savedFeedVideoTimeRef.current = params.feedFullscreenVideoRef.current.currentTime;
                }
                await document.exitFullscreen();
                params.setFeedViewerOverlay(false);
              }
            } catch (err) {
              console.warn("Fullscreen request failed:", err);
            }
          })();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    params.activeTab, params.viewerOverlay, params.feedViewerOverlay,
    params.pokeHud, params.goToPrev, params.goToNext, params.openEditModal,
    params.showSettings, params.showEditModal, params.showTrashModal,
    params.showAddFeedModal, params.showImportModal,
    params.selectedPool, params.closePool, params.confirmModal,
    params.libraryDetailOpen, params.setLibraryDetailOpen,
    params.selectedItemIds, params.deselectAll, params.selectAll,
    params.showBulkTagModal, params.setShowBulkTagModal,
    params.feedDetailOpen, params.selectedFeedPost,
    params.goToPrevFeedPost, params.goToNextFeedPost,
    params.ensureFavorite, params.selectedFeedId,
    params.setShowSettings, params.setShowEditModal,
    params.setShowTrashModal, params.setShowAddFeedModal,
    params.setShowImportModal, params.setViewerOverlay,
    params.setFeedViewerOverlay, params.setConfirmModal,
    params.setFeedDetailOpen, params.setSelectedFeedPost,
    params.setComicScale, params.setIsLockedTrue,
    params.hasLock, params.detailVideoRef, params.fullscreenVideoRef,
    params.feedDetailVideoRef, params.feedFullscreenVideoRef,
    params.savedVideoTimeRef, params.savedFeedVideoTimeRef,
    params.isVideo, params.selectedFeedPostData,
  ]);
}