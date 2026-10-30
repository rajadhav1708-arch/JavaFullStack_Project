import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="no-print pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-md flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          let skin = 'bg-paper text-ink border border-line';
          let Icon = Info;

          if (toast.type === 'success') {
            skin = 'bg-pine text-white border border-pine';
            Icon = CheckCircle2;
          } else if (toast.type === 'error') {
            skin = 'bg-clay text-white border border-clay';
            Icon = AlertCircle;
          } else if (toast.type === 'warning') {
            skin = 'bg-ochre text-ink border border-ochre';
            Icon = AlertTriangle;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`pointer-events-auto flex items-center justify-between rounded-xl p-3.5 shadow-lg ${skin}`}
            >
              <div className="flex items-center gap-3">
                <motion.span
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                </motion.span>
                <p className="text-sm font-medium">{toast.text}</p>
              </div>
              <motion.button
                onClick={() => removeToast(toast.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
