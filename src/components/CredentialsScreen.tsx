import iconUrl from "../tauri.svg";

interface CredentialsScreenProps {
  apiUsername: string;
  apiKey: string;
  setApiUsername: (v: string) => void;
  setApiKey: (v: string) => void;
  saveE621Credentials: () => Promise<void>;
  openExternalUrl: (url: string) => void;
  onSkip: () => void;
}

export function CredentialsScreen({ apiUsername, apiKey, setApiUsername, setApiKey, saveE621Credentials, openExternalUrl, onSkip }: CredentialsScreenProps) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#0f0f17] text-white">
      <div className="max-w-xl px-8">
        <div className="bg-[#161621] rounded-2xl border border-[#1d1b2d] p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full overflow-hidden">
            <img src={iconUrl} alt="TailBurrow" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center">e621 Credentials Required</h2>
          <p className="text-[#9e98aa] mb-6 text-center">
            TailBurrow needs your e621 API credentials to download favorites, search feeds, and access the full catalog.
          </p>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9e98aa]">Username</label>
              <input
                type="text"
                value={apiUsername}
                onChange={(e) => setApiUsername(e.target.value)}
                placeholder="Your e621 username"
                className="w-full px-4 py-3 rounded-xl bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc] focus:outline-none text-white placeholder-[#4c4b5a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9e98aa]">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your e621 API key"
                className="w-full px-4 py-3 rounded-xl bg-[#1c1b26] border border-[#1d1b2d] focus:border-[#967abc] focus:outline-none text-white placeholder-[#4c4b5a]"
              />
            </div>
          </div>
          <div className="bg-[#1c1b26] rounded-xl p-4 mb-6 border border-[#1d1b2d]">
            <p className="text-xs text-[#9e98aa] mb-2">
              <strong className="text-white">How to get your API key:</strong>
            </p>
            <ol className="text-xs text-[#9e98aa] space-y-1 list-decimal list-inside">
              <li>Log in to <button onClick={() => openExternalUrl("https://e621.net")} className="text-[#967abc] hover:underline">e621.net</button></li>
              <li>Go to Account → Manage API Access</li>
              <li>Create a new API key</li>
              <li>Copy and paste it above</li>
            </ol>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 px-4 py-3 rounded-xl bg-[#1d1b2d] hover:bg-[#4c4b5a] text-[#9e98aa] transition-colors text-sm"
            >
              Skip for Now
            </button>
            <button
              onClick={saveE621Credentials}
              disabled={!apiUsername.trim() || !apiKey.trim()}
              className="flex-1 px-4 py-3 rounded-xl bg-[#967abc] hover:bg-[#967abc]/80 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}