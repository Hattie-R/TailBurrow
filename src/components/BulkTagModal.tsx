export const BulkTagModal = ({
  isOpen,
  onClose,
  mode,
  inputValue,
  onInputChange,
  selectedCount,
  onAddTag,
  onRemoveTag,
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'remove';
  inputValue: string;
  onInputChange: (val: string) => void;
  selectedCount: number;
  onAddTag: () => void;
  onRemoveTag: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 bg-[#161621] border border-[#1d1b2d]">
        <h3 className="text-lg font-bold mb-2">
          {mode === 'add' ? 'Add Tag to' : 'Remove Tag from'} {selectedCount} Items
        </h3>
        <p className="text-sm text-[#9e98aa] mb-4">
          {mode === 'add'
            ? 'This tag will be added to all selected items.'
            : 'This tag will be removed from all selected items.'}
        </p>
        <input
          type="text"
          placeholder="Enter tag..."
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (mode === 'add') onAddTag();
              else onRemoveTag();
            }
          }}
          autoFocus
          className="w-full px-4 py-2.5 rounded-xl mb-4 focus:outline-none bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc] text-white placeholder-[#4c4b5a]"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl transition-colors bg-[#1d1b2d] hover:bg-[#4c4b5a]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (mode === 'add') onAddTag();
              else onRemoveTag();
            }}
            disabled={!inputValue.trim()}
            className={`px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'add' ? 'bg-[#967abc] hover:bg-[#967abc]/80' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {mode === 'add' ? 'Add Tag' : 'Remove Tag'}
          </button>
        </div>
      </div>
    </div>
  );
};
