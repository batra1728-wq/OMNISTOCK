import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenId, UserProfile, LanguageCode } from '../types';
import { INDIAN_LANGUAGES, t } from '../utils/i18n';
import { OmniStockLogo } from './OmniStockLogo';
import {
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
} from '../utils/desktopNotification';

interface HeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  user: UserProfile;
  accounts?: UserProfile[];
  unreadAlertsCount: number;
  currentLang: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onOpenSettings: () => void;
  onOpenAlerts: () => void;
  onOpenScanner: () => void;
  onOpenMobileScanner?: () => void;
  onOpenAIAssistant: () => void;
  onOpenGuide: () => void;
  onSignOut: () => void;
  onSwitchAccount?: (targetUser: UserProfile) => void;
  onOpenAccountSwitcher?: () => void;
  onOpenDeleteAccount?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  linkedMobileDevice?: {
    sessionId: string;
    device: string;
    connectedAt: number;
  } | null;
}

interface NavTab {
  id: ScreenId;
  labelKey: string;
  defaultLabel: string;
}

const DESKTOP_TABS: NavTab[] = [
  { id: 'dashboard', labelKey: 'nav_dashboard', defaultLabel: 'Dashboard' },
  { id: 'inventory', labelKey: 'nav_inventory', defaultLabel: 'Inventory' },
  { id: 'reordering', labelKey: 'nav_reordering', defaultLabel: 'Reorder & PO' },
  { id: 'analytics', labelKey: 'nav_analytics', defaultLabel: 'Analytics' },
];

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  user,
  accounts = [],
  unreadAlertsCount,
  currentLang,
  onLanguageChange: _onLanguageChange,
  onOpenSettings,
  onOpenAlerts,
  onOpenScanner,
  onOpenMobileScanner,
  onOpenAIAssistant,
  onOpenGuide,
  onSignOut,
  onSwitchAccount,
  onOpenAccountSwitcher,
  onOpenDeleteAccount,
  searchQuery,
  onSearchChange,
  linkedMobileDevice,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getDesktopNotificationPermission()
  );

  const currentLangObj = INDIAN_LANGUAGES.find((l) => l.code === currentLang) || INDIAN_LANGUAGES[0];

  return (
    <header className="w-full top-0 sticky z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-4 md:px-6 py-2.5 shadow-xs">
      {/* Left: Brand & Avatar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-9 h-9 rounded-xl overflow-hidden border border-slate-300 hover:border-emerald-600 transition-all cursor-pointer focus:outline-hidden ring-2 ring-transparent focus:ring-emerald-400 active:scale-95 shadow-2xs"
            title={`${user.name} (${user.role})`}
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </button>

          {/* Profile Dropdown */}
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 top-12 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 origin-top-left"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-300"
                  />
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs font-mono text-emerald-700 font-medium">{user.staffId}</p>
                    <p className="text-[11px] text-slate-600 truncate">{user.email || user.role}</p>
                  </div>
                </div>

                <div className="py-2 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-emerald-700">settings</span>
                    <span>Settings (Language &amp; Prefs)</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenGuide();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-emerald-700">menu_book</span>
                    <span>Warehouse User Guide</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAIAssistant();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-teal-700">smart_toy</span>
                    <span>AI Copilot &amp; Refill</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenScanner();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-emerald-700">qr_code_scanner</span>
                    <span>Mobile QR Barcode Scanner</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAlerts();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-rose-600">warning</span>
                      <span>System Alerts</span>
                    </span>
                    {unreadAlertsCount > 0 && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                        {unreadAlertsCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Switch & Manage Accounts Section */}
                <div className="pt-2 pb-1 border-t border-slate-100 flex flex-col gap-1">
                  <div className="px-2.5 py-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">
                      {t('switch_account', currentLang)}
                    </span>
                    {onOpenAccountSwitcher && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenAccountSwitcher();
                        }}
                        className="text-[10px] font-mono font-semibold text-emerald-800 hover:underline cursor-pointer"
                      >
                        Manage All
                      </button>
                    )}
                  </div>

                  {accounts
                    .filter((acc) => acc.id !== user.id)
                    .slice(0, 2)
                    .map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setShowProfileMenu(false);
                          onSwitchAccount?.(acc);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <img
                          src={acc.avatar}
                          alt={acc.name}
                          className="w-5 h-5 rounded-lg object-cover border border-slate-300"
                        />
                        <div className="truncate flex-1">
                          <p className="font-semibold text-xs truncate leading-tight text-slate-900">{acc.name}</p>
                          <p className="text-[10px] text-slate-600 font-mono truncate">{acc.role}</p>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                          Switch
                        </span>
                      </button>
                    ))}

                  {onOpenAccountSwitcher && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenAccountSwitcher();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-mono text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition-colors font-semibold"
                    >
                      <span className="material-symbols-outlined text-[16px]">switch_account</span>
                      <span>Switch / Add Account...</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-mono text-slate-800 hover:bg-slate-100 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-500">logout</span>
                    <span>Sign Out</span>
                  </button>

                  {onOpenDeleteAccount && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenDeleteAccount();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-mono text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <span className="material-symbols-outlined text-[18px] text-rose-600">person_remove</span>
                      <span>{t('delete_account', currentLang)}...</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <OmniStockLogo
            variant="horizontal"
            size="md"
            showTagline={false}
            onClick={() => onNavigate('dashboard')}
            className="hover:opacity-90 transition-opacity"
          />
          <span className="hidden lg:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full">
            v2.5
          </span>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 border border-slate-200 rounded-xl p-1 shadow-2xs">
        {DESKTOP_TABS.map((tab) => {
          const isActive = currentScreen === tab.id;
          const label = t(tab.labelKey, currentLang) || tab.defaultLabel;

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer select-none ${
                isActive ? 'text-white' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="desktopNavActivePill"
                  className="absolute inset-0 bg-slate-900 rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Actions (Settings, Search, Copilot, Scanner, Alerts) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* 1. SETTINGS BUTTON (Opens 22 Languages + Prefs Modal) */}
        <button
          onClick={onOpenSettings}
          className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300 shadow-2xs active:scale-95"
          title={`Select Language / भाषा चुनें (22 Official Languages of India) - Current: ${currentLangObj.name}`}
        >
          <span className="material-symbols-outlined text-[16px] text-emerald-700">translate</span>
          <span className="hidden sm:inline font-bold">{currentLangObj.nativeName}</span>
          <span className="sm:hidden font-bold uppercase text-[10px]">{currentLang}</span>
          <span className="material-symbols-outlined text-[14px] text-slate-500">arrow_drop_down</span>
        </button>

        {/* 2. QUICK SEARCH */}
        <AnimatePresence mode="wait">
          {showSearchInput ? (
            <motion.div
              key="search-input"
              initial={{ opacity: 0, scale: 0.95, width: 140 }}
              animate={{ opacity: 1, scale: 1, width: 'auto' }}
              exit={{ opacity: 0, scale: 0.95, width: 140 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center"
            >
              <input
                type="text"
                autoFocus
                placeholder={t('search_placeholder', currentLang)}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 w-44 sm:w-60 text-slate-900 shadow-2xs"
              />
              <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-slate-400">
                search
              </span>
              <button
                onClick={() => {
                  setShowSearchInput(false);
                  onSearchChange('');
                }}
                className="absolute right-2.5 text-slate-500 hover:text-slate-900 text-xs cursor-pointer p-0.5"
              >
                ×
              </button>
            </motion.div>
          ) : (
            <button
              key="search-btn"
              onClick={() => {
                setShowSearchInput(true);
                if (currentScreen !== 'inventory') {
                  onNavigate('inventory');
                }
              }}
              aria-label="Search"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title="Search Inventory"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
          )}
        </AnimatePresence>

        {/* 3. AI Assistant Quick Launch */}
        <button
          onClick={() => onOpenAIAssistant()}
          aria-label="AI Inventory Assistant"
          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-mono text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs flex items-center gap-1.5 group"
          title="Open AI Inventory Assistant"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">
            smart_toy
          </span>
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* 4. Barcode Scanner Quick Launch */}
        <button
          onClick={() => onOpenScanner()}
          aria-label="Open Mobile QR Scanner"
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 transition-all cursor-pointer active:scale-95 shadow-xs flex items-center gap-1.5 font-mono text-xs font-bold"
          title="Open Mobile QR Scanner to pair phone camera and sync stock live"
        >
          {linkedMobileDevice ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
            </span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
          )}
          <span className="hidden sm:inline">
            {linkedMobileDevice ? `${linkedMobileDevice.device || 'Phone'} Linked` : 'Phone QR Scanner'}
          </span>
        </button>

        {onOpenMobileScanner && (
          <button
            onClick={() => onOpenMobileScanner()}
            aria-label="Launch Fullscreen Mobile Scanner"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors cursor-pointer active:scale-95 shadow-2xs flex items-center gap-1 font-mono text-xs font-bold"
            title="Launch Fullscreen Mobile Scanner View"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-700">smartphone</span>
            <span className="hidden xl:inline">Mobile View</span>
          </button>
        )}

        {/* 5. Notifications / Alerts Button */}
        <button
          onClick={() => onOpenAlerts()}
          aria-label="System Alerts"
          className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer active:scale-95 border border-transparent hover:border-slate-200"
          title="System Alerts & Warnings"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold font-mono rounded-full flex items-center justify-center animate-pulse">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* 6. Desktop OS Reorder Alert Status & Permission Toggle */}
        <button
          onClick={async () => {
            const current = getDesktopNotificationPermission();
            if (current !== 'granted') {
              const res = await requestDesktopNotificationPermission();
              setDesktopPermission(res);
            } else {
              onOpenSettings();
            }
          }}
          aria-label="Desktop Reorder Alerts"
          className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer active:scale-95 border border-transparent hover:border-slate-200"
          title={
            desktopPermission === 'granted'
              ? 'Automated Desktop Alerts Active (Click to open settings)'
              : 'Click to Enable Automated Desktop Alerts on Reorder Point Breach'
          }
        >
          <span className="material-symbols-outlined text-[20px]">
            {desktopPermission === 'granted' ? 'notifications_active' : 'notification_add'}
          </span>
          <span
            className={`absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full border border-white ${
              desktopPermission === 'granted' ? 'bg-emerald-500' : 'bg-amber-400'
            }`}
          />
        </button>
      </div>
    </header>
  );
};
