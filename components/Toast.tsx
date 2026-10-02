"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; message: string; type: ToastType };

const ToastCtx = createContext<{ toast: (message: string, type?: ToastType) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

const ACCENT: Record<ToastType, string> = { success: "#4a7c59", error: "#c4553d", info: "#7C3AED" };
const DURATION = 3600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), DURATION);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {items.map((i) => (
            <motion.div
              key={i.id}
              layout
              initial={{ opacity: 0, x: 48, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="relative overflow-hidden bg-ink-raised border rule rounded-sm pl-4 pr-5 py-3 text-sm max-w-xs shadow-xl"
              style={{ borderLeft: `3px solid ${ACCENT[i.type]}` }}
            >
              {i.message}
              <motion.span
                className="absolute bottom-0 left-0 h-[2px]"
                style={{ background: ACCENT[i.type] }}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: DURATION / 1000, ease: "linear" }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
