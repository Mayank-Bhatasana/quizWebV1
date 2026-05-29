import { useSyncExternalStore } from "react";
import { getTempUser, TEMP_USER_CHANGED_EVENT, type TempUser } from "../utils/tempUser";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(TEMP_USER_CHANGED_EVENT, onStoreChange);

  const onStorage = () => onStoreChange();
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(TEMP_USER_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTempUser(): TempUser | null {
  return useSyncExternalStore(subscribe, getTempUser, () => null);
}

