interface ConfirmOpts {
  title: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

interface ConfirmModalProps {
  confirmModal: ConfirmOpts | null;
  setConfirmModal: (v: ConfirmOpts | null) => void;
}

export function ConfirmModal({ confirmModal, setConfirmModal }: ConfirmModalProps) {
  if (!confirmModal) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmModal(null)} />
      <div className="relative z-10 w-full max-w-md rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 bg-[#161621] border border-[#1d1b2d]">
        <h3 className="text-lg font-bold mb-2">{confirmModal.title}</h3>
        <p className="text-sm mb-6 text-[#9e98aa]">{confirmModal.message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setConfirmModal(null)}
            className="px-4 py-2 rounded-xl transition-colors bg-[#1d1b2d] hover:bg-[#4c4b5a]"
          >
            {confirmModal.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 font-medium transition-colors"
          >
            {confirmModal.okLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { ConfirmOpts };