import { X } from "lucide-react";

interface EditModalProps {
  showEditModal: boolean;
  editingRating: string;
  editingSources: string[];
  editingTags: string[];
  newTagInput: string;
  newSourceInput: string;
  setShowEditModal: (v: boolean) => void;
  setEditingRating: (v: string) => void;
  setEditingSources: (v: string[] | ((prev: string[]) => string[])) => void;
  setEditingTags: (v: string[] | ((prev: string[]) => string[])) => void;
  setNewTagInput: (v: string) => void;
  setNewSourceInput: (v: string) => void;
  saveMetadata: () => Promise<void>;
}

export function EditModal({
  showEditModal, editingRating, editingSources, editingTags,
  newTagInput, newSourceInput,
  setShowEditModal, setEditingRating, setEditingSources, setEditingTags,
  setNewTagInput, setNewSourceInput, saveMetadata,
}: EditModalProps) {
  if (!showEditModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => setShowEditModal(false)} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl bg-[#161621] border border-[#1d1b2d]">
        <div className="flex items-center justify-between p-5 border-b border-[#1d1b2d]">
          <h2 className="text-xl font-bold">Edit Post Metadata</h2>
          <button onClick={() => setShowEditModal(false)} className="text-[#9e98aa] hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rating */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Rating</h3>
            <div className="flex gap-4">
              {(['s', 'q', 'e'] as const).map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="rating" checked={editingRating === r} onChange={() => setEditingRating(r)} className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500" />
                  <span className="capitalize">{r === 's' ? 'Safe' : r === 'q' ? 'Questionable' : 'Explicit'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Sources</h3>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="Paste URL..." value={newSourceInput}
                onChange={(e) => setNewSourceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newSourceInput.trim()) { e.preventDefault(); if (!editingSources.includes(newSourceInput.trim())) setEditingSources([...editingSources, newSourceInput.trim()]); setNewSourceInput(""); } }}
                className="flex-1 px-3 py-2 rounded-xl focus:outline-none text-sm bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
              <button onClick={() => { if (newSourceInput.trim() && !editingSources.includes(newSourceInput.trim())) { setEditingSources([...editingSources, newSourceInput.trim()]); setNewSourceInput(""); } }} className="px-3 py-2 rounded-xl text-sm bg-[#1d1b2d] hover:bg-[#4c4b5a]">Add</button>
            </div>
            <div className="space-y-1">
              {editingSources.map((src, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0f0f17] border border-[#1d1b2d]">
                  <a href={src} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline truncate mr-2">{src}</a>
                  <button onClick={() => setEditingSources(prev => prev.filter(s => s !== src))} className="text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                </div>
              ))}
              {editingSources.length === 0 && <p className="text-xs text-gray-500 italic">No sources linked.</p>}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Tags</h3>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="Add tag..." value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newTagInput.trim()) { e.preventDefault(); const t = newTagInput.trim().toLowerCase(); if (!editingTags.includes(t)) setEditingTags([...editingTags, t]); setNewTagInput(""); } }}
                className="flex-1 px-3 py-2 rounded-xl focus:outline-none text-sm bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc]" />
              <button onClick={() => { const t = newTagInput.trim().toLowerCase(); if (t && !editingTags.includes(t)) { setEditingTags([...editingTags, t]); setNewTagInput(""); } }} className="px-3 py-2 rounded-xl text-sm bg-[#1d1b2d] hover:bg-[#4c4b5a]">Add</button>
            </div>
            <div className="flex flex-wrap gap-2 p-3 rounded-xl min-h-[100px] content-start bg-[#0f0f17] border border-[#1d1b2d]">
              {editingTags.map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-sm flex items-center gap-1 bg-[#967abc]/20 border border-[#967abc]/30">
                  {tag}
                  <button onClick={() => setEditingTags(prev => prev.filter(t => t !== tag))} className="hover:text-red-400 ml-1"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-[#1d1b2d]">
          <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-xl bg-[#1d1b2d] hover:bg-[#4c4b5a]">Cancel</button>
          <button onClick={saveMetadata} className="px-6 py-2 rounded-xl font-bold bg-[#967abc] hover:bg-[#967abc]/80">Save Changes</button>
        </div>
      </div>
    </div>
  );
}