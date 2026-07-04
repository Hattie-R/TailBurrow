import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "./useToast";

interface UseAppLockReturn {
  isLocked: boolean;
  lockChecked: boolean;
  hasLock: boolean;
  pinInput: string;
  pinError: string;
  safeMode: boolean;
  safePinInput: string;
  lockNewPin: string;
  lockConfirmPin: string;
  lockRemovePin: string;
  globalMute: boolean;
  setPinInput: React.Dispatch<React.SetStateAction<string>>;
  setPinError: React.Dispatch<React.SetStateAction<string>>;
  setSafePinInput: React.Dispatch<React.SetStateAction<string>>;
  setLockNewPin: React.Dispatch<React.SetStateAction<string>>;
  setLockConfirmPin: React.Dispatch<React.SetStateAction<string>>;
  setLockRemovePin: React.Dispatch<React.SetStateAction<string>>;
  setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setSafeMode: React.Dispatch<React.SetStateAction<boolean>>;
  setGlobalMute: React.Dispatch<React.SetStateAction<boolean>>;
  setHasLock: React.Dispatch<React.SetStateAction<boolean>>;
  setLockChecked: React.Dispatch<React.SetStateAction<boolean>>;
  handleUnlock: () => Promise<void>;
  handleSetLock: () => Promise<void>;
  handleRemoveLock: () => Promise<void>;
  setIsLockedTrue: () => void;
}

export function useAppLock(): UseAppLockReturn {
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [hasLock, setHasLock] = useState(false);
  const [lockNewPin, setLockNewPin] = useState('');
  const [lockConfirmPin, setLockConfirmPin] = useState('');
  const [lockRemovePin, setLockRemovePin] = useState('');
  const [safeMode, setSafeMode] = useState(false);
  const [safePinInput, setSafePinInput] = useState('');
  const [globalMute, setGlobalMute] = useState(true);
  const [lockChecked, setLockChecked] = useState(false);
  const { toast } = useToast();

  const handleUnlock = useCallback(async () => {
    setPinError('');
    try {
      const isSafe = await invoke<boolean>("verify_safe_pin", { pin: pinInput });
      if (isSafe) {
        setSafeMode(true);
        setIsLocked(false);
        setGlobalMute(false);
        setPinInput('');
        return;
      }

      const ok = await invoke<boolean>("verify_app_lock", { pin: pinInput });
      if (ok) {
        setSafeMode(false);
        setIsLocked(false);
        setGlobalMute(false);
        setPinInput('');
      } else {
        setPinError('Incorrect PIN');
        setPinInput('');
      }
    } catch (e) {
      setPinError(String(e));
    }
  }, [pinInput]);

  const handleSetLock = useCallback(async () => {
    if (lockNewPin.length < 4) {
      toast("PIN must be at least 4 characters.", "error");
      return;
    }
    if (lockNewPin !== lockConfirmPin) {
      toast("PINs don't match.", "error");
      return;
    }
    try {
      await invoke("set_app_lock", { pin: lockNewPin });
      setHasLock(true);
      setLockNewPin('');
      setLockConfirmPin('');
      toast("App lock enabled.", "success");
    } catch (e) {
      toast("Failed to set lock: " + String(e), "error");
    }
  }, [lockNewPin, lockConfirmPin, toast]);

  const handleRemoveLock = useCallback(async () => {
    if (!lockRemovePin) {
      toast("Enter your current PIN to remove lock.", "error");
      return;
    }
    try {
      await invoke("clear_app_lock", { pin: lockRemovePin });
      setHasLock(false);
      setLockRemovePin('');
      toast("App lock removed.", "success");
    } catch (e) {
      toast(String(e), "error");
    }
  }, [lockRemovePin, toast]);

  const setIsLockedTrue = useCallback(() => {
    setIsLocked(true);
    setGlobalMute(true);
    setSafeMode(false);
    setPinInput('');
    setPinError('');
  }, []);

  // Auto-lock on visibility change (screen lock / sleep)
  useEffect(() => {
    if (!hasLock) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setIsLocked(true);
        setGlobalMute(true);
        setSafeMode(false);
        setPinInput('');
        setPinError('');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [hasLock]);

  return {
    isLocked, lockChecked, setLockChecked,
    hasLock, setHasLock,
    pinInput, setPinInput, pinError, setPinError,
    safeMode, setSafeMode,
    safePinInput, setSafePinInput,
    lockNewPin, setLockNewPin,
    lockConfirmPin, setLockConfirmPin,
    lockRemovePin, setLockRemovePin,
    globalMute, setGlobalMute,
    setIsLocked,
    handleUnlock,
    handleSetLock,
    handleRemoveLock,
    setIsLockedTrue,
  };
}