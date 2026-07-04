import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  E621CredInfo, SyncStatus, UnavailableDto,
  FASyncStatus, TwitterSyncStatus,
  MaintenanceProgress, DeletedPostInfo,
} from "../types";
import { parsePositiveInt } from "../helpers";
import { useToast } from "./useToast";

export interface UseSyncStateReturn {
  // e621
  e621CredInfo: E621CredInfo;
  setE621CredInfo: React.Dispatch<React.SetStateAction<E621CredInfo>>;
  apiUsername: string;
  setApiUsername: React.Dispatch<React.SetStateAction<string>>;
  apiKey: string;
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
  credWarned: boolean;
  setCredWarned: React.Dispatch<React.SetStateAction<boolean>>;
  credScreenDismissed: React.MutableRefObject<boolean>;
  isEditingE621: boolean;
  setIsEditingE621: React.Dispatch<React.SetStateAction<boolean>>;
  syncMaxNew: string;
  setSyncMaxNew: React.Dispatch<React.SetStateAction<string>>;
  syncFullMode: boolean;
  setSyncFullMode: React.Dispatch<React.SetStateAction<boolean>>;
  syncStatus: SyncStatus | null;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus | null>>;
  showUnavailable: boolean;
  setShowUnavailable: React.Dispatch<React.SetStateAction<boolean>>;
  unavailableList: UnavailableDto[];
  setUnavailableList: React.Dispatch<React.SetStateAction<UnavailableDto[]>>;
  syncWasRunningRef: React.MutableRefObject<boolean>;

  // FA
  faCreds: FACreds;
  setFaCreds: React.Dispatch<React.SetStateAction<FACreds>>;
  faStatus: FASyncStatus | null;
  setFaStatus: React.Dispatch<React.SetStateAction<FASyncStatus | null>>;
  isEditingFA: boolean;
  setIsEditingFA: React.Dispatch<React.SetStateAction<boolean>>;
  faCredsSet: boolean;
  setFaCredsSet: React.Dispatch<React.SetStateAction<boolean>>;
  faLimit: string;
  setFaLimit: React.Dispatch<React.SetStateAction<string>>;

  // Twitter
  twitterUsername: string;
  setTwitterUsername: React.Dispatch<React.SetStateAction<string>>;
  twitterPassword: string;
  setTwitterPassword: React.Dispatch<React.SetStateAction<string>>;
  twitterCredsSet: boolean;
  setTwitterCredsSet: React.Dispatch<React.SetStateAction<boolean>>;
  isEditingTwitter: boolean;
  setIsEditingTwitter: React.Dispatch<React.SetStateAction<boolean>>;
  twitterStatus: TwitterSyncStatus | null;
  setTwitterStatus: React.Dispatch<React.SetStateAction<TwitterSyncStatus | null>>;
  twitterLimit: string;
  setTwitterLimit: React.Dispatch<React.SetStateAction<string>>;

  // Maintenance
  deletedCheckStatus: MaintenanceProgress | null;
  setDeletedCheckStatus: React.Dispatch<React.SetStateAction<MaintenanceProgress | null>>;
  metaUpdateStatus: MaintenanceProgress | null;
  setMetaUpdateStatus: React.Dispatch<React.SetStateAction<MaintenanceProgress | null>>;
  faUpgradeStatus: MaintenanceProgress | null;
  setFaUpgradeStatus: React.Dispatch<React.SetStateAction<MaintenanceProgress | null>>;
  deletedResults: DeletedPostInfo[];
  setDeletedResults: React.Dispatch<React.SetStateAction<DeletedPostInfo[]>>;
  unfavoritingDeleted: boolean;
  setUnfavoritingDeleted: React.Dispatch<React.SetStateAction<boolean>>;
  unfavoriteProgress: { current: number; total: number };
  setUnfavoriteProgress: React.Dispatch<React.SetStateAction<{ current: number; total: number }>>;

