import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Search, Upload, Rss, BookOpen, Database, Settings, X, Star,
  ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Clock,
  Trash2, Pencil, Loader2, Maximize,
} from "lucide-react";
import Masonry from "react-masonry-css";
import type {
  AppConfig, ItemDto, LibraryItem, E621Post, PoolInfo, PoolPost,
  Feed, FeedPagingState, SyncStatus, DeletedPostInfo,
  MaintenanceProgress,
} from "./types";
import { APP_VERSION, FEED_PAGE_LIMIT } from "./constants";
import { mapItemDto } from "./helpers";
import { useToast } from "./hooks/useToast";
import { useAppLock } from "./hooks/useAppLock";
import { useLibraryData } from "./hooks/useLibraryData";
import { useSyncState } from "./hooks/useSyncState";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import { ToastContainer } from "./components/ToastContainer";
import { AutoscrollWidget } from "./components/AutoscrollWidget";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LockScreen } from "./components/LockScreen";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { CredentialsScreen } from "./components/CredentialsScreen";
import { LibraryPanel } from "./components/LibraryPanel";
import { FeedsPanel } from "./components/FeedsPanel";
import { ComicsPanel } from "./components/ComicsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { ViewerOverlay } from "./components/ViewerOverlay";
import { EditModal } from "./components/EditModal";
import { ImportModal } from "./components/ImportModal";
import { ConfirmModal } from "./components/ConfirmModal";
import type { ConfirmOpts } from "./components/ConfirmModal";

type SettingsTab = 'general' | 'credentials' | 'security' | 'maintenance';

