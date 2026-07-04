import iconUrl from "../tauri.svg";
import { APP_VERSION } from "../constants";

interface WelcomeScreenProps {
  changeLibraryRoot: () => void;
}

export function WelcomeScreen({ changeLibraryRoot }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f0f17] text-white">
      <div className="max-w-2xl px-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden">
          <img src={iconUrl} alt="TailBurrow" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#967abc] to-[#c9a3e8] bg-clip-text text-transparent">
          Welcome to TailBurrow
        </h1>
        <p className="text-sm text-[#9e98aa] mb-4">
          Your personal e621, FurAffinity, and local media archive.
        </p>
        <div className="bg-[#161621] rounded-xl border border-[#1d1b2d] p-4 mb-4 text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#967abc]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#967abc] text-xs font-bold">1</span>
              </div>
              <span className="text-sm">Choose a Library Folder</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#967abc]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#967abc] text-xs font-bold">2</span>
              </div>
              <span className="text-sm">Add e621 Credentials</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#967abc]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#967abc] text-xs font-bold">3</span>
              </div>
              <span className="text-sm">Start Archiving</span>
            </div>
          </div>
        </div>
        <button
          onClick={changeLibraryRoot}
          className="px-6 py-2.5 rounded-xl bg-[#967abc] hover:bg-[#967abc]/80 text-white font-semibold transition-colors"
        >
          Choose Library Folder
        </button>
        <p className="mt-8 text-xs text-[#4c4b5a]">TailBurrow v{APP_VERSION}</p>
      </div>
    </div>
  );
}