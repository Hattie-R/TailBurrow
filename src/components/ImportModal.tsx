import { Upload, X, Plus, Play, Loader2 } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ImportModalProps {
  showImportModal: boolean;
  importFiles: string[];
  importTagInput: string;
  importTags: string[];
  importRating: string;
  importSourceInput: string;
  importSources: string[];
  importLoading: boolean;
  setShowImportModal: (v: boolean) => void;
  setImportFiles: (v: string[] | ((prev: string[]) => string[])) => void;
  setImportTagInput: (v: string) => void;
  setImportTags: (v: string[] | ((prev: string[]) => string[])) => void;
  setImportRating: (v: string) => void;
  setImportSourceInput: (v: string) => void;
  setImportSources: (v: string[] | ((prev: string[]) => string[])) => void;
  selectImportFiles: () => Promise<void>;
  handleImport: () => Promise<void>;
}

export function ImportModal({
  showImportModal, importFiles, importTagInput, importTags, importRating,
  importSourceInput, importSources, importLoading,
  setShowImportModal, setImportFiles, setImportTagInput, setImportTags,
  setImportRating, setImportSourceInput, setImportSources,
  selectImportFiles, handleImport,
}: ImportModalProps) {
  if (!showImportModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => setShowImportModal(false)} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl bg-[#161621] border border-[#1d1b2d]">
        <div className="flex items-center justify-between p-5 border-b border-[#1d1b2d] flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-emerald-400" />Import Files</h2>
          <button onClick={() => setShowImportModal(false)} className="text-[#9e98aa] hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#9e98aa] uppercase tracking-wider">Files ({importFiles.length})</h3>
              <button onClick={selectImportFiles} className="px-3 py-1.5 text-xs rounded-lg bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#9e98aa] hover:text-white transition-colors flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Add More</button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-xl bg-[#0f0f17] border border-[#1d1b2d] p-2">
              {importFiles.map((filePath, i) => {
                const fileName = filePath.split(/[/\\]/).pop() || filePath;
                const fileExt = (fileName.split('.').pop() || '').toLowerCase();
                const isVid = ['mp4', 'webm'].includes(fileExt);
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1c1b26] group">
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-[#0f0f17]">
                      {isVid ? <div className="w-full h-full flex items-center justify-center"><Play className="w-4 h-4 text-[#4c4b5a]" /></div>
                        : <img src={convertFileSrc(filePath)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    </div>
                    <span className="text-sm text-gray-300 truncate flex-1" title={filePath}>{fileName}</span>
                    <button onClick={() => setImportFiles(prev => prev.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-[#4c4b5a] hover:text-red-400 transition-all flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                );
              })}
              {importFiles.length === 0 && <div className="text-center py-6 text-[#4c4b5a] text-sm">No files selected</div>}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h3 className="text-sm font-semibold text-[#9e98aa] uppercase tracking-wider mb-2">Rating</h3>
            <div className="flex gap-4">
              {(['s', 'q', 'e'] as const).map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="import-rating" checked={importRating === r} onChange={() => setImportRating(r)} className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500" />
                  <span className={`capitalize ${r === 'e' ? 'text-red-400' : r === 'q' ? 'text-yellow-400' : 'text-green-400'}`}>{r === 's' ? 'Safe' : r === 'q' ? 'Questionable' : 'Explicit'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-sm font-semibold text-[#9e98aa] uppercase tracking-wider mb-2">Tags</h3>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="Add tag..." value={importTagInput}
                onChange={(e) => setImportTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && importTagInput.trim()) { e.preventDefault(); const t = importTagInput.trim().toLowerCase(); if (!importTags.includes(t)) setImportTags(prev => [...prev, t]); setImportTagInput(''); } }}
                className="flex-1 px-3 py-2 rounded-xl focus:outline-none text-sm bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
              <button onClick={() => { const t = importTagInput.trim().toLowerCase(); if (t && !importTags.includes(t)) { setImportTags(prev => [...prev, t]); setImportTagInput(''); } }} className="px-3 py-2 rounded-xl text-sm bg-[#1d1b2d] hover:bg-[#4c4b5a]">Add</button>
            </div>
            {importTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {importTags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1 bg-[#967abc]/20 border border-[#967abc]/30">
                    {tag}
                    <button onClick={() => setImportTags(prev => prev.filter(t => t !== tag))} className="hover:text-red-400 ml-0.5"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sources */}
          <div>
            <h3 className="text-sm font-semibold text-[#9e98aa] uppercase tracking-wider mb-2">Source Links (optional)</h3>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="Paste URL..." value={importSourceInput}
                onChange={(e) => setImportSourceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && importSourceInput.trim()) { e.preventDefault(); if (!importSources.includes(importSourceInput.trim())) setImportSources(prev => [...prev, importSourceInput.trim()]); setImportSourceInput(''); } }}
                className="flex-1 px-3 py-2 rounded-xl focus:outline-none text-sm bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
              <button onClick={() => { if (importSourceInput.trim() && !importSources.includes(importSourceInput.trim())) { setImportSources(prev => [...prev, importSourceInput.trim()]); setImportSourceInput(''); } }} className="px-3 py-2 rounded-xl text-sm bg-[#1d1b2d] hover:bg-[#4c4b5a]">Add</button>
            </div>
            {importSources.length > 0 && (
              <div className="space-y-1">
                {importSources.map((src, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0f0f17] border border-[#1d1b2d]">
                    <span className="text-xs text-blue-400 truncate mr-2">{src}</span>
                    <button onClick={() => setImportSources(prev => prev.filter(s => s !== src))} className="text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-[#1d1b2d] flex-shrink-0">
          <button onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-xl bg-[#1d1b2d] hover:bg-[#4c4b5a] transition-colors">Cancel</button>
          <button onClick={handleImport} disabled={importFiles.length === 0 || importLoading}
            className="px-6 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            {importLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Importing...</> : <><Upload className="w-4 h-4" />Import {importFiles.length} File{importFiles.length !== 1 ? 's' : ''}</>}
          </button>
        </div>
      </div>
    </div>
  );
}