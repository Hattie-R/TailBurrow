import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, ItemDto, LibraryItem, PoolInfo } from "../types";
import { mapItemDto } from "../helpers";
import { useToast } from "./useToast";

export interface UseLibraryDataReturn {
  items: LibraryItem[];
  setItems: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
  itemsRef: React.MutableRefObject<LibraryItem[]>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  currentIndexRef: React.MutableRefObject<number>;
  currentItem: LibraryItem | null;
  itemCount: number;
  searchTags: string;
  setSearchTags: React.Dispatch<React.SetStateAction<string>>;
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  sortOrder: string;
  setSortOrder: React.Dispatch<React.SetStateAction<string>>;
  filterSource: string;
  setFilterSource: React.Dispatch<React.SetStateAction<string>>;
  initialLoading: boolean;
  setInitialLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isSearching: boolean;
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingMore: boolean;
  hasMoreItems: boolean;
  setHasMoreItems: React.Dispatch<React.SetStateAction<boolean>>;
  totalDatabaseItems: number;
  setTotalDatabaseItems: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  setItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
  hasMoreRef: React.MutableRefObject<boolean>;
  loadRequestIdRef: React.MutableRefObject<number>;
  tagSuggestions: { name: string; tag_type: string; count: number }[];
  setTagSuggestions: React.Dispatch<React.SetStateAction<{ name: string; tag_type: string; count: number }[]>>;
  showSuggestions: boolean;
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSuggestionIndex: number;
  setSelectedSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;
  isFetchingSuggestionsRef: React.MutableRefObject<boolean>;
  suggestionTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  pendingTagSearchRef: React.MutableRefObject<boolean>;
  libraryRoot: string;
  setLibraryRoot: React.Dispatch<React.SetStateAction<string>>;
  libraryDetailOpen: boolean;
  setLibraryDetailOpen: React.Dispatch<React.SetStateAction<boolean>>;
  libraryDetailWidth: number;
  setLibraryDetailWidth: React.Dispatch<React.SetStateAction<number>>;
  currentPostPools: PoolInfo[];
  setCurrentPostPools: React.Dispatch<React.SetStateAction<PoolInfo[]>>;
  selectedItemIds: Set<number>;
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  lastClickedIndex: number | null;
  setLastClickedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  showBulkTagModal: boolean;
  setShowBulkTagModal: React.Dispatch<React.SetStateAction<boolean>>;
  bulkTagInput: string;
  setBulkTagInput: React.Dispatch<React.SetStateAction<string>>;
  bulkTagMode: 'add' | 'remove';
  setBulkTagMode: React.Dispatch<React.SetStateAction<'add' | 'remove'>>;
  loadedFeedsRef: React.MutableRefObject<boolean>;
  downloadE621Ids: () => Set<number>;
  gridColumns: number;
  setGridColumns: React.Dispatch<React.SetStateAction<number>>;
  loadData: (append: boolean, overrides?: { pageSize?: number }) => Promise<void>;
  loadMoreItems: () => Promise<void>;
  refreshLibraryRoot: () => Promise<void>;
  changeLibraryRoot: () => Promise<void>;
  fetchTagSuggestions: (prefix: string) => Promise<void>;
  toggleTag: (tag: string) => void;
  toggleTagAndSearch: (tag: string) => void;
  handlePageSizeChange: (newSize: number) => Promise<void>;
  handleLibraryDetailResize: (clientX: number) => void;
  handleItemSelect: (index: number) => void;
  handleGridClick: (index: number, e: React.MouseEvent) => void;
  selectAll: () => void;
  deselectAll: () => void;
  bulkTrash: () => Promise<void>;
  bulkAddTag: () => Promise<void>;
  bulkRemoveTag: () => Promise<void>;
  filterKeyRef: React.MutableRefObject<string>;
}

