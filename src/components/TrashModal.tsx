import { Trash2, X, Undo } from 'lucide-react';
import Masonry from 'react-masonry-css';

type TrashedItem = {
  item_id: number;
  url: string;
  ext?: string | null;
  source: string;
  source_id: string;
};

export const TrashModal = ({
  isOpen,
  onClose,
  trashedItems,
  onEmptyTrash,
  onRestore,
}: {
  isOpen: boolean;
  onClose: () => void;
  trashedItems: TrashedItem[];
  onEmptyTrash: () => void;
  onRestore: (id: number) => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col bg-[#161621] border border-[#1d1b2d]">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0 border-[#1d1b2d]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-[#9e98aa]" />
            Trash
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onEmptyTrash}
              disabled={trashedItems.length === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 text-sm font-medium"
            >
              Empty Trash
            </button>
            <button onClick={onClose} className="text-[#9e98aa] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {trashedItems.length > 0 ? (
            <Masonry
              breakpointCols={4}
              className="flex w-auto gap-3"
              columnClassName="flex flex-col gap-3"
            >
              {trashedItems.map((item) => {
                const isVid = ['mp4', 'webm'].includes((item.ext || '').toLowerCase());
                return (
                  <div
                    key={item.item_id}
                    className="relative group rounded-lg overflow-hidden border bg-[#1c1b26] border-[#1d1b2d]"
                  >
                    {isVid ? (
                      <video src={item.url} className="w-full h-auto object-cover opacity-60" />
                    ) : (
                      <img
                        src={item.url}
                        className="w-full h-auto object-cover opacity-60"
                        loading="lazy"
                        alt=""
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                      <button
                        onClick={() => onRestore(item.item_id)}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white"
                        title="Restore"
                      >
                        <Undo className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 text-xs text-center bg-[#0f0f17]/80 text-[#9e98aa]">
                      {item.source} #{item.source_id}
                    </div>
                  </div>
                );
              })}
            </Masonry>
          ) : (
            <div className="text-center py-20 text-[#4c4b5a]">
              <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Trash is empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
