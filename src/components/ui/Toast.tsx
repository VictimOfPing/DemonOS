"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import clsx from "clsx";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-demon-success/20",
    borderColor: "border-demon-success/50",
    textColor: "text-demon-success",
    glowColor: "shadow-[0_0_20px_rgba(34,197,94,0.3)]",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-demon-danger/20",
    borderColor: "border-demon-danger/50",
    textColor: "text-demon-danger",
    glowColor: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
  },
  info: {
    icon: Info,
    bgColor: "bg-demon-primary/20",
    borderColor: "border-demon-primary/50",
    textColor: "text-demon-accent",
    glowColor: "shadow-[0_0_20px_rgba(139,92,246,0.3)]",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-demon-warning/20",
    borderColor: "border-demon-warning/50",
    textColor: "text-demon-warning",
    glowColor: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [isGlitching, setIsGlitching] = useState(true);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  // Initial glitch effect
  useEffect(() => {
    const timeout = setTimeout(() => setIsGlitching(false), 300);
    return () => clearTimeout(timeout);
  }, []);

  // Auto-remove
  useEffect(() => {
    if (toast.duration !== 0) {
      const timeout = setTimeout(onRemove, toast.duration || 5000);
      return () => clearTimeout(timeout);
    }
  }, [toast.duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        scale: 1,
        ...(isGlitching && {
          x: [0, -4, 4, -2, 2, 0],
          filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(-90deg)", "hue-rotate(0deg)"],
        })
      }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ 
        duration: isGlitching ? 0.3 : 0.2,
        type: "spring",
        stiffness: 500,
        damping: 30
      }}
      className={clsx(
        "relative flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm",
        "min-w-[320px] max-w-[400px]",
        config.bgColor,
        config.borderColor,
        config.glowColor
      )}
    >
      {/* Glitch overlay */}
      {isGlitching && (
        <>
          <div 
            className="absolute inset-0 rounded-lg opacity-50 pointer-events-none"
            style={{
              background: `linear-gradient(transparent 50%, rgba(0,0,0,0.1) 50%)`,
              backgroundSize: "100% 4px",
            }}
          />
          <div 
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              clipPath: "inset(40% 0 40% 0)",
              transform: "translateX(-3px)",
              background: "rgba(239, 68, 68, 0.1)",
            }}
          />
        </>
      )}

      {/* Icon */}
      <div className={clsx("shrink-0 mt-0.5", config.textColor)}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={clsx("font-mono font-bold text-sm", config.textColor)}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs text-demon-text-muted mt-1 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onRemove}
        className={clsx(
          "shrink-0 p-1 rounded hover:bg-white/10 transition-colors",
          config.textColor
        )}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      {toast.duration !== 0 && (
        <motion.div
          className={clsx(
            "absolute bottom-0 left-0 h-[2px] rounded-b-lg",
            config.textColor.replace("text-", "bg-")
          )}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: (toast.duration || 5000) / 1000, ease: "linear" }}
        />
      )}

      {/* Corner decorations */}
      <div className={clsx("absolute -top-[1px] -left-[1px] w-2 h-2 border-l border-t", config.borderColor)} />
      <div className={clsx("absolute -top-[1px] -right-[1px] w-2 h-2 border-r border-t", config.borderColor)} />
      <div className={clsx("absolute -bottom-[1px] -left-[1px] w-2 h-2 border-l border-b", config.borderColor)} />
      <div className={clsx("absolute -bottom-[1px] -right-[1px] w-2 h-2 border-r border-b", config.borderColor)} />
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now().toString() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-16 right-4 z-[200] flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Convenience functions
export const toast = {
  success: (title: string, message?: string) => {
    const event = new CustomEvent("demon-toast", {
      detail: { type: "success", title, message },
    });
    window.dispatchEvent(event);
  },
  error: (title: string, message?: string) => {
    const event = new CustomEvent("demon-toast", {
      detail: { type: "error", title, message },
    });
    window.dispatchEvent(event);
  },
  info: (title: string, message?: string) => {
    const event = new CustomEvent("demon-toast", {
      detail: { type: "info", title, message },
    });
    window.dispatchEvent(event);
  },
  warning: (title: string, message?: string) => {
    const event = new CustomEvent("demon-toast", {
      detail: { type: "warning", title, message },
    });
    window.dispatchEvent(event);
  },
};