export function useLibraryData(): UseLibraryDataReturn {
  const { toast } = useToast();

  // Core data
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [searchTags, setSearchTags] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<{ name: string; tag_type: string; count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingSuggestionsRef = useRef(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('preferred_sort_order') || 'default');
  const [filterSource, setFilterSource] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [libraryRoot, setLibraryRoot] = useState("");
  const [libraryDetailOpen, setLibraryDetailOpen] = useState(false);
  const [libraryDetailWidth, setLibraryDetailWidth] = useState(() =>
    Number(localStorage.getItem('library_detail_width') || 420)
  );
  const [currentPostPools, setCurrentPostPools] = useState<PoolInfo[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'remove'>('add');
  const [gridColumns, setGridColumns] = useState(() => Number(localStorage.getItem('grid_columns') || 5));

  // Paging
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [totalDatabaseItems, setTotalDatabaseItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('items_per_page') || 100));

  // Refs
  const loadingRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const currentIndexRef = useRef(0);
  const itemsRef = useRef<LibraryItem[]>([]);
  const hasMoreRef = useRef(true);
  const pendingTagSearchRef = useRef(false);
  const filterKeyRef = useRef("");
  const loadedFeedsRef = useRef(false);

  // Mirror refs
  const searchTagsRef = useRef(searchTags);
  const selectedTagsRef = useRef(selectedTags);
  const filterSourceRef = useRef(filterSource);
  const sortOrderRef = useRef(sortOrder);
  const safeModeRef = useRef(false);
  const itemsPerPageRef = useRef(itemsPerPage);

  useEffect(() => { searchTagsRef.current = searchTags; }, [searchTags]);
  useEffect(() => { selectedTagsRef.current = selectedTags; }, [selectedTags]);
  useEffect(() => { filterSourceRef.current = filterSource; }, [filterSource]);
  useEffect(() => { sortOrderRef.current = sortOrder; }, [sortOrder]);
  useEffect(() => { itemsPerPageRef.current = itemsPerPage; }, [itemsPerPage]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { hasMoreRef.current = hasMoreItems; }, [hasMoreItems]);

  // Derived
  const currentItem = items[currentIndex] || null;
  const itemCount = items.length;

  const downloadedE621Ids = useMemo(
    () => new Set(items.filter(it => it.source === "e621").map(it => Number(it.source_id))),
    [items]
  );

  const downloadE621Ids = useCallback(() => downloadedE621Ids, [downloadedE621Ids]);

  // Load data
  const loadData = useCallback(async (append: boolean, overrides?: { pageSize?: number }) => {
    const requestId = ++loadRequestIdRef.current;
    const limit = overrides?.pageSize ?? itemsPerPageRef.current;

    if (!append) {
      setIsSearching(true);
    }

    try {
      const offset = append ? itemsRef.current.length : 0;
      let combinedSearch = [searchTagsRef.current, ...selectedTagsRef.current].join(" ").trim();
      if (safeModeRef.current && !combinedSearch.includes("rating:")) {
        combinedSearch = combinedSearch ? `${combinedSearch} rating:s` : "rating:s";
      }
      const rows = await invoke<ItemDto[]>("list_items", {
        limit,
        offset,
        search: combinedSearch,
        source: filterSourceRef.current,
        order: sortOrderRef.current,
      });

      if (requestId !== loadRequestIdRef.current) return;

      if (!append) {
        const total = await invoke<number>("get_library_stats");
        if (requestId !== loadRequestIdRef.current) return;
        setTotalDatabaseItems(total);
      }

      setHasMoreItems(rows.length === limit);
      const mapped = rows.map(mapItemDto);

      setItems(prev => {
        const next = append ? [...prev, ...mapped] : mapped;
        itemsRef.current = next;
        return next;
      });

      if (!append) {
        setCurrentIndex(prev => {
          const newLen = mapped.length;
          return newLen === 0 ? 0 : Math.min(prev, newLen - 1);
        });
      }
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error("Failed to load library:", error);
      toast("Failed to load library. Please check your library settings.", "error");
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  }, [toast]);

  const loadMoreItems = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      await loadData(true);
    } finally {
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [loadData]);

  // Navigation
  const selectAll = useCallback(() => {
    setSelectedItemIds(new Set(items.map(i => i.item_id)));
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  // Library root
  const refreshLibraryRoot = useCallback(async () => {
    const cfg = await invoke<AppConfig>("get_config");
    setLibraryRoot(cfg.library_root || "");
  }, []);

  const changeLibraryRoot = useCallback(async () => {
    const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
    const dir = await openDialog({ directory: true, multiple: false });
    if (!dir || Array.isArray(dir)) return;
    await invoke("set_library_root", { libraryRoot: dir });
    await refreshLibraryRoot();
    setCurrentPostPools([]);
    setItems([]);
    itemsRef.current = [];
    setCurrentIndex(0);
  }, [refreshLibraryRoot]);

  // Tag suggestions
  const fetchTagSuggestions = useCallback(async (prefix: string) => {
    if (prefix.length < 2) {
      setTagSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (isFetchingSuggestionsRef.current) return;
    isFetchingSuggestionsRef.current = true;
    try {
      const results = await invoke<{ name: string; tag_type: string; count: number }[]>("search_tags", { prefix, limit: 8 });
      setTagSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedSuggestionIndex(-1);
    } catch {
      setTagSuggestions([]);
      setShowSuggestions(false);
    } finally {
      isFetchingSuggestionsRef.current = false;
    }
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const toggleTagAndSearch = useCallback((tag: string) => {
    pendingTagSearchRef.current = true;
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  // Page size
  const handlePageSizeChange = useCallback(async (newSize: number) => {
    setItemsPerPage(newSize);
    localStorage.setItem('items_per_page', String(newSize));
    setInitialLoading(true);
    try {
      await loadData(false, { pageSize: newSize });
    } finally {
      setInitialLoading(false);
    }
  }, [loadData]);

  // Detail pane resize
  const handleLibraryDetailResize = useCallback((clientX: number) => {
    const containerWidth = window.innerWidth;
    const newWidth = Math.max(300, Math.min(containerWidth - clientX, containerWidth * 0.6));
    setLibraryDetailWidth(newWidth);
    localStorage.setItem('library_detail_width', String(Math.round(newWidth)));
  }, []);

  // Item selection
  const handleItemSelect = useCallback((index: number) => {
    setCurrentIndex(index);
    setLibraryDetailOpen(true);
  }, []);

  const handleGridClick = useCallback((index: number, e: React.MouseEvent) => {
    const item = items[index];
    if (!item) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        if (next.has(item.item_id)) {
          next.delete(item.item_id);
        } else {
          next.add(item.item_id);
        }
        return next;
      });
      setLastClickedIndex(index);
      return;
    }

    if (e.shiftKey && lastClickedIndex !== null) {
      e.preventDefault();
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          if (items[i]) next.add(items[i].item_id);
        }
        return next;
      });
      return;
    }

    if (selectedItemIds.size > 0) {
      setSelectedItemIds(new Set());
    }
    setLastClickedIndex(index);
    handleItemSelect(index);
  }, [items, lastClickedIndex, selectedItemIds, handleItemSelect]);

  // Bulk operations
  const bulkTrash = useCallback(async () => {
    if (selectedItemIds.size === 0) return;
    const ids = Array.from(selectedItemIds);

    for (const id of ids) {
      await invoke("trash_item", { itemId: id });
    }

    const idSet = new Set(ids);
    setItems(prev => {
      const next = prev.filter(i => !idSet.has(i.item_id));
      itemsRef.current = next;
      setCurrentIndex(ci => {
        if (next.length === 0) return 0;
        return Math.min(ci, next.length - 1);
      });
      return next;
    });

    setSelectedItemIds(new Set());
    toast(`Moved ${ids.length} items to trash.`, "success");
  }, [selectedItemIds, toast]);

  const bulkAddTag = useCallback(async () => {
    const tag = bulkTagInput.trim().toLowerCase();
    if (!tag || selectedItemIds.size === 0) return;
    const ids = Array.from(selectedItemIds);
    for (const id of ids) {
      const item = items.find(i => i.item_id === id);
      if (!item) continue;
      const currentTags = [...(item.tags || [])];
      if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        await invoke("update_item_tags", { itemId: id, tags: currentTags });
      }
    }
    setItems(prev => prev.map(item => {
      if (selectedItemIds.has(item.item_id) && !item.tags.includes(tag)) {
        return { ...item, tags: [...item.tags, tag], tags_general: [...item.tags_general, tag] };
      }
      return item;
    }));
    setBulkTagInput('');
    setShowBulkTagModal(false);
    toast(`Added "${tag}" to ${ids.length} items.`, "success");
  }, [bulkTagInput, selectedItemIds, items, toast]);

  const bulkRemoveTag = useCallback(async () => {
    const tag = bulkTagInput.trim().toLowerCase();
    if (!tag || selectedItemIds.size === 0) return;
    const ids = Array.from(selectedItemIds);
    for (const id of ids) {
      const item = items.find(i => i.item_id === id);
      if (!item) continue;
      const currentTags = (item.tags || []).filter(t => t !== tag);
      await invoke("update_item_tags", { itemId: id, tags: currentTags });
    }
    setItems(prev => prev.map(item => {
      if (selectedItemIds.has(item.item_id)) {
        return {
          ...item,
          tags: item.tags.filter(t => t !== tag),
          tags_general: item.tags_general.filter(t => t !== tag),
          tags_artist: item.tags_artist.filter(t => t !== tag),
          tags_character: item.tags_character.filter(t => t !== tag),
          tags_copyright: item.tags_copyright.filter(t => t !== tag),
          tags_species: item.tags_species.filter(t => t !== tag),
          tags_meta: item.tags_meta.filter(t => t !== tag),
          tags_lore: item.tags_lore.filter(t => t !== tag),
        };
      }
      return item;
    }));
    setBulkTagInput('');
    setShowBulkTagModal(false);
    toast(`Removed "${tag}" from ${ids.length} items.`, "success");
  }, [bulkTagInput, selectedItemIds, items, toast]);

  return {
    items, setItems, itemsRef,
    currentIndex, setCurrentIndex, currentIndexRef,
    currentItem, itemCount,
    searchTags, setSearchTags,
    selectedTags, setSelectedTags,
    sortOrder, setSortOrder,
    filterSource, setFilterSource,
    initialLoading, setIsSearching, setInitialLoading,
    isSearching, isLoadingMore,
    hasMoreItems, setHasMoreItems,
    totalDatabaseItems, setTotalDatabaseItems,
    itemsPerPage, setItemsPerPage,
    hasMoreRef, loadRequestIdRef,
    tagSuggestions, setTagSuggestions,
    showSuggestions, setShowSuggestions,
    selectedSuggestionIndex, setSelectedSuggestionIndex,
    isFetchingSuggestionsRef, suggestionTimeoutRef,
    pendingTagSearchRef,
    libraryRoot, setLibraryRoot,
    libraryDetailOpen, setLibraryDetailOpen,
    libraryDetailWidth, setLibraryDetailWidth,
    currentPostPools, setCurrentPostPools,
    selectedItemIds, setSelectedItemIds,
    lastClickedIndex, setLastClickedIndex,
    showBulkTagModal, setShowBulkTagModal,
    bulkTagInput, setBulkTagInput,
    bulkTagMode, setBulkTagMode,
    loadedFeedsRef,
    downloadE621Ids,
    gridColumns, setGridColumns,
    loadData, loadMoreItems,
    refreshLibraryRoot, changeLibraryRoot,
    fetchTagSuggestions,
    toggleTag, toggleTagAndSearch,
    handlePageSizeChange,
    handleLibraryDetailResize,
    handleItemSelect, handleGridClick,
    selectAll, deselectAll,
    bulkTrash, bulkAddTag, bulkRemoveTag,
    filterKeyRef,
  };
}