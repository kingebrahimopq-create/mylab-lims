import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    message: string;
  }>;
  onRemove: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info
};

const styles = {
  success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  error: 'bg-red-50 border-red-300 text-red-800',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800'
};

const iconColors = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600'
};

/**
 * Toast Component
 * 
 * Displays a single toast notification.
 */
export const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 5000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm
        ${styles[type]}
        transform transition-all duration-300 ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        max-w-sm w-full
      `}
    >
      <Icon className={`w-5 h-5 shrink-0 ${iconColors[type]}`} />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={handleClose}
        className="p-1 hover:bg-white/50 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Toast Container
 * 
 * Manages multiple toast notifications.
 * Usage:
 *   const [toasts, setToasts] = useState([]);
 *   const addToast = (type, message) => setToasts(prev => [...prev, { id: Date.now(), type, message }]);
 *   <ToastContainer toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={onRemove}
        />
      ))}
    </div>
  );
};

// Hook for easy toast management
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; message: string }>>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (message: string) => addToast('success', message);
  const error = (message: string) => addToast('error', message);
  const warning = (message: string) => addToast('warning', message);
  const info = (message: string) => addToast('info', message);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    ToastContainer: () => <ToastContainer toasts={toasts} onRemove={removeToast} />
  };
}

export default Toast;
