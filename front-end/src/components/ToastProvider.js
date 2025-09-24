import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext({ push: () => {} });

export const useToast = () => useContext(ToastContext);

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    const id = setTimeout(() => onClose(toast.id), toast.duration || 3000);
    return () => clearTimeout(id);
  }, [toast, onClose]);

  const colorByType = toast.type === 'error'
    ? 'bg-red-600/90 border-red-400/50'
    : toast.type === 'success'
    ? 'bg-green-600/90 border-green-400/50'
    : toast.type === 'warning'
    ? 'bg-yellow-600/90 border-yellow-400/50'
    : 'bg-gray-800/90 border-white/10';

  return (
    <div className={`px-4 py-3 rounded-lg border shadow-lg text-sm text-white ${colorByType}`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);

  const push = useCallback(({ message, type = 'info', duration = 3000 }) => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const close = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={close} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};


