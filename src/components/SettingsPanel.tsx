import {
  Settings, Database, Shield, RefreshCw, X, Trash2, Pencil,
  Loader2, Search, Star,
 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type {
  E621CredInfo, SyncStatus, FASyncStatus, TwitterSyncStatus,
  MaintenanceProgress, DeletedPostInfo, FACreds,
} from "../types";
import { APP_VERSION } from "../constants";
import { HelpTooltip } from "./HelpTooltip";
import { formatETA } from "../helpers";

interface SettingsPanelProps {
  showSettings: boolean;
  settingsTab: 'general' | 'credentials' | 'security' | 'maintenance';
  setSettingsTab: (v: 'general' | 'credentials' | 'security' | 'maintenance') => void;
  setShowSettings: (v: boolean) => void;

  // General
  libraryRoot: string;
  trashCount: number;
  sortOrder: string;
  setSortOrder: (v: string) => void;
  itemsPerPage: number;
  gridColumns: number;
  blacklist: string;
  setBlacklist: (v: string) => void;
  setGridColumns: (v: number | ((prev: number) => number)) => void;
  changeLibraryRoot: () => Promise<void>;
  handlePageSizeChange: (newSize: number) => Promise<void>;
  loadTrash: () => Promise<void>;

  // Credentials
  e621CredInfo: E621CredInfo;
  apiUsername: string;
  setApiUsername: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  isEditingE621: boolean;
  setIsEditingE621: (v: boolean) => void;
  faCreds: FACreds;
  setFaCreds: (v: FACreds | ((prev: FACreds) => FACreds)) => void;
  faCredsSet: boolean;
  setFaCredsSet: (v: boolean) => void;
  isEditingFA: boolean;
  setIsEditingFA: (v: boolean) => void;
  twitterUsername: string;
  setTwitterUsername: (v: string) => void;
  twitterPassword: string;
  setTwitterPassword: (v: string) => void;
  twitterCredsSet: boolean;
  setTwitterCredsSet: (v: boolean) => void;
  isEditingTwitter: boolean;
  setIsEditingTwitter: (v: boolean) => void;
  saveE621Credentials: () => Promise<void>;
  refreshE621CredInfo: () => Promise<void>;
  refreshFaCreds: () => Promise<void>;
  refreshTwitterCreds: () => Promise<void>;

  // Security
  hasLock: boolean;
  lockNewPin: string;
  setLockNewPin: (v: string) => void;
  lockConfirmPin: string;
  setLockConfirmPin: (v: string) => void;
  lockRemovePin: string;
  setLockRemovePin: (v: string) => void;
  safePinInput: string;
  setSafePinInput: (v: string) => void;
  handleSetLock: () => Promise<void>;
  handleRemoveLock: () => Promise<void>;

  // Maintenance
  syncMaxNew: string;
  setSyncMaxNew: (v: string) => void;
  syncFullMode: boolean;
  setSyncFullMode: (v: boolean) => void;
  syncStatus: SyncStatus | null;
  faLimit: string;
  setFaLimit: (v: string) => void;
  faStatus: FASyncStatus | null;
  twitterLimit: string;
  setTwitterLimit: (v: string) => void;
  twitterStatus: TwitterSyncStatus | null;
  deletedCheckStatus: MaintenanceProgress | null;
  metaUpdateStatus: MaintenanceProgress | null;
  faUpgradeStatus: MaintenanceProgress | null;
  deletedResults: DeletedPostInfo[];
  unfavoritingDeleted: boolean;
  unfavoriteProgress: { current: number; total: number };
  startSync: () => Promise<void>;
  cancelSync: () => Promise<void>;
  loadUnavailable: () => Promise<void>;
  startFaSync: () => Promise<void>;
  cancelFaSync: () => Promise<void>;
  startTwitterSync: () => Promise<void>;
  cancelTwitterSync: () => Promise<void>;
  startDeletedCheck: () => Promise<void>;
  startMetadataUpdate: () => Promise<void>;
  startFaUpgrade: () => Promise<void>;
  unfavoriteDeletedPosts: () => Promise<void>;

  setConfirmModal: (v: unknown) => void;
  toast: (msg: string, type: 'info' | 'error' | 'success') => void;
}

export function SettingsPanel({
  showSettings, settingsTab, setSettingsTab, setShowSettings,
  libraryRoot, trashCount, sortOrder, setSortOrder, itemsPerPage,
  gridColumns, blacklist, setBlacklist, setGridColumns,
  changeLibraryRoot, handlePageSizeChange, loadTrash,
  e621CredInfo, apiUsername, setApiUsername, apiKey, setApiKey,
  isEditingE621, setIsEditingE621,
  faCreds, setFaCreds, faCredsSet, setFaCredsSet, isEditingFA, setIsEditingFA,
  twitterUsername, setTwitterUsername, twitterPassword, setTwitterPassword,
  twitterCredsSet, setTwitterCredsSet, isEditingTwitter, setIsEditingTwitter,
  saveE621Credentials, refreshE621CredInfo, refreshFaCreds, refreshTwitterCreds,
  hasLock, lockNewPin, setLockNewPin, lockConfirmPin, setLockConfirmPin,
  lockRemovePin, setLockRemovePin, safePinInput, setSafePinInput,
  handleSetLock, handleRemoveLock,
  syncMaxNew, setSyncMaxNew, syncFullMode, setSyncFullMode, syncStatus,
  faLimit, setFaLimit, faStatus,
  twitterLimit, setTwitterLimit, twitterStatus,
  deletedCheckStatus, metaUpdateStatus, faUpgradeStatus,
  deletedResults, unfavoritingDeleted, unfavoriteProgress,
  startSync, cancelSync, loadUnavailable,
  startFaSync, cancelFaSync, startTwitterSync, cancelTwitterSync,
  startDeletedCheck, startMetadataUpdate, startFaUpgrade,
  unfavoriteDeletedPosts,
  setConfirmModal, toast,
}: SettingsPanelProps) {
  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => setShowSettings(false)} />
      <div className="relative z-10 w-full max-w-3xl h-[85vh] rounded-xl flex overflow-hidden bg-[#161621] border border-[#1d1b2d]">
        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 border-r border-[#1d1b2d] p-3 flex flex-col bg-[#131320]">
          <div className="flex-1 space-y-1">
            {([
              { id: 'general' as const, label: 'General', icon: Settings },
              { id: 'credentials' as const, label: 'Accounts', icon: Database },
              { id: 'security' as const, label: 'Security', icon: Shield },
              { id: 'maintenance' as const, label: 'Maintenance', icon: RefreshCw },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setSettingsTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${settingsTab === tab.id ? 'bg-[#967abc]/20 text-[#967abc] font-medium' : 'text-[#9e98aa] hover:text-white hover:bg-[#1d1b2d]'}`}>
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-[#4c4b5a] pt-3 border-t border-[#1d1b2d]">TailBurrow v{APP_VERSION}</div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1d1b2d] flex-shrink-0">
            <h2 className="text-lg font-semibold capitalize">{settingsTab === 'credentials' ? 'Accounts' : settingsTab}</h2>
            <button onClick={() => setShowSettings(false)} className="text-[#9e98aa] hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* GENERAL TAB */}
            {settingsTab === 'general' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9e98aa] mb-3">Library</h3>
                  <div className="text-xs text-gray-200 break-all rounded-xl p-2.5 bg-[#0f0f17] border border-[#1d1b2d] mb-3">{libraryRoot || "(not set)"}</div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={changeLibraryRoot} className="px-4 py-2 rounded-xl text-sm bg-[#967abc] hover:bg-[#967abc]/80">Change Library</button>
                    <button onClick={() => { setShowSettings(false); loadTrash(); }} className="px-4 py-2 rounded-xl text-sm flex items-center gap-2 bg-[#1d1b2d] hover:bg-[#4c4b5a]"><Trash2 className="w-3.5 h-3.5" />Trash ({trashCount})</button>
                    <button onClick={() => setConfirmModal({ title: "Unload Library", message: "Unload the current library?", okLabel: "Yes, unload", onConfirm: async () => { try { await invoke("clear_library_root"); /* parent handles reset */ setShowSettings(false); } catch (e) { toast("Failed to unload: " + String(e), "error"); } } })} className="px-4 py-2 rounded-xl text-sm bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white">Unload</button>
                  </div>
                </div>
                <div className="border-t border-[#1d1b2d] pt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9e98aa] mb-3">Viewer</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#9e98aa] mb-1 block">Default sort order</label>
                      <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]">
                        <option value="default">Default</option><option value="random">Random</option><option value="score">Score</option><option value="newest">Newest</option><option value="oldest">Oldest</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#9e98aa] mb-1 block">Items per batch</label>
                      <select value={itemsPerPage} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]">
                        <option value={50}>50</option><option value={100}>100 (Recommended)</option><option value={200}>200</option><option value={500}>500</option><option value={1000}>1000</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#9e98aa] mb-1 block flex justify-between"><span>Grid Columns</span><span className="font-mono text-[#967abc]">{gridColumns}</span></label>
                      <input type="range" min="1" max="8" value={gridColumns} onChange={(e) => { const val = Number(e.target.value); setGridColumns(val); localStorage.setItem('grid_columns', String(val)); }} className="w-full cursor-pointer accent-[#967abc] mt-1" />
                    </div>
                    <div className="row-span-2">
                      <label className="text-xs text-[#9e98aa] mb-1 block">Blacklist (Feeds Only)</label>
                      <textarea value={blacklist} onChange={(e) => setBlacklist(e.target.value)} placeholder="Tags to hide..." className="w-full px-3 py-2 rounded-xl h-20 min-h-[42px] focus:outline-none text-sm resize-y bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* CREDENTIALS TAB */}
            {settingsTab === 'credentials' && (
              <>
                {/* e621 */}
                <div>
                  <div className="flex items-center mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9e98aa]">e621</h3>
                    <HelpTooltip text={<div>1. Go to e621.net<br />2. Click <b>Settings</b> (top right)<br />3. Go to <b>Basic &gt; Account &gt; API Keys</b><br />4. Generate/Copy your API Key</div>} />
                  </div>
                  {e621CredInfo.has_api_key && !isEditingE621 ? (
                    <div className="flex items-center justify-between p-3 rounded-xl mb-3 bg-[#0f0f17] border border-green-900/50">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-sm text-gray-300">Credentials saved ({e621CredInfo.username})</span></div>
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingE621(true)} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded text-[#9e98aa] hover:text-white" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmModal({ title: "Clear Credentials", message: "Clear e621 credentials?", okLabel: "Clear", onConfirm: async () => { await invoke("e621_clear_credentials"); setApiUsername(""); setApiKey(""); await refreshE621CredInfo(); } })} className="p-1.5 bg-red-900/50 hover:bg-red-600 rounded text-red-200 hover:text-white" title="Clear"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex gap-2 mb-2">
                        <input type="text" placeholder="Username" value={apiUsername} onChange={(e) => setApiUsername(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
                        <input type="password" placeholder="API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => { await saveE621Credentials(); setIsEditingE621(false); }} className="px-4 py-2 rounded-xl text-sm bg-[#967abc] hover:bg-[#967abc]/80">Save</button>
                        {e621CredInfo.has_api_key && <button onClick={() => setIsEditingE621(false)} className="px-4 py-2 rounded-xl text-sm bg-[#1d1b2d] hover:bg-[#4c4b5a]">Cancel</button>}
                      </div>
                    </div>
                  )}
                </div>

                {/* FA */}
                <div className="border-t border-[#1d1b2d] pt-5">
                  <div className="flex items-center mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9e98aa]">FurAffinity</h3>
                    <HelpTooltip text={<div>1. Login to FurAffinity in browser<br />2. Press <b>F12</b> (Dev Tools) &gt; <b>Application</b> tab<br />3. Under <b>Cookies</b>, find <b>furaffinity.net</b><br />4. Copy values for <b>a</b> and <b>b</b></div>} />
                  </div>
                  {faCredsSet && !isEditingFA ? (
                    <div className="flex items-center justify-between p-3 rounded-xl mb-3 bg-[#0f0f17] border border-green-900/50">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-sm text-gray-300">Cookies saved</span></div>
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingFA(true)} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded text-[#9e98aa] hover:text-white" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmModal({ title: "Clear Cookies", message: "Clear FurAffinity cookies?", okLabel: "Clear", onConfirm: () => { setFaCredsSet(false); setFaCreds({ a: '', b: '' }); setIsEditingFA(true); } })} className="p-1.5 bg-red-900/50 hover:bg-red-600 rounded text-red-200 hover:text-white" title="Clear"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex gap-2 mb-2">
                        <input type="text" placeholder="Cookie A" value={faCreds.a} onChange={e => setFaCreds(prev => ({ ...prev, a: e.target.value }))} className="flex-1 px-3 py-2 rounded-xl text-sm bg-[#1c1b26] border border-[#1d1b2d]" />
                        <input type="text" placeholder="Cookie B" value={faCreds.b} onChange={e => setFaCreds(prev => ({ ...prev, b: e.target.value }))} className="flex-1 px-3 py-2 rounded-xl text-sm bg-[#1c1b26] border border-[#1d1b2d]" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => { if (!faCreds.a || !faCreds.b) { toast("Enter both cookies.", "error"); return; } await invoke("fa_set_credentials", { a: faCreds.a, b: faCreds.b }); setFaCredsSet(true); await refreshFaCreds(); setIsEditingFA(false); setFaCreds({ a: '', b: '' }); }} className="px-4 py-2 rounded-xl text-sm bg-[#967abc] hover:bg-[#967abc]/80">Save</button>
                        {faCredsSet && <button onClick={() => setIsEditingFA(false)} className="px-4 py-2 rounded-xl text-sm bg-[#1d1b2d] hover:bg-[#4c4b5a]">Cancel</button>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Twitter */}
                <div className="border-t border-[#1d1b2d] pt-5 mt-5">
                  <div className="flex items-center mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9e98aa]">Twitter / X</h3>
                    <HelpTooltip text={<div>Import your bookmarked tweets.</div>} />
                  </div>
                  {twitterCredsSet && !isEditingTwitter ? (
                    <div className="flex items-center justify-between p-3 rounded-xl mb-3 bg-[#0f0f17] border border-green-900/50">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-sm text-gray-300">Credentials saved</span></div>
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingTwitter(true)} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded text-[#9e98aa] hover:text-white" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmModal({ title: "Clear Credentials", message: "Clear Twitter credentials?", okLabel: "Clear", onConfirm: async () => { await invoke("twitter_clear_credentials"); setTwitterUsername(""); setTwitterPassword(""); setTwitterCredsSet(false); } })} className="p-1.5 bg-red-900/50 hover:bg-red-600 rounded text-red-200 hover:text-white" title="Clear"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex gap-2 mb-2">
                        <input type="text" placeholder="Username or Email" value={twitterUsername} onChange={(e) => setTwitterUsername(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm bg-[#1c1b26] border border-[#1d1b2d]" />
                        <input type="password" placeholder="Password" value={twitterPassword} onChange={(e) => setTwitterPassword(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm bg-[#1c1b26] border border-[#1d1b2d]" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => { if (!twitterUsername || !twitterPassword) { toast("Enter both username and password.", "error"); return; } await invoke("twitter_set_credentials", { username: twitterUsername, password: twitterPassword }); setTwitterCredsSet(true); await refreshTwitterCreds(); setIsEditingTwitter(false); setTwitterUsername(''); setTwitterPassword(''); }} className="px-4 py-2 rounded-xl text-sm bg-[#967abc] hover:bg-[#967abc]/80">Save</button>
                        {twitterCredsSet && <button onClick={() => setIsEditingTwitter(false)} className="px-4 py-2 rounded-xl text-sm bg-[#1d1b2d] hover:bg-[#4c4b5a]">Cancel</button>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* SECURITY TAB */}
            {settingsTab === 'security' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9e98aa] mb-1">App Lock</h3>
                  <p className="text-xs text-[#4c4b5a] mb-3">Require a PIN to open the app. Auto-locks when window loses focus.</p>
                  {hasLock ? (
                    <div>
                      <div className="flex items-center gap-2 p-3 rounded-xl mb-3 bg-[#0f0f17] border border-green-900/50"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-sm text-gray-300">Lock is enabled</span></div>
                      <div className="flex gap-2">
                        <input type="password" placeholder="Current PIN" value={lockRemovePin} onChange={(e) => setLockRemovePin(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
                        <button onClick={handleRemoveLock} className="px-4 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700">Remove Lock</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="password" placeholder="New PIN (min 4)" value={lockNewPin} onChange={(e) => setLockNewPin(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
                      <input type="password" placeholder="Confirm PIN" value={lockConfirmPin} onChange={(e) => setLockConfirmPin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSetLock(); }} className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
                      <button onClick={handleSetLock} className="px-4 py-2 rounded-xl text-sm bg-[#967abc] hover:bg-[#967abc]/80">Set Lock</button>
                    </div>
                  )}
                </div>
                {hasLock && (
                  <div className="border-t border-[#1d1b2d] pt-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9e98aa] mb-1">Safe Mode PIN</h3>
                    <p className="text-xs text-[#4c4b5a] mb-3">A separate PIN that opens the app showing only safe-rated content. No visible indicator.</p>
                    <div className="flex gap-2">
                      <input type="password" placeholder="Safe PIN (min 4)" value={safePinInput} onChange={(e) => setSafePinInput(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
                      <button onClick={async () => { if (safePinInput.length < 4) { toast("PIN must be at least 4 characters.", "error"); return; } try { await invoke("set_safe_pin", { pin: safePinInput }); setSafePinInput(''); toast("Safe mode PIN set.", "success"); } catch (e) { toast(String(e), "error"); } }} className="px-4 py-2 rounded-xl text-sm bg-[#967abc] hover:bg-[#967abc]/80">Set</button>
                      <button onClick={async () => { if (!safePinInput) { toast("Enter current safe PIN to remove.", "error"); return; } try { await invoke("clear_safe_pin", { pin: safePinInput }); setSafePinInput(''); toast("Safe mode PIN removed.", "success"); } catch (e) { toast(String(e), "error"); } }} className="px-4 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700">Remove</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* MAINTENANCE TAB */}
            {settingsTab === 'maintenance' && (
              <>
                {/* e621 sync */}
                <div className="rounded-xl border border-[#1d1b2d] bg-[#1c1b26] p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9e98aa] mb-2">e621 Sync</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <input type="text" placeholder="Limit (optional)" value={syncMaxNew} onChange={(e) => setSyncMaxNew(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#0f0f17] border border-[#1d1b2d] focus:border-[#967abc]" />
                      <button onClick={startSync} disabled={!!syncStatus?.running || !e621CredInfo.has_api_key} className="px-4 py-2 rounded-xl text-sm bg-[#967abc] hover:bg-[#967abc]/80 disabled:opacity-40 disabled:cursor-not-allowed">{syncStatus?.running ? "Syncing..." : "Start"}</button>
                      {syncStatus?.running && <button onClick={cancelSync} className="px-3 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700">Stop</button>}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[#9e98aa] cursor-pointer select-none">
                      <button type="button" onClick={() => setSyncFullMode(!syncFullMode)} className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${syncFullMode ? 'bg-[#967abc] border-[#967abc]' : 'bg-[#1c1b26] border-[#4c4b5a] hover:border-[#967abc]'}`}>
                        {syncFullMode && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </button>
                      Full sync (don't stop early when catching up)
                    </label>
                  </div>
                  {syncStatus && (syncStatus.running || syncStatus.scanned_pages > 0) && (
                    <div className="mt-3 text-xs text-[#9e98aa] space-y-0.5">
                      <div>Pages: {syncStatus.scanned_pages} • Posts: {syncStatus.scanned_posts}</div>
                      <div>Skipped: {syncStatus.skipped_existing} • Downloaded: {syncStatus.downloaded_ok}</div>
                      <div>Failed: {syncStatus.failed_downloads} • Unavailable: {syncStatus.unavailable}</div>
                      {syncStatus.last_error && <div className="text-red-300 break-words">Error: {syncStatus.last_error}</div>}
                      <button onClick={loadUnavailable} className="mt-1 text-[#967abc] hover:underline text-xs">View unavailable →</button>
                    </div>
                  )}
                </div>

                {/* FA Sync */}
                <div className="rounded-xl border border-[#1d1b2d] bg-[#1c1b26] p-3 mt-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9e98aa] mb-2">FurAffinity Sync</h4>
                  <div className="flex gap-2 items-center">
                    <input type="text" placeholder="Limit (optional)" value={faLimit} onChange={(e) => setFaLimit(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#0f0f17] border border-[#1d1b2d] focus:border-[#967abc]" />
                    <button onClick={startFaSync} disabled={faStatus?.running || (!faCredsSet && !isEditingFA)} className="px-4 py-2 rounded-xl text-sm bg-[#967abc] hover:bg-[#967abc]/80 disabled:opacity-40 disabled:cursor-not-allowed">{faStatus?.running ? "Syncing..." : "Start"}</button>
                    {faStatus?.running && <button onClick={cancelFaSync} className="px-3 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700">Stop</button>}
                  </div>
                  {faStatus && (faStatus.running || faStatus.scanned > 0) && (
                    <div className="mt-3 text-xs text-[#9e98aa] space-y-0.5">
                      <div>{faStatus.current_message}</div>
                      <div>Scanned: {faStatus.scanned} • Skip URL: {faStatus.skipped_url} • Skip MD5: {faStatus.skipped_md5}</div>
                      <div className="text-purple-400">Upgraded to e621: {faStatus.upgraded}</div>
                      <div className="text-green-400">FA Exclusives: {faStatus.imported}</div>
                      <div>Errors: {faStatus.errors}</div>
                      {faStatus.last_error && <div className="text-red-300 break-words">Error: {faStatus.last_error}</div>}
                    </div>
                  )}
                </div>

                {/* Twitter Sync */}
                <div className="rounded-xl border border-[#1d1b2d] bg-[#1c1b26] p-3 mt-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9e98aa] mb-2">Twitter Bookmark Sync</h4>
                  <div className="flex gap-2 items-center">
                    <input type="text" placeholder="Limit (optional)" value={twitterLimit} onChange={(e) => setTwitterLimit(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-[#0f0f17] border border-[#1d1b2d] focus:border-[#967abc]" />
                    <button onClick={startTwitterSync} disabled={twitterStatus?.running || (!twitterCredsSet && !isEditingTwitter)} className="px-4 py-2 rounded-xl text-sm bg-[#967abc] hover:bg-[#967abc]/80 disabled:opacity-40 disabled:cursor-not-allowed">{twitterStatus?.running ? "Syncing..." : "Start"}</button>
                    {twitterStatus?.running && <button onClick={cancelTwitterSync} className="px-3 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700">Stop</button>}
                  </div>
                  {twitterStatus && (twitterStatus.running || twitterStatus.scanned > 0) && (
                    <div className="mt-3 text-xs text-[#9e98aa] space-y-0.5">
                      <div>{twitterStatus.current_message}</div>
                      <div>Scanned: {twitterStatus.scanned} • Imported: {twitterStatus.imported} • Skipped: {twitterStatus.skipped}</div>
                      <div>Errors: {twitterStatus.errors}</div>
                      {twitterStatus.last_error && <div className="text-red-300 break-words">Error: {twitterStatus.last_error}</div>}
                    </div>
                  )}
                </div>


                {/* Check Deleted Posts */}
                <div className="rounded-xl border border-[#1d1b2d] bg-[#1c1b26] p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm flex items-center gap-2"><Trash2 className="w-4 h-4 text-yellow-400" />Check Deleted Posts</h4>
                      <p className="text-xs text-[#4c4b5a] mt-1">Find e621 favorites that were deleted. Auto-tags by reason (AI, artist request, paysite).</p>
                    </div>
                    <button onClick={() => { /* clear results */ startDeletedCheck(); }} disabled={!!deletedCheckStatus?.running || !e621CredInfo.has_api_key} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#9e98aa] hover:text-white disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0 ml-3">
                      {deletedCheckStatus?.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      {deletedCheckStatus?.running ? 'Checking...' : 'Start'}
                    </button>
                  </div>
                  {deletedCheckStatus && deletedCheckStatus.running && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-[#9e98aa] mb-1">
                        <span>{deletedCheckStatus.message}</span>
                        {deletedCheckStatus.total > 0 && <span>{deletedCheckStatus.current}/{deletedCheckStatus.total} {(() => { const eta = formatETA(deletedCheckStatus.started_at, deletedCheckStatus.current, deletedCheckStatus.total); return eta ? ` • ${eta}` : ''; })()}</span>}
                      </div>
                      {deletedCheckStatus.total > 0 && <div className="w-full h-1.5 bg-[#0f0f17] rounded-full overflow-hidden"><div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${(deletedCheckStatus.current / deletedCheckStatus.total) * 100}%` }} /></div>}
                    </div>
                  )}
                  {deletedCheckStatus && !deletedCheckStatus.running && deletedCheckStatus.message && <div className="text-xs text-[#9e98aa] mt-3">{deletedCheckStatus.message}</div>}
                  {!deletedCheckStatus?.running && deletedResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg bg-[#0f0f17] border border-[#1d1b2d] p-2">
                        {deletedResults.map((info) => (
                          <div key={info.post_id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-[#1c1b26]">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-[#4c4b5a] flex-shrink-0">#{info.post_id}</span>
                              <span className="text-gray-300 truncate">{info.reason}</span>
                            </div>
                            <span className={`flex-shrink-0 ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${info.tag_applied === 'ai_generated' ? 'bg-red-900/50 text-red-300' : info.tag_applied === 'artist_requested_deletion' ? 'bg-yellow-900/50 text-yellow-300' : info.tag_applied === 'paysite_content' ? 'bg-orange-900/50 text-orange-300' : 'bg-gray-700 text-gray-400'}`}>
                              {info.tag_applied === 'ai_generated' ? 'AI' : info.tag_applied === 'artist_requested_deletion' ? 'Artist' : info.tag_applied === 'paysite_content' ? 'Paysite' : 'Deleted'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        {unfavoritingDeleted ? (
                          <div className="flex-1">
                            <div className="flex justify-between text-[10px] text-[#9e98aa] mb-1"><span>Unfavoriting on e621...</span><span>{unfavoriteProgress.current}/{unfavoriteProgress.total}</span></div>
                            <div className="w-full h-1.5 bg-[#0f0f17] rounded-full overflow-hidden"><div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${(unfavoriteProgress.current / unfavoriteProgress.total) * 100}%` }} /></div>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmModal({ title: "Unfavorite Deleted Posts", message: `Remove ${deletedResults.length} deleted post(s) from your e621 favorites? This only removes the favorite on e621 — your local files are kept.`, okLabel: "Unfavorite All", onConfirm: unfavoriteDeletedPosts })} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#967abc] hover:bg-[#967abc]/80 text-white flex items-center gap-1.5"><Star className="w-3.5 h-3.5" />Unfavorite {deletedResults.length} on e621</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Update Metadata */}
                <div className="rounded-xl border border-[#1d1b2d] bg-[#1c1b26] p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 text-green-400" />Update Metadata</h4>
                      <p className="text-xs text-[#4c4b5a] mt-1">Re-fetch scores, fav counts, and tags from e621 for all library items.</p>
                    </div>
                    <button onClick={startMetadataUpdate} disabled={!!metaUpdateStatus?.running || !e621CredInfo.has_api_key} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#9e98aa] hover:text-white disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0 ml-3">
                      {metaUpdateStatus?.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      {metaUpdateStatus?.running ? 'Updating...' : 'Start'}
                    </button>
                  </div>
                  {metaUpdateStatus && (
                    <div className="mt-3">
                      {metaUpdateStatus.running && metaUpdateStatus.total > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] text-[#9e98aa] mb-1"><span>{metaUpdateStatus.message}</span><span>{metaUpdateStatus.current}/{metaUpdateStatus.total} {(() => { const eta = formatETA(metaUpdateStatus.started_at, metaUpdateStatus.current, metaUpdateStatus.total); return eta ? ` • ${eta}` : ''; })()}</span></div>
                          <div className="w-full h-1.5 bg-[#0f0f17] rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(metaUpdateStatus.current / metaUpdateStatus.total) * 100}%` }} /></div>
                        </div>
                      )}
                      {!metaUpdateStatus.running && metaUpdateStatus.message && <div className="text-xs text-[#9e98aa]">{metaUpdateStatus.message}</div>}
                    </div>
                  )}
                </div>

                {/* Enrich from e621 */}
                <div className="rounded-xl border border-[#1d1b2d] bg-[#1c1b26] p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm flex items-center gap-2"><Star className="w-4 h-4 text-purple-400" />Enrich from e621</h4>
                      <p className="text-xs text-[#4c4b5a] mt-1">Check FurAffinity and local imports against e621 by MD5 and visual similarity (IQDB). Imports tags, scores, and sources. Upgrades to the higher-resolution version when available.</p>
                    </div>
                    <button onClick={startFaUpgrade} disabled={!!faUpgradeStatus?.running || !e621CredInfo.has_api_key} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#9e98aa] hover:text-white disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0 ml-3">
                      {faUpgradeStatus?.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                      {faUpgradeStatus?.running ? 'Checking...' : 'Start'}
                    </button>
                  </div>
                  {faUpgradeStatus && (
                    <div className="mt-3">
                      {faUpgradeStatus.running && faUpgradeStatus.total > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] text-[#9e98aa] mb-1"><span>{faUpgradeStatus.message}</span><span>{faUpgradeStatus.current}/{faUpgradeStatus.total} {(() => { const eta = formatETA(faUpgradeStatus.started_at, faUpgradeStatus.current, faUpgradeStatus.total); return eta ? ` • ${eta}` : ''; })()}</span></div>
                          <div className="w-full h-1.5 bg-[#0f0f17] rounded-full overflow-hidden"><div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${(faUpgradeStatus.current / faUpgradeStatus.total) * 100}%` }} /></div>
                        </div>
                      )}
                      {!faUpgradeStatus.running && faUpgradeStatus.message && <div className="text-xs text-[#9e98aa]">{faUpgradeStatus.message}</div>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}