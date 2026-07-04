interface LockScreenProps {
  lockChecked: boolean;
  pinInput: string;
  pinError: string;
  setPinInput: (v: string) => void;
  setPinError: (v: string) => void;
  handleUnlock: () => void;
}

export function LockScreen({ lockChecked, pinInput, pinError, setPinInput, setPinError, handleUnlock }: LockScreenProps) {
  if (!lockChecked) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0f0f17]">
        <div className="w-16 h-16 rounded-2xl bg-[#1d1b2d] flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-[#967abc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0f0f17]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#1d1b2d] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#967abc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">TailBurrow</h2>
        <p className="text-[#4c4b5a] text-sm mb-6">Enter PIN to unlock</p>
        <div className="flex gap-2 justify-center mb-3">
          <input
            type="password"
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
            placeholder="••••"
            maxLength={16}
            autoFocus
            className="w-48 px-4 py-3 text-center text-lg tracking-[0.3em] rounded-xl bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc] focus:outline-none text-white placeholder-[#4c4b5a]"
          />
        </div>
        {pinError && <p className="text-red-400 text-sm mb-3">{pinError}</p>}
        <button
          onClick={handleUnlock}
          disabled={!pinInput}
          className="px-8 py-2.5 rounded-xl bg-[#967abc] hover:bg-[#967abc]/80 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Unlock
        </button>
      </div>
    </div>
  );
}