function FavoritesViewerInner() {
  const { toasts, toast, dismissToast } = useToast();
  const lock = useAppLock();
  const lib = useLibraryData();
  const sync = useSyncState(lib.loadData);

  // Persist settings to backend
  const persistSettings = useCallback(async () => {
    try {
      const settings: Record<string, string> = {};
      const keys = ["grid_columns", "preferred_sort_order", "items_per_page", "blacklist_tags", "feed_detail_width", "library_detail_width", "e621_feeds"];
      keys.forEach(key => { const val = localStorage.getItem(key); if (val !== null) settings[key] = val; });
      await invoke("save_app_settings", { json: JSON.stringify(settings) });
    } catch (e) { console.warn("Failed to persist settings:", e); }
  }, []);

  // ─── Tab state ───
  const [activeTab, setActiveTab] = useState('viewer');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');

  // ─── Feeds ───
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [feedPosts, setFeedPosts] = useState<Record<number, E621Post[]>>({});
  const [loadingFeeds, setLoadingFeeds] = useState<Record<number, boolean>>({});
  const [feedPaging, setFeedPaging] = useState<Record<number, FeedPagingState>>({});
  const [newFeedQuery, setNewFeedQuery] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null);
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const [editingFeedId, setEditingFeedId] = useState<number | null>(null);
  const [feedSearchInput, setFeedSearchInput] = useState('');
  const [feedSearchResults, setFeedSearchResults] = useState<E621Post[]>([]);
  const [feedSearchLoading, setFeedSearchLoading] = useState(false);
  const [selectedFeedPost, setSelectedFeedPost] = useState<E621Post | null>(null);
  const [feedPostIndex, setFeedPostIndex] = useState(0);
  const [feedDetailOpen, setFeedDetailOpen] = useState(false);
  const [feedDetailWidth, setFeedDetailWidth] = useState(() => Number(localStorage.getItem('feed_detail_width') || 500));
  const [feedSlideshow, setFeedSlideshow] = useState(false);
  const [feedFadeIn, setFeedFadeIn] = useState(true);
  const [feedImageLoading, setFeedImageLoading] = useState(true);
  const [feedViewerOverlay, setFeedViewerOverlay] = useState(false);
  const [feedActionBusy, setFeedActionBusy] = useState<Record<number, boolean>>({});
  const [feedDrag, setFeedDrag] = useState<{
    id: number; ghostX: number; ghostY: number; ghostWidth: number; ghostHeight: number; ghostLabel: string; insertIndex: number;
  } | null>(null);
  const feedPillRefs = useRef<Map<number, HTMLElement>>(new Map());
  const feedDragStartRef = useRef<{ x: number; y: number; id: number; index: number } | null>(null);
  const feedDragCleanupRef = useRef<(() => void) | null>(null);
  const feedDragRef = useRef(feedDrag);
  useEffect(() => { feedDragRef.current = feedDrag; }, [feedDrag]);
  const feedsContainerRef = useRef<HTMLDivElement>(null);
  const loadingFeedsRef = useRef<Record<number, boolean>>({});
  const feedPagingRef = useRef<Record<number, FeedPagingState>>({});
  useEffect(() => { loadingFeedsRef.current = loadingFeeds; }, [loadingFeeds]);
  useEffect(() => { feedPagingRef.current = feedPaging; }, [feedPaging]);

  const loadFeeds = useCallback(() => {
    try { const stored = localStorage.getItem('e621_feeds'); if (stored) setFeeds(JSON.parse(stored)); }
    catch (e) { console.warn("Failed to load feeds from localStorage:", e); }
  }, []);

  const saveFeeds = useCallback((newFeeds: Feed[]) => {
    localStorage.setItem("e621_feeds", JSON.stringify(newFeeds));
    setFeeds(newFeeds);
    persistSettings();
  }, [persistSettings]);

  const removeFeed = useCallback((feedId: number) => {
    saveFeeds(feeds.filter(f => f.id !== feedId));
    setFeedPosts(prev => { const copy = { ...prev }; delete copy[feedId]; return copy; });
    setFeedPaging(prev => { const copy = { ...prev }; delete copy[feedId]; return copy; });
  }, [feeds, saveFeeds]);

  const fetchFeedPosts = useCallback(async (feedId: number, query: string, opts?: { reset?: boolean }) => {
    const reset = opts?.reset ?? false;
    if (!sync.e621CredInfo.username || !sync.e621CredInfo.has_api_key) {
      if (!sync.credWarned) { toast("Set e621 credentials in Settings first.", "error"); sync.setCredWarned(true); }
      return;
    }
    if (loadingFeedsRef.current[feedId]) return;
    const currentPaging = feedPagingRef.current[feedId];
    if (!reset && (currentPaging?.done || /\border:random\b/i.test(query))) return;
    loadingFeedsRef.current = { ...loadingFeedsRef.current, [feedId]: true };
    setLoadingFeeds(prev => ({ ...prev, [feedId]: true }));
    try {
      const pageParam = (!reset && currentPaging?.beforeId) ? `b${currentPaging.beforeId}` : "1";
      const safeQuery = lock.safeMode && !query.includes("rating:") ? `${query} rating:s` : query;
      const data = await invoke<{ posts: E621Post[] }>("e621_fetch_posts", { tags: safeQuery, limit: FEED_PAGE_LIMIT, page: pageParam });
      const rawPosts = data.posts || [];
      const blTags = blacklist?.toLowerCase().split(/[\s\n]+/).filter(Boolean) || [];
      const filteredPosts = rawPosts.filter((post) => {
        if (blTags.length === 0) return true;
        const pTags = [...post.tags.general, ...post.tags.species, ...post.tags.character, ...post.tags.artist, ...post.tags.copyright, ...post.tags.meta, ...post.tags.lore];
        return !pTags.some((t) => blTags.includes(t));
      });
      setFeedPosts(prev => {
        const existing = reset ? [] : (prev[feedId] || []);
        const uniqueMap = new Map<number, E621Post>();
        [...existing, ...filteredPosts].forEach((p) => uniqueMap.set(p.id, p));
        return { ...prev, [feedId]: Array.from(uniqueMap.values()) };
      });
      const minId = rawPosts.reduce((m, p) => Math.min(m, p.id), Number.POSITIVE_INFINITY);
      setFeedPaging(prev => ({ ...prev, [feedId]: { beforeId: minId !== Number.POSITIVE_INFINITY ? minId : (prev[feedId]?.beforeId ?? null), done: rawPosts.length < FEED_PAGE_LIMIT } }));
    } catch (e) {
      console.error('Error fetching feed:', e);
      toast("Error fetching feed: " + (e instanceof Error ? e.message : String(e)), "error");
    } finally {
      loadingFeedsRef.current = { ...loadingFeedsRef.current, [feedId]: false };
      setLoadingFeeds(prev => ({ ...prev, [feedId]: false }));
    }
  }, [sync.e621CredInfo, sync.credWarned, lock.safeMode, toast]);

  const searchFeedPosts = useCallback(async (query: string) => {
    if (!sync.e621CredInfo.username || !sync.e621CredInfo.has_api_key) {
      if (!sync.credWarned) { toast("Set e621 credentials in Settings first.", "error"); sync.setCredWarned(true); }
      return;
    }
    if (!query.trim()) return;
    setFeedSearchLoading(true);
    setSelectedFeedId(null);
    setSelectedFeedPost(null);
    try {
      const safeQuery = lock.safeMode && !query.includes("rating:") ? `${query.trim()} rating:s` : query.trim();
      const data = await invoke<{ posts: E621Post[] }>("e621_fetch_posts", { tags: safeQuery, limit: FEED_PAGE_LIMIT, page: "1" });
      const rawPosts = data.posts || [];
      const blTags = blacklist?.toLowerCase().split(/[\s\n]+/).filter(Boolean) || [];
      const filteredPosts = rawPosts.filter((post) => {
        if (blTags.length === 0) return true;
        const pTags = [...post.tags.general, ...post.tags.species, ...post.tags.character, ...post.tags.artist, ...post.tags.copyright, ...post.tags.meta, ...post.tags.lore];
        return !pTags.some((t) => blTags.includes(t));
      });
      setFeedSearchResults(filteredPosts);
    } catch (e) {
      toast("Search error: " + (e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setFeedSearchLoading(false);
    }
  }, [sync.e621CredInfo, sync.credWarned, lock.safeMode, toast]);

  const ensureFavorite = useCallback(async (feedId: number, post: E621Post) => {
    const id = post.id;
    const isFav = post.is_favorited;
    try {
      setFeedActionBusy(prev => ({ ...prev, [id]: true }));
      if (isFav) {
        await invoke("e621_unfavorite", { postId: id });
        const upd = (p: E621Post) => p.id === id ? { ...p, is_favorited: false } : p;
        if (feedId === -1) setFeedSearchResults(prev => prev.map(upd));
        else setFeedPosts(prev => ({ ...prev, [feedId]: (prev[feedId] || []).map(upd) }));
        setSelectedFeedPost(prev => prev && prev.id === id ? { ...prev, is_favorited: false } : prev);
      } else {
        if (!lib.downloadE621Ids().has(id)) {
          if (!post.file.url) throw new Error("This post has no original file URL (deleted/blocked).");
          await invoke("add_e621_post", { post: {
            id: post.id, file_url: post.file.url, file_ext: post.file.ext, file_md5: post.file.md5,
            rating: post.rating, fav_count: post.fav_count, score_total: post.score.total,
            created_at: post.created_at, sources: post.sources || [],
            tags: { general: post.tags.general, species: post.tags.species, character: post.tags.character, artist: post.tags.artist, meta: post.tags.meta, lore: post.tags.lore, copyright: post.tags.copyright },
          }});
          await lib.loadData(false);
        }
        await invoke("e621_favorite", { postId: id });
        const upd = (p: E621Post) => p.id === id ? { ...p, is_favorited: true } : p;
        if (feedId === -1) setFeedSearchResults(prev => prev.map(upd));
        else setFeedPosts(prev => ({ ...prev, [feedId]: (prev[feedId] || []).map(upd) }));
        setSelectedFeedPost(prev => prev && prev.id === id ? { ...prev, is_favorited: true } : prev);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setFeedActionBusy(prev => ({ ...prev, [id]: false }));
    }
  }, [lib, toast]);

  const goToNextFeedPost = useCallback(() => {
    const posts = getCurrentFeedPosts();
    if (posts.length === 0) return;
    setFeedFadeIn(false);
    setTimeout(() => {
      const nextIndex = (feedPostIndex + 1) % posts.length;
      setFeedPostIndex(nextIndex);
      setSelectedFeedPost(posts[nextIndex]);
      requestAnimationFrame(() => setFeedFadeIn(true));
    }, 200);
  }, [feedPostIndex, feedSearchInput, feedSearchResults, selectedFeedId, feedPosts]);

  const goToPrevFeedPost = useCallback(() => {
    const posts = getCurrentFeedPosts();
    if (posts.length === 0) return;
    setFeedFadeIn(false);
    setTimeout(() => {
      const prevIndex = (feedPostIndex - 1 + posts.length) % posts.length;
      setFeedPostIndex(prevIndex);
      setSelectedFeedPost(posts[prevIndex]);
      requestAnimationFrame(() => setFeedFadeIn(true));
    }, 200);
  }, [feedPostIndex, feedSearchInput, feedSearchResults, selectedFeedId, feedPosts]);

  const getCurrentFeedPosts = useCallback(() => {
    return feedSearchInput && feedSearchResults.length > 0 ? feedSearchResults
      : (selectedFeedId && feedPosts[selectedFeedId]) ? feedPosts[selectedFeedId] : [];
  }, [feedSearchInput, feedSearchResults, selectedFeedId, feedPosts]);

  // Auto-select first post when switching feeds
  const prevFeedIdRef = useRef(selectedFeedId);
  const pendingFeedSelectRef = useRef<number | null>(null);
  useEffect(() => {
    if (selectedFeedId === null || feedSearchInput) return;
    const feedChanged = prevFeedIdRef.current !== selectedFeedId;
    prevFeedIdRef.current = selectedFeedId;
    if (feedChanged && feedDetailOpen) pendingFeedSelectRef.current = selectedFeedId;
    if (pendingFeedSelectRef.current !== selectedFeedId) return;
    const posts = feedPosts[selectedFeedId];
    if (posts && posts.length > 0) { setFeedPostIndex(0); setSelectedFeedPost(posts[0]); pendingFeedSelectRef.current = null; }
  }, [selectedFeedId, feedPosts, feedSearchInput, feedDetailOpen]);

  // ─── Slideshow UI ───
  const [fadeIn, setFadeIn] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [slideshowSpeed, setSlideshowSpeed] = useState(5000);
  const [autoMuteVideos, setAutoMuteVideos] = useState(false);
  const [waitForVideoEnd, setWaitForVideoEnd] = useState(true);
  const [viewerOverlay, setViewerOverlay] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const hudHoverRef = useRef(false);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSpeedSlider, setShowSpeedSlider] = useState(false);
  const speedSliderRef = useRef<HTMLDivElement>(null);
  const savedVideoTimeRef = useRef(0);
  const savedFeedVideoTimeRef = useRef(0);

  const scheduleHudHide = useCallback(() => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => { if (!hudHoverRef.current) setShowHud(false); }, 3000);
  }, []);

  const pokeHud = useCallback(() => { setShowHud(true); scheduleHudHide(); }, [scheduleHudHide]);

  useEffect(() => { if (viewerOverlay) pokeHud(); }, [viewerOverlay, pokeHud]);
  useEffect(() => { return () => { if (hudTimerRef.current) clearTimeout(hudTimerRef.current); }; }, []);
  useEffect(() => {
    if (!showSpeedSlider) return;
    const handleClickOutside = (e: MouseEvent) => { if (speedSliderRef.current && !speedSliderRef.current.contains(e.target as Node)) setShowSpeedSlider(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSpeedSlider]);

  // Slideshow timer
  useEffect(() => {
    if (!isSlideshow || lib.itemCount === 0) return;
    if (waitForVideoEnd && lib.currentItem && (["mp4", "webm"].includes((lib.currentItem.ext || "").toLowerCase()))) return;
    const timeout = setTimeout(() => {
      setFadeIn(false);
      setTimeout(() => {
        lib.setCurrentIndex(prev => { const len = lib.itemsRef.current.length; return len === 0 ? 0 : (prev + 1) % len; });
        requestAnimationFrame(() => setFadeIn(true));
      }, 200);
    }, slideshowSpeed);
    return () => clearTimeout(timeout);
  }, [isSlideshow, slideshowSpeed, waitForVideoEnd, lib.currentIndex, lib.itemCount]);

  // Feed slideshow timer
  useEffect(() => {
    const posts = getCurrentFeedPosts();
    if (!feedSlideshow || posts.length === 0 || !selectedFeedPost) return;
    const ext = (selectedFeedPost.file.ext || '').toLowerCase();
    if (waitForVideoEnd && (ext === 'mp4' || ext === 'webm')) return;
    const timeout = setTimeout(() => {
      setFeedFadeIn(false);
      setTimeout(() => {
        const nextIndex = (feedPostIndex + 1) % posts.length;
        setFeedPostIndex(nextIndex);
        setSelectedFeedPost(posts[nextIndex]);
        requestAnimationFrame(() => setFeedFadeIn(true));
      }, 200);
    }, slideshowSpeed);
    return () => clearTimeout(timeout);
  }, [feedSlideshow, slideshowSpeed, waitForVideoEnd, selectedFeedPost, feedPostIndex, getCurrentFeedPosts]);

  // ─── Pools / Comics ───
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(false);
  const [comicSearchInput, setComicSearchInput] = useState('');
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [poolPosts, setPoolPosts] = useState<PoolPost[]>([]);
  const [poolPostsLoading, setPoolPostsLoading] = useState(false);
  const [comicScale, setComicScale] = useState(100);
  const [comicAutoscroll, setComicAutoscroll] = useState(false);
  const [comicAutoscrollSpeed, setComicAutoscrollSpeed] = useState(1);
  const [poolScanProgress, setPoolScanProgress] = useState<{ current: number; total: number } | null>(null);
  const comicContainerRef = useRef<HTMLDivElement>(null);
  const poolScrollPositions = useRef<Map<number, number>>(new Map());

  const filteredPools = useMemo(() => {
    if (!comicSearchInput.trim()) return pools;
    const lower = comicSearchInput.toLowerCase().trim();
    if (lower.startsWith('pool:')) { const idStr = lower.replace('pool:', '').trim(); return pools.filter(p => p.pool_id.toString() === idStr); }
    return pools.filter(p => p.name.toLowerCase().includes(lower) || p.pool_id.toString() === lower);
  }, [pools, comicSearchInput]);

  const loadPools = useCallback(async () => {
    if (!sync.e621CredInfo.username || !sync.e621CredInfo.has_api_key) { toast("Set e621 credentials in Settings first.", "error"); return; }
    setPoolsLoading(true);
    setPoolScanProgress({ current: 0, total: 0 });
    try {
      const knownPoolIds: number[] = await invoke("get_known_pool_ids");
      const existingIds = new Set<number>();
      setPools(prev => { prev.forEach(p => existingIds.add(p.pool_id)); return prev; });
      const newDbPoolIds = knownPoolIds.filter(id => !existingIds.has(id));
      if (newDbPoolIds.length > 0) {
        const infos = await invoke<PoolInfo[]>("fetch_pool_infos_batch", { poolIds: newDbPoolIds });
        if (infos.length > 0) { setPools(prev => { const poolMap = new Map(prev.map(p => [p.pool_id, p])); infos.forEach(p => poolMap.set(p.pool_id, p)); const next = Array.from(poolMap.values()); next.sort((a, b) => a.name.localeCompare(b.name)); invoke("save_pools_cache", { pools: next }).catch(console.error); return next; }); infos.forEach(p => existingIds.add(p.pool_id)); }
      }
      const localIds: number[] = await invoke("get_unscanned_e621_ids");
      if (localIds.length === 0) return;
      setPoolScanProgress({ current: 0, total: localIds.length });
      const discoveredPoolIds = new Set<number>();
      for (let i = 0; i < localIds.length; i += 100) {
        const chunk = localIds.slice(i, i + 100);
        try { const foundPoolIds = await invoke<number[]>("check_posts_for_pools", { ids: chunk }); foundPoolIds.forEach(pid => { if (!existingIds.has(pid)) discoveredPoolIds.add(pid); }); } catch (err) { console.warn("Chunk scan error", err); }
        setPoolScanProgress({ current: Math.min(i + 100, localIds.length), total: localIds.length });
      }
      const newPoolIds = Array.from(discoveredPoolIds);
      if (newPoolIds.length > 0) {
        const infos = await invoke<PoolInfo[]>("fetch_pool_infos_batch", { poolIds: newPoolIds });
        if (infos.length > 0) { setPools(prev => { const poolMap = new Map(prev.map(p => [p.pool_id, p])); infos.forEach(p => poolMap.set(p.pool_id, p)); const next = Array.from(poolMap.values()); next.sort((a, b) => a.name.localeCompare(b.name)); invoke("save_pools_cache", { pools: next }).catch(console.error); return next; }); }
      }
    } catch (e) { toast("Failed to scan pools: " + String(e), "error"); }
    finally { setPoolsLoading(false); setPoolScanProgress(null); }
  }, [sync.e621CredInfo, toast]);

  const openPool = useCallback(async (pool: PoolInfo) => {
    setSelectedPool(pool);
    setPoolPostsLoading(true);
    try {
      const posts = await invoke<PoolPost[]>("get_pool_posts", { poolId: pool.pool_id });
      setPoolPosts(posts);
      requestAnimationFrame(() => { const saved = poolScrollPositions.current.get(pool.pool_id); if (saved && comicContainerRef.current) comicContainerRef.current.scrollTop = saved; });
    } catch (e) { toast("Failed to load pool posts: " + String(e), "error"); }
    finally { setPoolPostsLoading(false); }
  }, [toast]);

  const closePool = useCallback(() => {
    if (selectedPool && comicContainerRef.current) poolScrollPositions.current.set(selectedPool.pool_id, comicContainerRef.current.scrollTop);
    setSelectedPool(null);
    setPoolPosts([]);
    setComicAutoscroll(false);
  }, [selectedPool]);

  const handleClearPoolsCache = useCallback(() => {
    setConfirmModal({ title: "Clear Cache", message: "Are you sure you want to clear the comics cache? You will need to rescan to see them again.", okLabel: "Clear", onConfirm: async () => { try { await invoke("clear_pools_cache"); setPools([]); toast("Comics cache cleared.", "success"); } catch (e) { toast("Failed to clear cache: " + String(e), "error"); } } });
  }, [toast]);

  // ─── Trash ───
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashedItems, setTrashedItems] = useState<LibraryItem[]>([]);
  const [trashCount, setTrashCount] = useState(0);

  const loadTrash = useCallback(async () => {
    const rows = await invoke<ItemDto[]>("get_trashed_items");
    setTrashedItems(rows.map(mapItemDto));
    setShowTrashModal(true);
  }, []);

  const handleRestore = useCallback(async (itemId: number) => {
    await invoke("restore_item", { itemId });
    setTrashedItems(prev => prev.filter(i => i.item_id !== itemId));
    setTrashCount(prev => Math.max(0, prev - 1));
    lib.loadData(false);
  }, [lib]);

  const handleEmptyTrash = useCallback(() => {
    setConfirmModal({ title: "Empty Trash", message: "Permanently delete all items in trash? This cannot be undone.", okLabel: "Delete Forever", onConfirm: async () => { await invoke("empty_trash"); setTrashedItems([]); setTrashCount(0); } });
  }, []);

  // ─── Import ───
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFiles, setImportFiles] = useState<string[]>([]);
  const [importTagInput, setImportTagInput] = useState('');
  const [importTags, setImportTags] = useState<string[]>([]);
  const [importRating, setImportRating] = useState<string>('s');
  const [importSourceInput, setImportSourceInput] = useState('');
  const [importSources, setImportSources] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const selectImportFiles = useCallback(async () => {
    const files = await openDialog({ multiple: true, filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'] }, { name: 'Videos', extensions: ['mp4', 'webm'] }, { name: 'All Files', extensions: ['*'] }] });
    if (!files) return;
    const paths = Array.isArray(files) ? files : [files];
    setImportFiles(prev => { const set = new Set(prev); paths.forEach(p => set.add(p)); return Array.from(set); });
  }, []);

  const openImportModal = useCallback(async () => {
    const files = await openDialog({ multiple: true, filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'] }, { name: 'Videos', extensions: ['mp4', 'webm'] }, { name: 'All Files', extensions: ['*'] }] });
    if (!files) return;
    const paths = Array.isArray(files) ? files : [files];
    if (paths.length === 0) return;
    setImportFiles(paths); setImportTags([]); setImportTagInput(''); setImportRating('s'); setImportSources([]); setImportSourceInput(''); setShowImportModal(true);
  }, []);

  const handleImport = useCallback(async () => {
    if (importFiles.length === 0) return;
    setImportLoading(true);
    try {
      const result = await invoke<number>("import_local_files", { filePaths: importFiles, tags: importTags, rating: importRating, sources: importSources });
      toast(`Imported ${result} file(s).`, "success");
      setShowImportModal(false); setImportFiles([]); setImportTags([]); setImportRating('s'); setImportSources([]); setImportTagInput(''); setImportSourceInput('');
      await lib.loadData(false);
    } catch (e) { toast("Import failed: " + (e instanceof Error ? e.message : String(e)), "error"); }
    finally { setImportLoading(false); }
  }, [importFiles, importTags, importRating, importSources, lib, toast]);

  // ─── Edit modal ───
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [editingSources, setEditingSources] = useState<string[]>([]);
  const [editingRating, setEditingRating] = useState('s');
  const [newSourceInput, setNewSourceInput] = useState('');

  const openEditModal = useCallback(() => {
    if (!lib.currentItem) return;
    setEditingTags([...(lib.currentItem.tags || [])]);
    setEditingSources([...(lib.currentItem.sources || [])]);
    setEditingRating(lib.currentItem.rating || 's');
    setNewTagInput(''); setNewSourceInput('');
    setShowEditModal(true);
  }, [lib.currentItem]);

  const saveMetadata = useCallback(async () => {
    if (!lib.currentItem) return;
    try {
      await invoke("update_item_tags", { itemId: lib.currentItem.item_id, tags: editingTags });
      await invoke("update_item_rating", { itemId: lib.currentItem.item_id, rating: editingRating });
      await invoke("update_item_sources", { itemId: lib.currentItem.item_id, sources: editingSources });
      lib.setItems(prev => prev.map(item => item.item_id === lib.currentItem!.item_id ? { ...item, tags: editingTags, rating: editingRating, sources: editingSources } : item));
      setShowEditModal(false);
    } catch (error) { console.error("Failed to save metadata:", error); toast("Failed to save: " + String(error), "error"); }
  }, [lib.currentItem, editingTags, editingRating, editingSources, lib.setItems, toast]);

  const deleteCurrentItem = useCallback(async () => {
    if (!lib.currentItem) return;
    const deletedId = lib.currentItem.item_id;
    await invoke("trash_item", { itemId: deletedId });
    setTrashCount(prev => prev + 1);
    lib.setItems(prev => { const next = prev.filter(i => i.item_id !== deletedId); lib.itemsRef.current = next; lib.setCurrentIndex(ci => next.length === 0 ? 0 : Math.min(ci, next.length - 1)); return next; });
  }, [lib]);

  // ─── Confirm modal ───
  const [confirmModal, setConfirmModal] = useState<ConfirmOpts | null>(null);

  // ─── Library detail / navigation ───
  const ext = (lib.currentItem?.ext || "").toLowerCase();
  const isVideo = ext === 'mp4' || ext === 'webm';
  const detailVideoRef = useRef<HTMLVideoElement | null>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const feedDetailVideoRef = useRef<HTMLVideoElement | null>(null);
  const feedFullscreenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Auto-load more when near end in single view
  useEffect(() => {
    const threshold = Math.max(0, lib.itemCount - 50);
    if (lib.hasMoreItems && lib.currentIndex >= threshold && lib.itemCount > 0) {
      lib.loadMoreItems();
    }
  }, [lib.currentIndex, lib.itemCount, lib.hasMoreItems, lib.loadMoreItems]);

  // Image preloading
  const imageCacheRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (lib.itemCount === 0) return;
    const preloadIndexes = [lib.currentIndex, (lib.currentIndex + 1) % lib.itemCount, (lib.currentIndex + 2) % lib.itemCount, (lib.currentIndex - 1 + lib.itemCount) % lib.itemCount];
    const images: HTMLImageElement[] = [];
    preloadIndexes.forEach(idx => {
      const item = lib.items[idx];
      if (!item || imageCacheRef.current[item.url] || ["mp4", "webm"].includes((item.ext || "").toLowerCase())) return;
      const img = new Image(); img.src = item.url; img.onload = () => { imageCacheRef.current[item.url] = true; }; images.push(img);
    });
    return () => { images.forEach(img => { img.onload = null; img.onerror = null; img.src = "data:,"; }); };
  }, [lib.currentIndex, lib.itemCount, lib.items]);

  // Pool pools on item change
  useEffect(() => {
    if (!lib.currentItem || lib.currentItem.source !== 'e621') { lib.setCurrentPostPools([]); return; }
    let cancelled = false;
    invoke<PoolInfo[]>("get_post_pools", { sourceId: lib.currentItem.source_id }).then(pools => { if (!cancelled) lib.setCurrentPostPools(pools); }).catch(() => { if (!cancelled) lib.setCurrentPostPools([]); });
    return () => { cancelled = true; };
  }, [lib.currentItem?.item_id]);

  // Autoscroll
  const autoscrollTargetRef = useRef<HTMLElement | null>(null);
  const [autoscroll, setAutoscroll] = useState(false);
  const [autoscrollSpeed, setAutoscrollSpeed] = useState(1);
  useEffect(() => {
    if (!autoscroll) return;
    let frameId: number;
    const scroll = () => {
      if (!autoscrollTargetRef.current) { const candidates = document.querySelectorAll('.overflow-y-auto'); for (const el of candidates) { if (el.scrollHeight > el.clientHeight) { autoscrollTargetRef.current = el as HTMLElement; break; } } }
      if (autoscrollTargetRef.current) autoscrollTargetRef.current.scrollBy(0, autoscrollSpeed);
      else window.scrollBy(0, autoscrollSpeed);
      frameId = requestAnimationFrame(scroll);
    };
    frameId = requestAnimationFrame(scroll);
    return () => { cancelAnimationFrame(frameId); autoscrollTargetRef.current = null; };
  }, [autoscroll, autoscrollSpeed, activeTab]);

  // Comic autoscroll
  useEffect(() => {
    if (!comicAutoscroll || !comicContainerRef.current) return;
    let frameId: number;
    const scroll = () => { comicContainerRef.current?.scrollBy(0, comicAutoscrollSpeed); frameId = requestAnimationFrame(scroll); };
    frameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frameId);
  }, [comicAutoscroll, comicAutoscrollSpeed]);

  // Sort order/blacklist persist
  useEffect(() => { try { localStorage.setItem('preferred_sort_order', lib.sortOrder); } catch { /* ignore */ } }, [lib.sortOrder]);
  const [blacklist, setBlacklist] = useState(() => localStorage.getItem('blacklist_tags') || "");
  useEffect(() => { localStorage.setItem('blacklist_tags', blacklist); }, [blacklist]);
  useEffect(() => { persistSettings(); }, [blacklist]);
  useEffect(() => { persistSettings(); }, [lib.sortOrder]);
  useEffect(() => { persistSettings(); }, [lib.gridColumns]);
  useEffect(() => { persistSettings(); }, [lib.itemsPerPage]);
  useEffect(() => { persistSettings(); }, [feedDetailWidth]);
  useEffect(() => { document.documentElement.style.backgroundColor = '#0f0f17'; document.body.style.backgroundColor = '#0f0f17'; return () => { document.documentElement.style.backgroundColor = ''; document.body.style.backgroundColor = ''; }; }, []);

  // Tag search effect
  useEffect(() => {
    if (!lib.pendingTagSearchRef.current) return;
    lib.pendingTagSearchRef.current = false;
    lib.setItems([]);
    lib.itemsRef.current = [];
    lib.setSelectedItemIds(new Set());
    lib.setHasMoreItems(true);
    lib.loadData(false);
  }, [lib.selectedTags, lib.loadData]);

  // Reload on filter change
  const firstMountRef = useRef(true);
  useEffect(() => {
    const key = `${lib.sortOrder}|${lib.filterSource}|${lock.safeMode}`;
    if (lib.filterKeyRef.current === key) return;
    lib.filterKeyRef.current = key;
    if (firstMountRef.current) { firstMountRef.current = false; return; }
    if (!lib.initialLoading) {
      lib.loadRequestIdRef.current++;
      lib.itemsRef.current = [];
      lib.hasMoreRef.current = true;
      lib.setItems([]);
      lib.setSelectedItemIds(new Set());
      lib.setHasMoreItems(true);
      lib.setCurrentIndex(0);
      lib.loadData(false);
    }
  }, [lib.sortOrder, lib.filterSource, lock.safeMode]);

  // Init effect
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const locked = await invoke<boolean>("has_app_lock"); lock.setHasLock(locked); if (!locked) lock.setIsLocked(false); lock.setLockChecked(true); } catch { lock.setIsLocked(false); lock.setLockChecked(true); }
      lib.setInitialLoading(true);
      try {
        const cfg = await invoke<AppConfig>("get_config");
        const root = cfg.library_root || "";
        lib.setLibraryRoot(root);
        if (root) {
          try {
            const settingsJson = await invoke<string>("load_app_settings");
            const saved = JSON.parse(settingsJson || "{}");
            if (saved["grid_columns"]) { lib.setGridColumns(Number(saved["grid_columns"])); localStorage.setItem("grid_columns", saved["grid_columns"]); }
            if (saved["preferred_sort_order"]) { lib.setSortOrder(saved["preferred_sort_order"]); localStorage.setItem("preferred_sort_order", saved["preferred_sort_order"]); }
            if (saved["items_per_page"]) { lib.setItemsPerPage(Number(saved["items_per_page"])); localStorage.setItem("items_per_page", saved["items_per_page"]); }
            if (saved["blacklist_tags"] !== undefined) { setBlacklist(saved["blacklist_tags"]); localStorage.setItem("blacklist_tags", saved["blacklist_tags"]); }
            if (saved["feed_detail_width"]) { setFeedDetailWidth(Number(saved["feed_detail_width"])); localStorage.setItem("feed_detail_width", saved["feed_detail_width"]); }
            if (saved["library_detail_width"]) { lib.setLibraryDetailWidth(Number(saved["library_detail_width"])); localStorage.setItem("library_detail_width", saved["library_detail_width"]); }
            if (saved["e621_feeds"]) localStorage.setItem("e621_feeds", saved["e621_feeds"]);
          } catch (e) { console.warn("Failed to restore settings from library:", e); }
          await lib.loadData(false);
        } else { lib.setInitialLoading(false); }
        loadFeeds();
        await sync.refreshE621CredInfo();
        await sync.refreshFaCreds();
        await sync.refreshTwitterCreds();
        try { const cachedPools = await invoke<PoolInfo[]>("load_pools_cache"); if (cachedPools && cachedPools.length > 0 && !cancelled) setPools(cachedPools); } catch { console.warn("No pools cache found"); }
      } catch (error) { if (!cancelled) console.error("Failed to initialize:", error); }
      finally { if (!cancelled) lib.setInitialLoading(false); }
    })();
    invoke<number>("get_trash_count").then(setTrashCount).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Fullscreen exit handler
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        if (viewerOverlay && fullscreenVideoRef.current && isVideo) savedVideoTimeRef.current = fullscreenVideoRef.current.currentTime;
        if (feedViewerOverlay && feedFullscreenVideoRef.current) savedFeedVideoTimeRef.current = feedFullscreenVideoRef.current.currentTime;
        if (viewerOverlay) setViewerOverlay(false);
        if (feedViewerOverlay) setFeedViewerOverlay(false);
        if (isVideo) { setTimeout(() => { if (detailVideoRef.current) { if (savedVideoTimeRef.current > 0) { detailVideoRef.current.currentTime = savedVideoTimeRef.current; savedVideoTimeRef.current = 0; } detailVideoRef.current.play().catch(() => {}); } }, 300); }
        const isFeedVideo = selectedFeedPost && (selectedFeedPost.file.ext === 'webm' || selectedFeedPost.file.ext === 'mp4');
        if (isFeedVideo) { setTimeout(() => { if (feedDetailVideoRef.current) { if (savedFeedVideoTimeRef.current > 0) { feedDetailVideoRef.current.currentTime = savedFeedVideoTimeRef.current; savedFeedVideoTimeRef.current = 0; } feedDetailVideoRef.current.play().catch(() => {}); } }, 300); }
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [viewerOverlay, feedViewerOverlay, isVideo, selectedFeedPost]);

  // ─── Keyboard shortcuts ───
  useKeyboardShortcuts({
    activeTab, viewerOverlay, feedViewerOverlay,
    showSettings: false, showEditModal, showTrashModal, showAddFeedModal, showImportModal,
    showBulkTagModal: lib.showBulkTagModal,
    selectedPool, selectedFeedId, feedDetailOpen, selectedFeedPost,
    libraryDetailOpen: lib.libraryDetailOpen, confirmModal,
    selectedItemIds: lib.selectedItemIds, hasLock: lock.hasLock,
    setShowSettings: (v: boolean | ((prev: boolean) => boolean)) => { if (typeof v === 'boolean') { setSettingsTab('general'); setShowSettings(v); } },
    setShowEditModal, setShowTrashModal, setShowAddFeedModal, setShowImportModal,
    setShowBulkTagModal: lib.setShowBulkTagModal,
    setViewerOverlay, setFeedViewerOverlay,
    setConfirmModal: ((v: unknown) => { if (v === null || typeof v === 'object') setConfirmModal(v as ConfirmOpts | null); }) as (v: unknown) => void,
    setLibraryDetailOpen: lib.setLibraryDetailOpen,
    setFeedDetailOpen,
  setSelectedFeedPost: ((v: unknown) => { setSelectedFeedPost(v as E621Post | null); }) as (v: unknown) => void,
  setFeedPostIndex,
    setComicScale,
    pokeHud, goToPrev: (manual: boolean) => goToPrev(manual),
    goToNext: (manual: boolean) => goToNext(manual),
    openEditModal, closePool, deselectAll: lib.deselectAll, selectAll: lib.selectAll,
    goToPrevFeedPost, goToNextFeedPost,
    ensureFavorite: ensureFavorite as (feedId: number, post: unknown) => Promise<void>,
    setIsLockedTrue: lock.setIsLockedTrue,
    detailVideoRef, fullscreenVideoRef, feedDetailVideoRef, feedFullscreenVideoRef,
    savedVideoTimeRef, savedFeedVideoTimeRef, isVideo,
    selectedFeedPostData: selectedFeedPost as unknown as { file: { ext: string } } | null,
  });

  // goToPrev/goToNext for keyboard shortcuts
  const goToNext = useCallback((manual = false) => {
    if (viewerOverlay && manual) pokeHud();
    const len = lib.itemsRef.current.length;
    if (len === 0) return;
    if (lib.currentIndex >= len - 1 && lib.hasMoreRef.current) { lib.loadMoreItems(); return; }
    if (viewerOverlay) {
      setFadeIn(false);
      setTimeout(() => { lib.setCurrentIndex(prev => { const l = lib.itemsRef.current.length; return l === 0 ? 0 : (prev + 1) % l; }); requestAnimationFrame(() => setFadeIn(true)); }, 200);
    } else { lib.setCurrentIndex(prev => { const l = lib.itemsRef.current.length; return l === 0 ? 0 : (prev + 1) % l; }); }
  }, [viewerOverlay, pokeHud, lib]);

  const goToPrev = useCallback((manual = false) => {
    if (viewerOverlay && manual) pokeHud();
    if (viewerOverlay) {
      setFadeIn(false);
      setTimeout(() => { lib.setCurrentIndex(prev => { const len = lib.itemsRef.current.length; return len === 0 ? 0 : (prev - 1 + len) % len; }); requestAnimationFrame(() => setFadeIn(true)); }, 200);
    } else { lib.setCurrentIndex(prev => { const len = lib.itemsRef.current.length; return len === 0 ? 0 : (prev - 1 + len) % len; }); }
  }, [viewerOverlay, pokeHud, lib]);

  // Sync polling (e621)
  useEffect(() => {
    if (false) return; // Only poll when settings is shown
    // Handled inside SettingsPanel parent
  }, []);

  // Maintenance polling
  useEffect(() => {
    if (settingsTab !== 'maintenance') return;
    const anyRunning = sync.deletedCheckStatus?.running || sync.metaUpdateStatus?.running || sync.faUpgradeStatus?.running;
    if (!anyRunning) return;
    const tick = async () => {
      try {
        if (sync.deletedCheckStatus?.running) {
          const st = await invoke<MaintenanceProgress>("maintenance_deleted_check_status");
          sync.setDeletedCheckStatus(st);
          if (!st.running) { try { const results = await invoke<DeletedPostInfo[]>("maintenance_get_deleted_results"); sync.setDeletedResults(results); } catch { /* ignore */ } lib.loadData(false); }
        }
      } catch { /* ignore */ }
      try { if (sync.metaUpdateStatus?.running) { const st = await invoke<MaintenanceProgress>("maintenance_metadata_update_status"); sync.setMetaUpdateStatus(st); if (!st.running) lib.loadData(false); } } catch { /* ignore */ }
      try { if (sync.faUpgradeStatus?.running) { const st = await invoke<MaintenanceProgress>("maintenance_fa_upgrade_status"); sync.setFaUpgradeStatus(st); if (!st.running) lib.loadData(false); } } catch { /* ignore */ }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [settingsTab, sync.deletedCheckStatus?.running, sync.metaUpdateStatus?.running, sync.faUpgradeStatus?.running, lib.loadData]);

  // e621 sync sync status polling (when settings is open)
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    if (!showSettings) return;
    const tick = async () => {
      try {
        const st = await invoke<SyncStatus>("e621_sync_status");
        sync.setSyncStatus(st);
        if (sync.syncWasRunningRef.current && !st.running) { await lib.loadData(false); }
        sync.syncWasRunningRef.current = st.running;
      } catch { /* ignore */ }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [showSettings, lib.loadData]);

  // Trash count refresh
  useEffect(() => { if (showSettings) invoke<number>("get_trash_count").then(setTrashCount).catch(() => {}); }, [showSettings]);

  // Open external URL
  const openExternalUrl = useCallback(async (url: string) => {
    try { await openUrl(url); } catch (e) { console.error("Failed to open URL:", e); toast("Failed to open link.", "error"); }
  }, [toast]);

  // Change library root (extended version with more cleanup)
  const changeLibraryRootFull = useCallback(async () => {
    const dir = await openDialog({ directory: true, multiple: false });
    if (!dir || Array.isArray(dir)) return;
    await invoke("set_library_root", { libraryRoot: dir });
    await lib.refreshLibraryRoot();
    setPools([]);
    setSelectedPool(null);
    setPoolPosts([]);
    sync.setE621CredInfo({ username: null, has_api_key: false });
    sync.setApiUsername('');
    sync.setApiKey('');
    sync.setCredWarned(false);
    sync.credScreenDismissed.current = false;
    await sync.refreshE621CredInfo();
    await lib.loadData(false);
    try { const cachedPools = await invoke<PoolInfo[]>("load_pools_cache"); if (cachedPools?.length) setPools(cachedPools); } catch { /* no cache for new library */ }
  }, [lib, sync]);

  const shouldHideAutoscroll = showSettings || showEditModal || showTrashModal || activeTab === 'comics';

  // ─── RENDER ───
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f0f17] text-white">
      {/* Lock Screen */}
      {(!lock.lockChecked || (lock.isLocked && lock.hasLock)) && (
        <LockScreen
          lockChecked={lock.lockChecked}
          pinInput={lock.pinInput}
          pinError={lock.pinError}
          setPinInput={lock.setPinInput}
          setPinError={lock.setPinError}
          handleUnlock={lock.handleUnlock}
        />
      )}

      {/* Welcome Screen */}
      {lock.lockChecked && !lock.isLocked && !lib.libraryRoot && !lib.initialLoading && (
        <WelcomeScreen changeLibraryRoot={lib.changeLibraryRoot} />
      )}

      {/* Credentials Required Screen */}
      {lock.lockChecked && !lock.isLocked && !lib.initialLoading && lib.libraryRoot && !sync.e621CredInfo.has_api_key && !showSettings && !sync.credScreenDismissed.current && (
        <CredentialsScreen
          apiUsername={sync.apiUsername}
          apiKey={sync.apiKey}
          setApiUsername={sync.setApiUsername}
          setApiKey={sync.setApiKey}
          saveE621Credentials={sync.saveE621Credentials}
          openExternalUrl={openExternalUrl}
          onSkip={() => { sync.credScreenDismissed.current = true; }}
        />
      )}

      {/* Header */}
      <div className="border-b flex-shrink-0 border-[#1d1b2d] bg-[#161621]">
        <div className="px-4">
          <div className="flex items-center gap-4 py-2">
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setActiveTab('viewer')} className={`px-3 py-1.5 font-medium border-b-2 transition flex items-center gap-1.5 text-sm ${activeTab === 'viewer' ? 'border-[#967abc] text-[#967abc]' : 'border-transparent text-[#9e98aa] hover:text-white'}`}><Database className="w-3.5 h-3.5" />Library</button>
              <button onClick={() => { setActiveTab('feeds'); if (feeds.length > 0 && !selectedFeedId && !feedSearchInput) { const f = feeds[0]; setSelectedFeedId(f.id); if (!feedPosts[f.id] || feedPosts[f.id].length === 0) fetchFeedPosts(f.id, f.query, { reset: true }); } }} className={`px-3 py-1.5 font-medium border-b-2 transition flex items-center gap-1.5 text-sm ${activeTab === 'feeds' ? 'border-[#967abc] text-[#967abc]' : 'border-transparent text-[#9e98aa] hover:text-white'}`}><Rss className="w-3.5 h-3.5" />Discover</button>
              <button onClick={() => setActiveTab('comics')} className={`px-3 py-1.5 font-medium border-b-2 transition flex items-center gap-1.5 text-sm ${activeTab === 'comics' ? 'border-[#967abc] text-[#967abc]' : 'border-transparent text-[#9e98aa] hover:text-white'}`}><BookOpen className="w-3.5 h-3.5" />Comics</button>
            </div>

            <div className="flex flex-1 items-center gap-2 min-w-0">
              {(activeTab === 'viewer' || activeTab === 'comics') ? (
                <>
                  <div className="flex-1 min-w-[150px] relative">
                    {activeTab === 'comics' ? (
                      <><Search className="absolute left-3 top-2 w-3.5 h-3.5 text-[#4c4b5a]" />
                      <input type="text" placeholder="Search comics by name or pool:12345" value={comicSearchInput} onChange={(e) => setComicSearchInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc] text-white placeholder-[#4c4b5a]" /></>
                    ) : (
                      <div className="w-full relative flex items-center flex-wrap gap-1 min-h-[34px] pl-9 pr-3 py-1 rounded-xl bg-[#1c1b26] border border-[#1d1b2d] focus-within:border-[#967abc] transition-colors">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4c4b5a] pointer-events-none" />
                        {lib.selectedTags.map(tag => {
                          const isNegative = tag.startsWith('-');
                          return (
                            <span key={tag} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border cursor-pointer select-none ${isNegative ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-[#967abc]/25 text-[#967abc] border-[#967abc]/30'}`}
                              onClick={() => { lib.pendingTagSearchRef.current = true; lib.setSelectedTags(prev => prev.map(t => t === tag ? (isNegative ? tag.slice(1) : `-${tag}`) : t)); }}>
                              {isNegative && <span className="font-bold mr-0.5">−</span>}
                              {isNegative ? tag.slice(1) : tag}
                              <button onClick={(e) => { e.stopPropagation(); lib.pendingTagSearchRef.current = true; lib.toggleTag(tag); }} className="transition-colors"><X className="w-3 h-3" /></button>
                            </span>
                          );
                        })}
                        <div className="flex-1 min-w-[80px] relative">
                          <input type="text" placeholder={lib.selectedTags.length === 0 ? "Search tags..." : ""} value={lib.searchTags}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.endsWith(' ')) { const tag = val.trim().toLowerCase(); if (tag && !lib.selectedTags.includes(tag)) lib.setSelectedTags(prev => [...prev, tag]); lib.setSearchTags(''); lib.setShowSuggestions(false); }
                              else { lib.setSearchTags(val); if (lib.suggestionTimeoutRef.current) clearTimeout(lib.suggestionTimeoutRef.current); lib.suggestionTimeoutRef.current = setTimeout(() => lib.fetchTagSuggestions(val.trim()), 400); }
                            }}
                            onFocus={() => { if (lib.searchTags.trim().length >= 2) lib.fetchTagSuggestions(lib.searchTags.trim()); }}
                            onBlur={() => { setTimeout(() => lib.setShowSuggestions(false), 200); }}
                            onKeyDown={(e) => {
                              if (lib.showSuggestions && lib.tagSuggestions.length > 0) {
                                if (e.key === 'ArrowDown') { e.preventDefault(); lib.setSelectedSuggestionIndex(prev => Math.min(prev + 1, lib.tagSuggestions.length - 1)); return; }
                                if (e.key === 'ArrowUp') { e.preventDefault(); lib.setSelectedSuggestionIndex(prev => Math.max(prev - 1, -1)); return; }
                                if (e.key === 'Tab' && lib.selectedSuggestionIndex >= 0) { e.preventDefault(); const tag = lib.tagSuggestions[lib.selectedSuggestionIndex].name; if (!lib.selectedTags.includes(tag)) { lib.pendingTagSearchRef.current = true; lib.setSelectedTags(prev => [...prev, tag]); } lib.setSearchTags(''); lib.setShowSuggestions(false); return; }
                              }
                              if (e.key === 'Enter') { e.preventDefault(); const tag = lib.selectedSuggestionIndex >= 0 && lib.showSuggestions ? lib.tagSuggestions[lib.selectedSuggestionIndex].name : lib.searchTags.trim().toLowerCase(); if (tag && !lib.selectedTags.includes(tag)) { lib.pendingTagSearchRef.current = true; lib.setSelectedTags(prev => [...prev, tag]); lib.setSearchTags(''); } else if (!tag) { lib.setSearchTags(''); lib.setItems([]); lib.itemsRef.current = []; lib.setSelectedItemIds(new Set()); lib.setHasMoreItems(true); lib.loadData(false); } lib.setShowSuggestions(false); }
                              if (e.key === 'Escape') lib.setShowSuggestions(false);
                              if (e.key === 'Backspace' && lib.searchTags === '' && lib.selectedTags.length > 0) { lib.pendingTagSearchRef.current = true; lib.setSelectedTags(prev => prev.slice(0, -1)); }
                            }}
                            className="w-full bg-transparent text-sm text-white placeholder-[#4c4b5a] focus:outline-none py-0.5" />
                          {lib.showSuggestions && lib.tagSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto rounded-xl bg-[#161621] border border-[#1d1b2d] shadow-xl z-50">
                              {lib.tagSuggestions.map((s, i) => {
                                const typeColor = s.tag_type === 'artist' ? 'text-yellow-400' : s.tag_type === 'character' ? 'text-green-400' : s.tag_type === 'species' ? 'text-red-400' : s.tag_type === 'copyright' ? 'text-pink-400' : s.tag_type === 'meta' ? 'text-gray-400' : s.tag_type === 'lore' ? 'text-purple-300' : 'text-blue-300';
                                return (<button key={s.name} onMouseDown={(e) => { e.preventDefault(); if (!lib.selectedTags.includes(s.name)) { lib.pendingTagSearchRef.current = true; lib.setSelectedTags(prev => [...prev, s.name]); } lib.setSearchTags(''); lib.setShowSuggestions(false); }} className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${i === lib.selectedSuggestionIndex ? 'bg-[#967abc]/20' : 'hover:bg-[#1d1b2d]'}`}><span className={typeColor}>{s.name}</span></button>);
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {activeTab === 'viewer' && (
                    <>
                      <select value={lib.sortOrder} onChange={(e) => { lib.setSortOrder(e.target.value); (e.target as HTMLElement).blur(); }} className="px-3 py-1.5 text-sm rounded-xl focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]">
                        <option value="default">Default</option><option value="random">Random</option><option value="score">Score</option><option value="newest">Newest</option><option value="oldest">Oldest</option>
                      </select>
                      <select value={lib.filterSource} onChange={(e) => { lib.setFilterSource(e.target.value); (e.target as HTMLElement).blur(); }} className="px-3 py-1.5 text-sm rounded-xl focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]">
                        <option value="all">All</option><option value="e621">e621</option><option value="furaffinity">FurAffinity</option><option value="local">Local Import</option>
                      </select>
                    </>
                  )}
                </>
              ) : (
                <div className="flex-1 min-w-[150px] relative">
                  <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-[#4c4b5a]" />
                  <input type="text" placeholder="Search e621 tags..." value={feedSearchInput} onChange={(e) => setFeedSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && feedSearchInput.trim()) searchFeedPosts(feedSearchInput); }}
                    className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc] text-white placeholder-[#4c4b5a]" />
                </div>
              )}
            </div>
            <button onClick={openImportModal} className="p-1.5 flex-shrink-0 text-[#9e98aa] hover:text-white" title="Import Files"><Upload className="w-4 h-4" /></button>
            <button onClick={() => setShowSettings(true)} className="p-1.5 flex-shrink-0 text-[#9e98aa] hover:text-white" title="Settings"><Settings className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Feed Fullscreen Overlay */}
      {feedViewerOverlay && selectedFeedPost && (
        <div className="fixed inset-0 z-50 bg-black" onMouseMove={pokeHud} onMouseDown={pokeHud} onWheel={pokeHud} onTouchStart={pokeHud}>
          <div className="relative w-full h-full">
            <div className="absolute inset-y-0 left-0 w-1/5 z-10 cursor-pointer" onClick={goToPrevFeedPost} />
            <div className="absolute inset-y-0 right-0 w-1/5 z-10 cursor-pointer" onClick={goToNextFeedPost} />
            <div className="w-full h-full flex items-center justify-center relative">
              {selectedFeedPost.file.ext !== 'webm' && selectedFeedPost.file.ext !== 'mp4' && (
                <div className="absolute inset-0 scale-110 blur-3xl opacity-15" style={{ backgroundImage: `url(${selectedFeedPost.sample.url || selectedFeedPost.file.url || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              )}
              {selectedFeedPost.file.ext === 'webm' || selectedFeedPost.file.ext === 'mp4' ? (
                <video ref={feedFullscreenVideoRef} key={selectedFeedPost.id} src={selectedFeedPost.file.url || selectedFeedPost.sample.url || ''} controls autoPlay playsInline loop={!waitForVideoEnd || !feedSlideshow} muted={lock.globalMute || autoMuteVideos}
                  className={`w-full h-full object-contain transition-opacity duration-300 ${feedFadeIn ? "opacity-100" : "opacity-0"}`} style={{ pointerEvents: 'none' }}
                  onLoadedMetadata={(e) => { if (!lock.globalMute && !autoMuteVideos) (e.target as HTMLVideoElement).volume = 1.0; if (savedFeedVideoTimeRef.current > 0) { (e.target as HTMLVideoElement).currentTime = savedFeedVideoTimeRef.current; savedFeedVideoTimeRef.current = 0; } }}
                  onLoadedData={() => setFeedImageLoading(false)} onError={() => setFeedImageLoading(false)}
                  onEnded={() => { if (waitForVideoEnd && feedSlideshow) goToNextFeedPost(); }} />
              ) : (
                <img key={selectedFeedPost.id} src={selectedFeedPost.sample.url || selectedFeedPost.file.url || ''} alt=""
                  className={`w-full h-full object-contain transition-opacity duration-200 ${feedFadeIn ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setFeedImageLoading(false)} referrerPolicy="no-referrer" />
              )}
            </div>
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-300 ease-out ${showHud ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
              onMouseEnter={() => { hudHoverRef.current = true; setShowHud(true); }} onMouseLeave={() => { hudHoverRef.current = false; scheduleHudHide(); }}>
              <div className="relative z-20 px-6 py-4 bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-1.5">
                  <button onClick={goToPrevFeedPost} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setFeedSlideshow(!feedSlideshow)} className="p-1.5 bg-[#967abc] hover:bg-[#967abc]/80 rounded">{feedSlideshow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
                  <div className="relative" ref={speedSliderRef}>
                    <button onClick={() => setShowSpeedSlider(prev => !prev)} className="p-1.5 rounded bg-[#1d1b2d] hover:bg-[#4c4b5a] text-xs font-mono text-[#9e98aa] hover:text-white transition-colors">{slideshowSpeed / 1000}s</button>
                    {showSpeedSlider && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/95 backdrop-blur border border-gray-700/50 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                        <input type="range" min={1} max={15} step={1} value={slideshowSpeed / 1000} onChange={(e) => setSlideshowSpeed(Number(e.target.value) * 1000)} className="w-28 h-1.5 cursor-pointer accent-[#967abc]" />
                        <span className="text-[10px] font-mono text-[#9e98aa] w-6 text-right">{slideshowSpeed / 1000}s</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setAutoMuteVideos(v => !v)} className={`p-1.5 rounded ${autoMuteVideos ? 'bg-[#967abc] hover:bg-[#967abc]/80' : 'bg-[#1d1b2d] hover:bg-[#4c4b5a]'}`}>{autoMuteVideos ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                  <button onClick={() => setWaitForVideoEnd(v => !v)} className={`p-1.5 rounded ${waitForVideoEnd ? 'bg-[#967abc] hover:bg-[#967abc]/80' : 'bg-[#1d1b2d] hover:bg-[#4c4b5a]'}`}><Clock className="w-4 h-4" /></button>
                  <button onClick={async () => { const isFeedVideo = selectedFeedPost.file.ext === 'webm' || selectedFeedPost.file.ext === 'mp4'; if (isFeedVideo && feedFullscreenVideoRef.current) savedFeedVideoTimeRef.current = feedFullscreenVideoRef.current.currentTime; await document.exitFullscreen(); setFeedViewerOverlay(false); }} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded"><Maximize className="w-4 h-4" /></button>
                  <button onClick={() => ensureFavorite(selectedFeedId ?? -1, selectedFeedPost)} disabled={!!feedActionBusy[selectedFeedPost.id]}
                    className={`p-1.5 rounded ${selectedFeedPost.is_favorited ? 'bg-yellow-500 text-yellow-900' : 'bg-[#1d1b2d] hover:bg-[#4c4b5a]'}`}>
                    {feedActionBusy[selectedFeedPost.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${selectedFeedPost.is_favorited ? 'fill-current' : ''}`} />}
                  </button>
                  <button onClick={goToNextFeedPost} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded"><ChevronRight className="w-4 h-4" /></button>
                  <span className="text-xs text-[#4c4b5a] ml-1">{feedPostIndex + 1}/{getCurrentFeedPosts().length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay */}
      <ViewerOverlay
        currentItem={lib.currentItem as { url: string; ext?: string } | null}
        viewerOverlay={viewerOverlay}
        fadeIn={fadeIn}
        setImageLoading={setImageLoading}
        isVideo={isVideo}
        isSlideshow={isSlideshow}
        setIsSlideshow={setIsSlideshow}
        slideshowSpeed={slideshowSpeed}
        setSlideshowSpeed={setSlideshowSpeed}
        autoMuteVideos={autoMuteVideos}
        setAutoMuteVideos={setAutoMuteVideos}
        waitForVideoEnd={waitForVideoEnd}
        setWaitForVideoEnd={setWaitForVideoEnd}
        globalMute={lock.globalMute}
        showHud={showHud}
        pokeHud={pokeHud}
        scheduleHudHide={scheduleHudHide}
        hudHoverRef={hudHoverRef}
        goToPrev={goToPrev}
        goToNext={goToNext}
        setViewerOverlay={setViewerOverlay}
        currentIndex={lib.currentIndex}
        itemCount={lib.itemCount}
        fullscreenVideoRef={fullscreenVideoRef}
        savedVideoTimeRef={savedVideoTimeRef}
      />

      {/* Library Tab */}
      {activeTab === 'viewer' && (
        <LibraryPanel
          items={lib.items}
          currentIndex={lib.currentIndex}
          currentItem={lib.currentItem}
          itemCount={lib.itemCount}
          initialLoading={lib.initialLoading}
          isSearching={lib.isSearching}
          isLoadingMore={false}
          hasMoreItems={lib.hasMoreItems}
          libraryDetailOpen={lib.libraryDetailOpen}
          libraryDetailWidth={lib.libraryDetailWidth}
          currentPostPools={lib.currentPostPools}
          selectedItemIds={lib.selectedItemIds}
          showBulkTagModal={lib.showBulkTagModal}
          bulkTagInput={lib.bulkTagInput}
          bulkTagMode={lib.bulkTagMode}
          gridColumns={lib.gridColumns}
          fadeIn={fadeIn}
          imageLoading={imageLoading}
          isSlideshow={isSlideshow}
          slideshowSpeed={slideshowSpeed}
          autoMuteVideos={autoMuteVideos}
          waitForVideoEnd={waitForVideoEnd}
          globalMute={lock.globalMute}
          viewerOverlay={viewerOverlay}
          showSpeedSlider={showSpeedSlider}
          setLibraryDetailOpen={lib.setLibraryDetailOpen}
          setSelectedItemIds={lib.setSelectedItemIds}
          setShowBulkTagModal={lib.setShowBulkTagModal}
          setBulkTagInput={lib.setBulkTagInput}
          setBulkTagMode={lib.setBulkTagMode}
          setShowSettings={setShowSettings}
          setImageLoading={setImageLoading}
          setIsSlideshow={setIsSlideshow}
          setSlideshowSpeed={setSlideshowSpeed}
          setAutoMuteVideos={setAutoMuteVideos}
          setWaitForVideoEnd={setWaitForVideoEnd}
          setShowSpeedSlider={setShowSpeedSlider}
          setViewerOverlay={setViewerOverlay}
          setActiveTab={setActiveTab}
          setConfirmModal={setConfirmModal as (v: unknown) => void}
          loadMoreItems={lib.loadMoreItems}
          goToPrev={goToPrev}
          goToNext={goToNext}
          handleItemSelect={lib.handleItemSelect}
          handleGridClick={lib.handleGridClick}
          handleLibraryDetailResize={lib.handleLibraryDetailResize}
          selectAll={lib.selectAll}
          deselectAll={lib.deselectAll}
          openEditModal={openEditModal}
          bulkTrash={lib.bulkTrash}
          deleteCurrentItem={deleteCurrentItem}
          openPool={openPool}
          toggleTagAndSearch={lib.toggleTagAndSearch}
          changeLibraryRoot={changeLibraryRootFull}
          detailVideoRef={detailVideoRef}
          fullscreenVideoRef={fullscreenVideoRef}
          savedVideoTimeRef={savedVideoTimeRef}
          speedSliderRef={speedSliderRef}
          openExternalUrl={openExternalUrl}
          isVideo={isVideo}
        />
      )}

      {/* Feeds Tab */}
      {activeTab === 'feeds' && (
        <FeedsPanel
          feeds={feeds}
          feedPosts={feedPosts}
          loadingFeeds={loadingFeeds}
          feedPaging={feedPaging}
          selectedFeedId={selectedFeedId}
          feedSearchInput={feedSearchInput}
          feedSearchResults={feedSearchResults}
          feedSearchLoading={feedSearchLoading}
          feedDetailOpen={feedDetailOpen}
          feedDetailWidth={feedDetailWidth}
          selectedFeedPost={selectedFeedPost}
          feedPostIndex={feedPostIndex}
          feedSlideshow={feedSlideshow}
          feedFadeIn={feedFadeIn}
          feedImageLoading={feedImageLoading}
          feedViewerOverlay={feedViewerOverlay}
          showSpeedSlider={showSpeedSlider}
          feedActionBusy={feedActionBusy}
          gridColumns={lib.gridColumns}
          slideshowSpeed={slideshowSpeed}
          autoMuteVideos={autoMuteVideos}
          waitForVideoEnd={waitForVideoEnd}
          globalMute={lock.globalMute}
          e621CredInfo={sync.e621CredInfo}
          downloadedE621Ids={lib.downloadE621Ids()}
          feedDrag={feedDrag}
          showAddFeedModal={showAddFeedModal}
          newFeedName={newFeedName}
          newFeedQuery={newFeedQuery}
          editingFeedId={editingFeedId}
          setFeedSearchInput={setFeedSearchInput}
          setFeedSearchResults={setFeedSearchResults}
          setSelectedFeedId={setSelectedFeedId}
          setFeedDetailOpen={setFeedDetailOpen}
          setFeedDetailWidth={setFeedDetailWidth}
          setSelectedFeedPost={setSelectedFeedPost}
          setFeedPostIndex={setFeedPostIndex}
          setFeedSlideshow={setFeedSlideshow}
          setFeedFadeIn={setFeedFadeIn}
          setFeedImageLoading={setFeedImageLoading}
          setFeedViewerOverlay={setFeedViewerOverlay}
          setShowSpeedSlider={setShowSpeedSlider}
          setShowAddFeedModal={setShowAddFeedModal}
          setNewFeedName={setNewFeedName}
          setNewFeedQuery={setNewFeedQuery}
          setEditingFeedId={setEditingFeedId}
          setFeedDrag={setFeedDrag}
          setSlideshowSpeed={setSlideshowSpeed}
          setAutoMuteVideos={setAutoMuteVideos}
          setWaitForVideoEnd={setWaitForVideoEnd}
          fetchFeedPosts={fetchFeedPosts}
          searchFeedPosts={searchFeedPosts}
          removeFeed={removeFeed}
          saveFeeds={saveFeeds}
          ensureFavorite={ensureFavorite}
          goToPrevFeedPost={goToPrevFeedPost}
          goToNextFeedPost={goToNextFeedPost}
          openExternalUrl={openExternalUrl}
          feedsContainerRef={feedsContainerRef}
          feedPillRefs={feedPillRefs}
          speedSliderRef={speedSliderRef}
          feedDetailVideoRef={feedDetailVideoRef}
          feedFullscreenVideoRef={feedFullscreenVideoRef}
          savedFeedVideoTimeRef={savedFeedVideoTimeRef}
          feedDragStartRef={feedDragStartRef}
          feedDragRef={feedDragRef}
          feedDragCleanupRef={feedDragCleanupRef as React.MutableRefObject<(() => void) | null>}
          toast={toast}
        />
      )}

      {/* Comics Tab */}
      {activeTab === 'comics' && (
        <ComicsPanel
          activeTab={activeTab}
          selectedPool={selectedPool}
          pools={pools}
          poolsLoading={poolsLoading}
          poolPosts={poolPosts}
          poolPostsLoading={poolPostsLoading}
          filteredPools={filteredPools}
          comicScale={comicScale}
          comicAutoscroll={comicAutoscroll}
          comicAutoscrollSpeed={comicAutoscrollSpeed}
          poolScanProgress={poolScanProgress}
          setComicScale={setComicScale}
          setComicAutoscroll={setComicAutoscroll}
          setComicAutoscrollSpeed={setComicAutoscrollSpeed}
          loadPools={loadPools}
          openPool={openPool}
          closePool={closePool}
          handleClearPoolsCache={handleClearPoolsCache}
          comicContainerRef={comicContainerRef}
        />
      )}

      {/* Settings Modal */}
      <SettingsPanel
        toast={toast}
        showSettings={showSettings}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        setShowSettings={setShowSettings}
        libraryRoot={lib.libraryRoot}
        trashCount={trashCount}
        sortOrder={lib.sortOrder}
        setSortOrder={lib.setSortOrder}
        itemsPerPage={lib.itemsPerPage}
        gridColumns={lib.gridColumns}
        blacklist={blacklist}
        setBlacklist={setBlacklist}
        setGridColumns={lib.setGridColumns}
        changeLibraryRoot={changeLibraryRootFull}
        handlePageSizeChange={lib.handlePageSizeChange}
        loadTrash={loadTrash}
        e621CredInfo={sync.e621CredInfo}
        apiUsername={sync.apiUsername}
        setApiUsername={sync.setApiUsername}
        apiKey={sync.apiKey}
        setApiKey={sync.setApiKey}
        isEditingE621={sync.isEditingE621}
        setIsEditingE621={sync.setIsEditingE621}
        faCreds={sync.faCreds}
        setFaCreds={sync.setFaCreds}
        faCredsSet={sync.faCredsSet}
        setFaCredsSet={sync.setFaCredsSet}
        isEditingFA={sync.isEditingFA}
        setIsEditingFA={sync.setIsEditingFA}
        twitterUsername={sync.twitterUsername}
        setTwitterUsername={sync.setTwitterUsername}
        twitterPassword={sync.twitterPassword}
        setTwitterPassword={sync.setTwitterPassword}
        twitterCredsSet={sync.twitterCredsSet}
        setTwitterCredsSet={sync.setTwitterCredsSet}
        isEditingTwitter={sync.isEditingTwitter}
        setIsEditingTwitter={sync.setIsEditingTwitter}
        saveE621Credentials={sync.saveE621Credentials}
        refreshE621CredInfo={sync.refreshE621CredInfo}
        refreshFaCreds={sync.refreshFaCreds}
        refreshTwitterCreds={sync.refreshTwitterCreds}
        hasLock={lock.hasLock}
        lockNewPin={lock.lockNewPin}
        setLockNewPin={lock.setLockNewPin}
        lockConfirmPin={lock.lockConfirmPin}
        setLockConfirmPin={lock.setLockConfirmPin}
        lockRemovePin={lock.lockRemovePin}
        setLockRemovePin={lock.setLockRemovePin}
        safePinInput={lock.safePinInput}
        setSafePinInput={lock.setSafePinInput}
        handleSetLock={lock.handleSetLock}
        handleRemoveLock={lock.handleRemoveLock}
        syncMaxNew={sync.syncMaxNew}
        setSyncMaxNew={sync.setSyncMaxNew}
        syncFullMode={sync.syncFullMode}
        setSyncFullMode={sync.setSyncFullMode}
        syncStatus={sync.syncStatus}
        faLimit={sync.faLimit}
        setFaLimit={sync.setFaLimit}
        faStatus={sync.faStatus}
        twitterLimit={sync.twitterLimit}
        setTwitterLimit={sync.setTwitterLimit}
        twitterStatus={sync.twitterStatus}
        deletedCheckStatus={sync.deletedCheckStatus}
        metaUpdateStatus={sync.metaUpdateStatus}
        faUpgradeStatus={sync.faUpgradeStatus}
        deletedResults={sync.deletedResults}
        unfavoritingDeleted={sync.unfavoritingDeleted}
        unfavoriteProgress={sync.unfavoriteProgress}
        startSync={sync.startSync}
        cancelSync={sync.cancelSync}
        loadUnavailable={sync.loadUnavailable}
        startFaSync={sync.startFaSync}
        cancelFaSync={sync.cancelFaSync}
        startTwitterSync={sync.startTwitterSync}
        cancelTwitterSync={sync.cancelTwitterSync}
        startDeletedCheck={sync.startDeletedCheck}
        startMetadataUpdate={sync.startMetadataUpdate}
        startFaUpgrade={sync.startFaUpgrade}
        unfavoriteDeletedPosts={sync.unfavoriteDeletedPosts}
        setConfirmModal={setConfirmModal as (v: unknown) => void}
      />

      {/* Unavailable Modal */}
      {sync.showUnavailable && (
        <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => sync.setShowUnavailable(false)} />
          <div className="relative z-10 w-full max-w-3xl rounded-xl p-5 bg-[#161621] border border-[#1d1b2d]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Unavailable favorites</h2>
              <div className="flex items-center gap-2">
                {sync.unavailableList.length > 0 && (
                  <button onClick={sync.clearUnavailable} className="px-3 py-1 rounded-lg text-xs font-medium bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white transition-colors">Clear</button>
                )}
                <button onClick={() => sync.setShowUnavailable(false)} className="text-[#9e98aa] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {sync.unavailableList.length === 0 ? <div className="text-[#4c4b5a]">No unavailable posts recorded.</div>
                : sync.unavailableList.map((u) => (
                  <div key={`${u.source}:${u.source_id}`} className="rounded-xl p-3 bg-[#0f0f17] border border-[#1d1b2d]">
                    <div className="text-sm text-gray-200"><span className="text-[#9e98aa]">{u.source}</span> #{u.source_id} <span className="text-[#4c4b5a]">• {u.reason} • {u.seen_at}</span></div>
                    <div className="mt-2 text-xs space-y-1">{u.sources.length > 0 ? u.sources.map((s, i) => (<div key={i}><button onClick={() => openExternalUrl(s)} className="underline break-all text-[#967abc]">{s}</button></div>)) : <div className="text-[#4c4b5a]">No source links.</div>}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditModal
        showEditModal={showEditModal}
        editingRating={editingRating}
        editingSources={editingSources}
        editingTags={editingTags}
        newTagInput={newTagInput}
        newSourceInput={newSourceInput}
        setShowEditModal={setShowEditModal}
        setEditingRating={setEditingRating}
        setEditingSources={setEditingSources}
        setEditingTags={setEditingTags}
        setNewTagInput={setNewTagInput}
        setNewSourceInput={setNewSourceInput}
        saveMetadata={saveMetadata}
      />

      {/* Trash Modal */}
      {showTrashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTrashModal(false)} />
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col bg-[#161621] border border-[#1d1b2d]">
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0 border-[#1d1b2d]">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Trash2 className="w-5 h-5 text-[#9e98aa]" />Trash</h2>
              <div className="flex gap-2">
                <button onClick={handleEmptyTrash} disabled={trashedItems.length === 0} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 text-sm font-medium">Empty Trash</button>
                <button onClick={() => setShowTrashModal(false)} className="text-[#9e98aa] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {trashedItems.length > 0 ? (
                <Masonry breakpointCols={4} className="flex w-auto gap-3" columnClassName="flex flex-col gap-3">
                  {trashedItems.map((item) => {
                    const isVid = ["mp4", "webm"].includes((item.ext || "").toLowerCase());
                    return (
                      <div key={item.item_id} className="relative group rounded-lg overflow-hidden border bg-[#1c1b26] border-[#1d1b2d]">
                        {isVid ? <video src={item.url} className="w-full h-auto object-cover opacity-60" /> : <img src={item.url} className="w-full h-auto object-cover opacity-60" loading="lazy" alt="" />}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                          <button onClick={() => handleRestore(item.item_id)} className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white" title="Restore"><Pencil className="w-5 h-5 hidden" /><UndoIcon /></button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 text-xs text-center bg-[#0f0f17]/80 text-[#9e98aa]">{item.source} #{item.source_id}</div>
                      </div>
                    );
                  })}
                </Masonry>
              ) : (
                <div className="text-center py-20 text-[#4c4b5a]"><Trash2 className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>Trash is empty</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {lib.showBulkTagModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => lib.setShowBulkTagModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 bg-[#161621] border border-[#1d1b2d]">
            <h3 className="text-lg font-bold mb-2">{lib.bulkTagMode === 'add' ? 'Add Tag to' : 'Remove Tag from'} {lib.selectedItemIds.size} Items</h3>
            <p className="text-sm text-[#9e98aa] mb-4">{lib.bulkTagMode === 'add' ? 'This tag will be added to all selected items.' : 'This tag will be removed from all selected items.'}</p>
            <input type="text" placeholder="Enter tag..." value={lib.bulkTagInput}
              onChange={(e) => lib.setBulkTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { if (lib.bulkTagMode === 'add') lib.bulkAddTag(); else lib.bulkRemoveTag(); } }}
              autoFocus className="w-full px-4 py-2.5 rounded-xl mb-4 focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc] text-white placeholder-[#4c4b5a]" />
            <div className="flex justify-end gap-3">
              <button onClick={() => lib.setShowBulkTagModal(false)} className="px-4 py-2 rounded-xl transition-colors bg-[#1d1b2d] hover:bg-[#4c4b5a]">Cancel</button>
              <button onClick={() => { if (lib.bulkTagMode === 'add') lib.bulkAddTag(); else lib.bulkRemoveTag(); }} disabled={!lib.bulkTagInput.trim()}
                className={`px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${lib.bulkTagMode === 'add' ? 'bg-[#967abc] hover:bg-[#967abc]/80 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                {lib.bulkTagMode === 'add' ? 'Add Tag' : 'Remove Tag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        showImportModal={showImportModal}
        importFiles={importFiles}
        importTagInput={importTagInput}
        importTags={importTags}
        importRating={importRating}
        importSourceInput={importSourceInput}
        importSources={importSources}
        importLoading={importLoading}
        setShowImportModal={setShowImportModal}
        setImportFiles={setImportFiles}
        setImportTagInput={setImportTagInput}
        setImportTags={setImportTags}
        setImportRating={setImportRating}
        setImportSourceInput={setImportSourceInput}
        setImportSources={setImportSources}
        selectImportFiles={selectImportFiles}
        handleImport={handleImport}
      />

      {/* Confirm Modal */}
      <ConfirmModal confirmModal={confirmModal} setConfirmModal={setConfirmModal as (v: ConfirmOpts | null) => void} />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 text-xs border-t flex-shrink-0 bg-[#161621] border-[#1d1b2d] text-[#4c4b5a]">
        <span>TailBurrow v{APP_VERSION}</span>
        <span>{lib.itemCount} loaded • {lib.totalDatabaseItems} total</span>
        <button onClick={loadTrash} className="flex items-center gap-1.5 transition-colors hover:text-[#967abc]"><Trash2 className="w-3.5 h-3.5" />Trash ({trashCount})</button>
      </div>

      <AutoscrollWidget active={true} autoscroll={autoscroll} setAutoscroll={setAutoscroll} autoscrollSpeed={autoscrollSpeed} setAutoscrollSpeed={setAutoscrollSpeed}
        hidden={shouldHideAutoscroll}
        rightOffset={(activeTab === 'viewer' && lib.libraryDetailOpen && lib.currentItem) ? lib.libraryDetailWidth + 6 : (activeTab === 'feeds' && feedDetailOpen && selectedFeedPost) ? feedDetailWidth + 6 : 0}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function UndoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

export default function FavoritesViewer() {
  return (
    <ErrorBoundary>
      <FavoritesViewerInner />
    </ErrorBoundary>
  );
}