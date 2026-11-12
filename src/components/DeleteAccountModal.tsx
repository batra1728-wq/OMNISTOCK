import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, LanguageCode } from '../types';
import { t } from '../utils/i18n';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  targetUser?: UserProfile | null;
  onConfirmDelete: (reason?: string) => void;
  allAccountsCount?: number;
  currentLang?: LanguageCode;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  user: userProp,
  targetUser,
  onConfirmDelete,
  allAccountsCount = 1,
  currentLang = 'en',
}) => {
  const user = targetUser || userProp;
  const [confirmationInput, setConfirmationInput] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [deletionReason, setDeletionReason] = useState('switching_system');
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setUnderstood(false);
      setIsDeleting(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  const isConfirmed =
    confirmationInput.trim().toUpperCase() === 'DELETE' && understood;

  const handleDelete = () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);

    setTimeout(() => {
      onConfirmDelete(deletionReason);
    }, 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="delete-account-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => !isDeleting && onClose()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <motion.div
            key="delete-account-modal"
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-slate-900 w-full max-w-lg rounded-3xl border border-rose-200/80 shadow-2xl overflow-hidden flex flex-col my-auto"
          >
            {/* Warning Header */}
            <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-red-800 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">
                    person_remove
                  </span>
                </div>
                <div>
                  <h2
                    id="delete-account-title"
                    className="text-lg sm:text-xl font-bold tracking-tight text-white"
                  >
                    Delete Account
                  </h2>
                  <p className="text-xs text-rose-200 font-mono mt-0.5">
                    Permanent Account &amp; Workspace Eradication
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                disabled={isDeleting}
                aria-label="Close dialog"
                className="p-1.5 rounded-full hover:bg-white/10 text-rose-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
              {/* Target User Pill */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {user.name}
                    </p>
                    <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.2 rounded-md">
                      {user.staffId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {user.email || user.role}
                  </p>
                </div>
              </div>

              {/* Data Loss Warning Box */}
              <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs text-rose-900 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 uppercase tracking-wider text-[11px] font-mono">
                  <span className="material-symbols-outlined text-[16px] text-rose-600">
                    warning
                  </span>
                  <span>The following data will be permanently wiped:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-rose-800/90 pl-1 font-sans">
                  <li>Active credentials and warehouse operator profile</li>
                  <li>Custom inventory stock items, par limits, and catalog adjustments</li>
                  <li>Purchase order drafts, shipment logs, and activity telemetry</li>
                  <li>Saved AI copilot session memories and assistant preferences</li>
                </ul>
              </div>

              {/* Reason Selector */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="delete-reason-select"
                  className="text-xs font-mono font-semibold text-slate-700"
                >
                  Reason for account removal (optional)
                </label>
                <select
                  id="delete-reason-select"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="switching_system">Switching to an external ERP/WMS</option>
                  <option value="temporary_reset">Resetting test data &amp; starting fresh</option>
                  <option value="privacy_cleanup">Data privacy and compliance cleanup</option>
                  <option value="facility_closed">Warehouse unit decommissioned</option>
                  <option value="other">Other operational reason</option>
                </select>
              </div>

              {/* Explicit Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                />
                <span className="leading-snug">
                  I understand that this action is <strong>irreversible</strong> and that all my warehouse data and credentials will be purged immediately.
                </span>
              </label>

              {/* Confirmation Phrase Input */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label
                  htmlFor="delete-confirm-input"
                  className="text-xs font-mono font-bold text-slate-800"
                >
                  To confirm, type <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">DELETE</span> below:
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  placeholder="Type DELETE"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs font-mono uppercase tracking-widest bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={!isConfirmed || isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    <span>Wiping Account...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      delete_forever
                    </span>
                    <span>Permanently Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
