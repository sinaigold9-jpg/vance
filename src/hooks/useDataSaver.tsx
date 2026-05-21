import { useEffect, useState, useCallback } from "react";

const LS_KEY = "advance_data_saver";

export const isDataSaverOn = () => {
  try { return localStorage.getItem(LS_KEY) === "1"; } catch { return false; }
};

export const useDataSaver = () => {
  const [enabled, setEnabled] = useState<boolean>(isDataSaverOn());

  useEffect(() => {
    const handler = () => setEnabled(isDataSaverOn());
    window.addEventListener("storage", handler);
    window.addEventListener("data-saver-changed", handler as any);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("data-saver-changed", handler as any);
    };
  }, []);

  const toggle = useCallback((v: boolean) => {
    try { localStorage.setItem(LS_KEY, v ? "1" : "0"); } catch { /* ignore */ }
    setEnabled(v);
    window.dispatchEvent(new Event("data-saver-changed"));
  }, []);

  return { enabled, toggle };
};