  // Actions
  refreshE621CredInfo: () => Promise<void>;
  saveE621Credentials: () => Promise<void>;
  startSync: () => Promise<void>;
  cancelSync: () => Promise<void>;
  loadUnavailable: () => Promise<void>;
  clearUnavailable: () => Promise<void>;
  refreshFaCreds: () => Promise<void>;
  startFaSync: () => Promise<void>;
  cancelFaSync: () => Promise<void>;
  refreshTwitterCreds: () => Promise<void>;
  startTwitterSync: () => Promise<void>;
  cancelTwitterSync: () => Promise<void>;
  startDeletedCheck: () => Promise<void>;
  startMetadataUpdate: () => Promise<void>;
  startFaUpgrade: () => Promise<void>;
  unfavoriteDeletedPosts: () => Promise<void>;
}

export interface FACreds {
  a: string;
  b: string;
}

export function useSyncState(loadData: (append: boolean) => Promise<void>): UseSyncStateReturn {
  const { toast } = useToast();

  // e621
  const [e621CredInfo, setE621CredInfo] = useState<E621CredInfo>({ username: null, has_api_key: false });
  const [apiUsername, setApiUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [credWarned, setCredWarned] = useState(false);
  const credScreenDismissed = useRef(false);
  const [isEditingE621, setIsEditingE621] = useState(false);
  const [syncMaxNew, setSyncMaxNew] = useState('');
  const [syncFullMode, setSyncFullMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [unavailableList, setUnavailableList] = useState<UnavailableDto[]>([]);
  const syncWasRunningRef = useRef(false);

  // FA
  const [faCreds, setFaCreds] = useState<FACreds>({ a: '', b: '' });
  const [faStatus, setFaStatus] = useState<FASyncStatus | null>(null);
  const [isEditingFA, setIsEditingFA] = useState(false);
  const [faCredsSet, setFaCredsSet] = useState(false);
  const [faLimit, setFaLimit] = useState('');
  const faSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Twitter
  const [twitterUsername, setTwitterUsername] = useState('');
  const [twitterPassword, setTwitterPassword] = useState('');
  const [twitterCredsSet, setTwitterCredsSet] = useState(false);
  const [isEditingTwitter, setIsEditingTwitter] = useState(false);
  const [twitterStatus, setTwitterStatus] = useState<TwitterSyncStatus | null>(null);
  const [twitterLimit, setTwitterLimit] = useState('');
  const twitterSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Maintenance
  const [deletedCheckStatus, setDeletedCheckStatus] = useState<MaintenanceProgress | null>(null);
  const [metaUpdateStatus, setMetaUpdateStatus] = useState<MaintenanceProgress | null>(null);
  const [faUpgradeStatus, setFaUpgradeStatus] = useState<MaintenanceProgress | null>(null);
  const [deletedResults, setDeletedResults] = useState<DeletedPostInfo[]>([]);
  const [unfavoritingDeleted, setUnfavoritingDeleted] = useState(false);
  const [unfavoriteProgress, setUnfavoriteProgress] = useState({ current: 0, total: 0 });

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (faSyncIntervalRef.current) clearInterval(faSyncIntervalRef.current);
      clearInterval(twitterSyncIntervalRef.current ?? undefined);
    };
  }, []);

  // ── e621 ──
  const refreshE621CredInfo = useCallback(async () => {
    const info = await invoke<E621CredInfo>("e621_get_cred_info");
    setE621CredInfo(info);
    if (info.username) setApiUsername(info.username);
  }, []);

  const saveE621Credentials = useCallback(async () => {
    await invoke("e621_set_credentials", { username: apiUsername, apiKey });
    setApiKey("");
    await refreshE621CredInfo();
    setCredWarned(false);
    toast("Saved e621 credentials.", "success");
  }, [apiUsername, apiKey, refreshE621CredInfo, toast]);

  const refreshSyncStatus = useCallback(async () => {
    setSyncStatus(await invoke<SyncStatus>("e621_sync_status"));
  }, []);

  const startSync = useCallback(async () => {
    const parsed = parsePositiveInt(syncMaxNew);
    if (!parsed.ok) { toast("Stop-after-N must be a positive number or blank.", "error"); return; }
    await invoke("e621_sync_start", { maxNewDownloads: parsed.value, forceFullSync: syncFullMode });
    syncWasRunningRef.current = true;
    await refreshSyncStatus();
  }, [syncMaxNew, syncFullMode, refreshSyncStatus, toast]);

  const cancelSync = useCallback(async () => {
    await invoke("e621_sync_cancel");
    await refreshSyncStatus();
  }, [refreshSyncStatus]);

  const loadUnavailable = useCallback(async () => {
    setUnavailableList(await invoke<UnavailableDto[]>("e621_unavailable_list", { limit: 200 }));
    setShowUnavailable(true);
  }, []);

  const clearUnavailable = useCallback(async () => {
    try {
      await invoke("e621_clear_unavailable");
      setUnavailableList([]);
    } catch (e) {
      console.error("Failed to clear unavailable list:", e);
    }
  }, []);

  // ── FA ──
  const refreshFaCreds = useCallback(async () => {
    try {
      const info = await invoke<{ has_creds: boolean }>("fa_get_cred_info");
      setFaCredsSet(info.has_creds);
    } catch (error) {
      console.error("Failed to check FA creds:", error);
    }
  }, []);

  const startFaSync = useCallback(async () => {
    if (!faCredsSet && (!faCreds.a || !faCreds.b)) {
      toast("Please save cookies first.", "error");
      return;
    }
    if (faCreds.a && faCreds.b) {
      await invoke("fa_set_credentials", { a: faCreds.a, b: faCreds.b });
      setFaCredsSet(true);
    }

    const parsed = parsePositiveInt(faLimit);
    if (!parsed.ok) { toast("Limit must be a positive number or blank.", "error"); return; }

    await invoke("fa_start_sync", { limit: parsed.value });

    if (faSyncIntervalRef.current) {
      clearInterval(faSyncIntervalRef.current);
    }

    faSyncIntervalRef.current = setInterval(async () => {
      const st = await invoke<FASyncStatus>("fa_sync_status");
      setFaStatus(st);
      if (!st.running) {
        if (faSyncIntervalRef.current) {
          clearInterval(faSyncIntervalRef.current);
          faSyncIntervalRef.current = null;
        }
        loadData(false);
      }
    }, 1000);
  }, [faCredsSet, faCreds, faLimit, loadData, toast]);

  const cancelFaSync = useCallback(async () => {
    await invoke("fa_cancel_sync");
  }, []);

  // ── Twitter ──
  const refreshTwitterCreds = useCallback(async () => {
    try {
      const info = await invoke<{ has_creds: boolean }>("twitter_get_cred_info");
      setTwitterCredsSet(info.has_creds);
    } catch (error) {
      console.error("Failed to check Twitter creds:", error);
    }
  }, []);

  const startTwitterSync = useCallback(async () => {
    if (!twitterCredsSet && (!twitterUsername || !twitterPassword)) {
      toast("Please save credentials first.", "error");
      return;
    }
    if (twitterUsername && twitterPassword) {
      await invoke("twitter_set_credentials", { username: twitterUsername, password: twitterPassword });
      setTwitterCredsSet(true);
    }

    const parsed = parsePositiveInt(twitterLimit);
    if (!parsed.ok) { toast("Limit must be a positive number or blank.", "error"); return; }

    await invoke("twitter_start_sync", { limit: parsed.value });
    clearInterval(twitterSyncIntervalRef.current ?? undefined);

    twitterSyncIntervalRef.current = setInterval(async () => {
      const st = await invoke<TwitterSyncStatus>("twitter_sync_status");
      setTwitterStatus(st);
      if (!st.running) {
        if (twitterSyncIntervalRef.current) {
          clearInterval(twitterSyncIntervalRef.current);
          twitterSyncIntervalRef.current = null;
        }
        loadData(false);
      }
    }, 1000);
  }, [twitterCredsSet, twitterUsername, twitterPassword, twitterLimit, loadData, toast]);

  const cancelTwitterSync = useCallback(async () => {
    await invoke("twitter_cancel_sync");
  }, []);


  const startDeletedCheck = useCallback(async () => {
    try {
      await invoke("maintenance_start_deleted_check");
      setDeletedCheckStatus({ running: true, current: 0, total: 0, message: "Starting..." });
    } catch (e) { toast("Failed: " + String(e), "error"); }
  }, [toast]);

  const startMetadataUpdate = useCallback(async () => {
    try {
      await invoke("maintenance_start_metadata_update");
      setMetaUpdateStatus({ running: true, current: 0, total: 0, message: "Starting..." });
    } catch (e) { toast("Failed: " + String(e), "error"); }
  }, [toast]);

  const startFaUpgrade = useCallback(async () => {
    try {
      await invoke("maintenance_start_fa_upgrade");
      setFaUpgradeStatus({ running: true, current: 0, total: 0, message: "Starting..." });
    } catch (e) { toast("Failed: " + String(e), "error"); }
  }, [toast]);

  const unfavoriteDeletedPosts = useCallback(async () => {
    const posts = deletedResults;
    if (posts.length === 0) return;

    setUnfavoritingDeleted(true);
    setUnfavoriteProgress({ current: 0, total: posts.length });

    let success = 0;
    for (let i = 0; i < posts.length; i++) {
      try {
        await invoke("e621_unfavorite", { postId: posts[i].post_id });
        success++;
      } catch (e) {
        console.error("Failed to unfavorite:", posts[i].post_id, e);
      }
      setUnfavoriteProgress({ current: i + 1, total: posts.length });
      await new Promise(r => setTimeout(r, 600));
    }

    setUnfavoritingDeleted(false);
    toast(`Unfavorited ${success} of ${posts.length} deleted posts from e621.`, "success");
  }, [deletedResults, toast]);

  return {
    e621CredInfo, setE621CredInfo,
    apiUsername, setApiUsername,
    apiKey, setApiKey,
    credWarned, setCredWarned,
    credScreenDismissed,
    isEditingE621, setIsEditingE621,
    syncMaxNew, setSyncMaxNew,
    syncFullMode, setSyncFullMode,
    syncStatus, setSyncStatus,
    showUnavailable, setShowUnavailable,
    unavailableList, setUnavailableList,
    syncWasRunningRef,
    faCreds, setFaCreds,
    faStatus, setFaStatus,
    isEditingFA, setIsEditingFA,
    faCredsSet, setFaCredsSet,
    faLimit, setFaLimit,
    twitterUsername, setTwitterUsername,
    twitterPassword, setTwitterPassword,
    twitterCredsSet, setTwitterCredsSet,
    isEditingTwitter, setIsEditingTwitter,
    twitterStatus, setTwitterStatus,
    twitterLimit, setTwitterLimit,
    deletedCheckStatus, setDeletedCheckStatus,
    metaUpdateStatus, setMetaUpdateStatus,
    faUpgradeStatus, setFaUpgradeStatus,
    deletedResults, setDeletedResults,
    unfavoritingDeleted, setUnfavoritingDeleted,
    unfavoriteProgress, setUnfavoriteProgress,
    refreshE621CredInfo,
    saveE621Credentials,
    startSync,
    cancelSync,
    loadUnavailable,
    clearUnavailable,
    refreshFaCreds,
    startFaSync,
    cancelFaSync,
    refreshTwitterCreds,
    startTwitterSync,
    cancelTwitterSync,
    startDeletedCheck,
    startMetadataUpdate,
    startFaUpgrade,
    unfavoriteDeletedPosts,
  };
}