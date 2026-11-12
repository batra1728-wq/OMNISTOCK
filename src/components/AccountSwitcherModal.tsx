import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, LanguageCode } from '../types';
import { validateRealEmail } from './SignInScreen';
import { t } from '../utils/i18n';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  accounts: UserProfile[];
  onSwitchAccount: (targetUser: UserProfile) => void;
  onAddAccount: (newUser: UserProfile) => void;
  onRequestDeleteAccount: (targetUser: UserProfile) => void;
  currentLang?: LanguageCode;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  accounts,
  onSwitchAccount,
  onAddAccount,
  onRequestDeleteAccount,
  currentLang = 'en',
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Warehouse Operations Lead');
  const [newStaffId, setNewStaffId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newFullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    const emailCheck = validateRealEmail(newEmail);
    if (!emailCheck.isValid) {
      setErrorMsg(emailCheck.message);
      return;
    }

    // Check if email already exists
    const existing = accounts.find(
      (a) => a.email.toLowerCase() === newEmail.trim().toLowerCase()
    );
    if (existing) {
      setErrorMsg('An account with this email address already exists in the system.');
      return;
    }

    const createdProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      name: newFullName.trim(),
      email: newEmail.trim(),
      staffId: newStaffId.trim() || `S-${Math.floor(1000 + Math.random() * 9000)}`,
      role: newRole,
      avatar: `https://images.unsplash.com/photo-${1534528741775 + (accounts.length % 5) * 1000}?auto=format&fit=crop&q=80&w=240&h=240`,
    };

    onAddAccount(createdProfile);
    setIsAddingNew(false);
    setNewFullName('');
    setNewEmail('');
    setNewStaffId('');
  };

  return (
    <AnimatePresence>
      <motion.div
        key="account-switcher-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/65 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-switcher-title"
      >
        <motion.div
          key="account-switcher-dialog"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white text-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-[22px]">
                  switch_account
                </span>
              </div>
              <div>
                <h2
                  id="account-switcher-title"
                  className="text-lg font-bold text-white tracking-tight"
                >
                  Manage &amp; Switch Accounts
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Multi-profile operator access &amp; credentials
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto bg-slate-50/50">
            {!isAddingNew ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
                    Available Accounts ({accounts.length})
                  </span>
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="text-xs font-mono font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>+ Add Account</span>
                  </button>
                </div>

                {/* List of accounts */}
                <div className="flex flex-col gap-2.5">
                  {accounts.map((acc) => {
                    const isActive = acc.id === currentUser.id;

                    return (
                      <div
                        key={acc.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={acc.avatar}
                            alt={acc.name}
                            className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 truncate">
                                {acc.name}
                              </span>
                              {isActive && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.2 rounded-md">
                                  Active Session
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {acc.staffId}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 truncate mt-0.5">
                              {acc.role}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">
                              {acc.email}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isActive ? (
                            <button
                              onClick={() => {
                                onSwitchAccount(acc);
                                onClose();
                              }}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">login</span>
                              <span>Switch</span>
                            </button>
                          ) : (
                            <span className="text-xs font-mono text-emerald-700 font-bold px-2.5 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                              Current
                            </span>
                          )}

                          {/* Delete Account button */}
                          <button
                            onClick={() => onRequestDeleteAccount(acc)}
                            title={`Delete account for ${acc.name}`}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Add New Account Form */
              <form onSubmit={handleCreateAccountSubmit} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                      person_add
                    </span>
                    <span>Register New Account</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-xs font-mono text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    ← Back to List
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-mono font-semibold text-slate-700 block mb-1">
                    Full Operator Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Samantha Reed"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full text-xs font-sans bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono font-semibold text-slate-700 block mb-1">
                    Official Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g., samantha.reed@omnistock.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono font-semibold text-slate-700 block mb-1">
                      Staff ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., S-4099"
                      value={newStaffId}
                      onChange={(e) => setNewStaffId(e.target.value)}
                      className="w-full text-xs font-mono uppercase bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-semibold text-slate-700 block mb-1">
                      System Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full text-xs font-sans bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="Warehouse Operations Lead">Warehouse Operations Lead</option>
                      <option value="Inventory & Quality Manager">Inventory &amp; Quality Manager</option>
                      <option value="Procurement Specialist">Procurement Specialist</option>
                      <option value="Cold Chain Supervisor">Cold Chain Supervisor</option>
                      <option value="Logistics Coordinator">Logistics Coordinator</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-mono font-medium hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save &amp; Add Profile</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-slate-200 p-4 px-6 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">
              Profiles stored locally in session storage
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
