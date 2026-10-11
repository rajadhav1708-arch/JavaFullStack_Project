import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-slate-900 text-white';
          let Icon = Info;

          if (toast.type === 'success') {
            bgColor = 'bg-emerald-900 border border-emerald-700 text-emerald-100';
            Icon = CheckCircle2;
          } else if (toast.type === 'error') {
            bgColor = 'bg-red-900 border border-red-700 text-red-100';
            Icon = AlertCircle;
          } else if (toast.type === 'warning') {
            bgColor = 'bg-amber-900 border border-amber-700 text-amber-100';
            Icon = AlertTriangle;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-xl ${bgColor}`}
            >
              <div className="flex items-center gap-3">
                <motion.span
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                </motion.span>
                <p className="text-sm font-medium">{toast.text}</p>
              </div>
              <motion.button
                onClick={() => removeToast(toast.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
