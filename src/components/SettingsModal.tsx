import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, LanguageCode } from '../types';
import { INDIAN_LANGUAGES, t } from '../utils/i18n';
import { OmniStockLogo } from './OmniStockLogo';
import {
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  dispatchStockThresholdAlert,
} from '../utils/desktopNotification';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  accounts: UserProfile[];
  currentLang: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onOpenGuide: () => void;
  onOpenAccountSwitcher?: () => void;
  onOpenDeleteAccount?: () => void;
  onSignOut: () => void;
  onClearCache?: () => void;
  onShowToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  accounts,
  currentLang,
  onLanguageChange,
  onOpenGuide,
  onOpenAccountSwitcher,
  onOpenDeleteAccount,
  onSignOut,
  onClearCache,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'language' | 'warehouse' | 'notifications' | 'account'>('language');
  const [langSearch, setLangSearch] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState(() => {
    try {
      return localStorage.getItem('omnistock_currency') || '₹';
    } catch {
      return '₹';
    }
  });
  const [lowStockThreshold, setLowStockThreshold] = useState(() => {
    try {
      return localStorage.getItem('omnistock_low_threshold') || '15';
    } catch {
      return '15';
    }
  });
  const [enableSoundAlerts, setEnableSoundAlerts] = useState(() => {
    try {
      return localStorage.getItem('omnistock_sound_alerts') !== 'false';
    } catch {
      return true;
    }
  });
  const [enableAutoReorderDrafts, setEnableAutoReorderDrafts] = useState(() => {
    try {
      return localStorage.getItem('omnistock_auto_drafts') !== 'false';
    } catch {
      return true;
    }
  });
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getDesktopNotificationPermission()
  );
  const [enableDesktopAlerts, setEnableDesktopAlerts] = useState(() => {
    try {
      return localStorage.getItem('omnistock_desktop_alerts_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  if (!isOpen) return null;

  const filteredLanguages = INDIAN_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.region.toLowerCase().includes(langSearch.toLowerCase())
  );

  const handleRequestPermission = async () => {
    const res = await requestDesktopNotificationPermission();
    setDesktopPermission(res);
    if (res === 'granted') {
      onShowToast('Desktop notifications successfully enabled!');
    } else if (res === 'denied') {
      onShowToast('Desktop notifications were denied by browser.');
    } else {
      onShowToast('Browser notification requested.');
    }
  };

  const handleTestAlert = () => {
    dispatchStockThresholdAlert(
      {
        id: 'test-item',
        sku: 'OO-EV-100',
        name: 'Extra Virgin Olive Oil',
        currentStock: 12,
        maxStock: 100,
        reorderPoint: 25,
        unit: 'bottles (750ml)',
        imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=300&h=300',
      },
      { force: true }
    );
    onShowToast('🔔 Dispatched test desktop alert and acoustic chime!');
  };

  const handleSaveWarehousePrefs = () => {
    try {
      localStorage.setItem('omnistock_currency', currencySymbol);
      localStorage.setItem('omnistock_low_threshold', lowStockThreshold);
      localStorage.setItem('omnistock_sound_alerts', String(enableSoundAlerts));
      localStorage.setItem('omnistock_auto_drafts', String(enableAutoReorderDrafts));
      localStorage.setItem('omnistock_desktop_alerts_enabled', String(enableDesktopAlerts));
      onShowToast('Settings saved successfully!');
    } catch {
      onShowToast('Settings saved.');
    }
  };

  const currentLangObj = INDIAN_LANGUAGES.find((l) => l.code === currentLang) || INDIAN_LANGUAGES[0];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <OmniStockLogo variant="horizontal" size="sm" showTagline={false} />
            <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block" />
            <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider hidden sm:inline">
              Settings &amp; Preferences
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body with Left Tabs & Right Panel */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-full md:w-56 p-3 bg-slate-50/60 border-b md:border-b-0 md:border-r border-slate-200 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
            <button
              onClick={() => setActiveTab('language')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all text-left whitespace-nowrap cursor-pointer ${
                activeTab === 'language'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">translate</span>
              <span>Languages (22)</span>
            </button>

            <button
              onClick={() => setActiveTab('warehouse')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all text-left whitespace-nowrap cursor-pointer ${
                activeTab === 'warehouse'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">warehouse</span>
              <span>Warehouse Prefs</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all text-left whitespace-nowrap cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <span>Alerts &amp; Sound</span>
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all text-left whitespace-nowrap cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              <span>Account &amp; Staff</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {/* TAB 1: 22 INDIAN LANGUAGES */}
            {activeTab === 'language' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-emerald-700">language</span>
                      <span>22 Official Languages of India</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Current: <strong className="text-emerald-800 font-bold">{currentLangObj.name} ({currentLangObj.nativeName})</strong>
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search language..."
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      className="w-full sm:w-52 pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900"
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-slate-400">
                      search
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {filteredLanguages.map((lang) => {
                    const isSelected = lang.code === currentLang;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onLanguageChange(lang.code);
                          onShowToast(`Language set to ${lang.name} (${lang.nativeName})`);
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{lang.name}</span>
                            <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                              {lang.code}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-emerald-800 mt-0.5">{lang.nativeName}</p>
                          <p className="text-[10px] text-slate-600 font-mono">{lang.region}</p>
                        </div>
                        {isSelected && (
                          <span className="material-symbols-outlined text-emerald-700 text-[20px]">
                            check_circle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: WAREHOUSE PREFERENCES */}
            {activeTab === 'warehouse' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Warehouse Operational Rules</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Customize inventory units, currency, and stock safety margins.</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <label className="block text-xs font-bold font-mono text-slate-800 uppercase tracking-wide">
                      Currency Symbol
                    </label>
                    <div className="flex items-center gap-3">
                      {['₹', '$', '€', '£', 'AED'].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setCurrencySymbol(sym)}
                          className={`w-10 h-10 rounded-xl font-bold font-mono text-sm border flex items-center justify-center transition-all cursor-pointer ${
                            currencySymbol === sym
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wide">
                        Low Stock Alert Margin (%)
                      </label>
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        {lowStockThreshold}% of max capacity
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      step="5"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-600">
                      Items falling below {lowStockThreshold}% will automatically show warning badges on the dashboard.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Auto-Generate AI Reorder Drafts</h4>
                      <p className="text-[11px] text-slate-600">
                        Create AI-recommended Purchase Orders when stock reaches critical levels.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableAutoReorderDrafts}
                      onChange={(e) => setEnableAutoReorderDrafts(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer rounded"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveWarehousePrefs}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS & SOUND */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audio &amp; Alert Notifications</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Control sound effects and real-time popups.</p>
                </div>

                <div className="space-y-3">
                  {/* Automated Desktop Reorder Point Alerts */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[20px]">notification_important</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">Automated Reorder Point Desktop Alerts</h4>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                desktopPermission === 'granted'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : desktopPermission === 'denied'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                            >
                              {desktopPermission === 'granted'
                                ? 'OS Alerts Active'
                                : desktopPermission === 'denied'
                                ? 'Blocked in Browser'
                                : 'Needs Approval'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            Sends native OS desktop alerts and acoustic audio chimes whenever an item's stock level falls to or below its defined Reorder Point.
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableDesktopAlerts}
                        onChange={(e) => setEnableDesktopAlerts(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 cursor-pointer rounded shrink-0 mt-1"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {desktopPermission !== 'granted' && (
                          <button
                            type="button"
                            onClick={handleRequestPermission}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <span className="material-symbols-outlined text-sm">desktop_windows</span>
                            <span>Enable Native Browser Alerts</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleTestAlert}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm text-emerald-700">play_circle</span>
                          <span>Test Desktop Alert &amp; Chime</span>
                        </button>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Works in background &amp; minimizes stockout downtime
                      </span>
                    </div>
                  </div>

                  {/* Sound effects */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                        <span className="material-symbols-outlined text-[20px]">volume_up</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Audio Chimes &amp; Barcode Beep</h4>
                        <p className="text-[11px] text-slate-600">Play confirmation tone on scan and threshold acoustic chime</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableSoundAlerts}
                      onChange={(e) => setEnableSoundAlerts(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer rounded"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900">Warehouse User Manual</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Need help with stocktaking, scanning, or batch approvals? Open the interactive operational guide anytime.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenGuide();
                      }}
                      className="mt-2 px-3.5 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-xl text-xs font-mono font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px] text-emerald-700">menu_book</span>
                      <span>Launch User Guide</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveWarehousePrefs}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: ACCOUNT & SYSTEM */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Active Profile &amp; Sessions</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Manage authentication, roles, and warehouse accounts.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-300"
                  />
                  <div className="overflow-hidden flex-1">
                    <h4 className="text-sm font-bold text-slate-900">{user.name}</h4>
                    <p className="text-xs font-mono font-semibold text-emerald-800">{user.staffId} • {user.role}</p>
                    <p className="text-[11px] text-slate-600 font-mono truncate">{user.email}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                <div className="space-y-2">
                  {onOpenAccountSwitcher && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAccountSwitcher();
                      }}
                      className="w-full p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[20px] text-emerald-700">switch_account</span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Switch / Add Staff Account</p>
                          <p className="text-[11px] text-slate-600">{accounts.length} profile(s) saved on this workstation</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-slate-400">chevron_right</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className="w-full p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[20px] text-slate-600">logout</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Sign Out</p>
                        <p className="text-[11px] text-slate-600">End current shift session safely</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-slate-400">chevron_right</span>
                  </button>

                  {onOpenDeleteAccount && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenDeleteAccount();
                      }}
                      className="w-full p-3 bg-rose-50/50 hover:bg-rose-50 border border-rose-200 rounded-2xl text-left flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[20px] text-rose-600">person_remove</span>
                        <div>
                          <p className="text-xs font-bold text-rose-700">Delete Account &amp; Profiles</p>
                          <p className="text-[11px] text-rose-600">Permanently erase staff credentials</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-rose-400">chevron_right</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
