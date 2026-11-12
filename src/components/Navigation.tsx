import React from 'react';
import { motion } from 'motion/react';
import { ScreenId, LanguageCode } from '../types';
import { t } from '../utils/i18n';

interface NavigationProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  unreadAlertsCount: number;
  currentLang?: LanguageCode;
}

interface NavItem {
  id: ScreenId;
  labelKey: string;
  defaultLabel: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav_dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { id: 'inventory', labelKey: 'nav_inventory', defaultLabel: 'Inventory', icon: 'inventory_2' },
  { id: 'reordering', labelKey: 'nav_reordering', defaultLabel: 'PO & Reorder', icon: 'shopping_cart_checkout' },
  { id: 'analytics', labelKey: 'nav_analytics', defaultLabel: 'Analytics', icon: 'analytics' },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  onNavigate,
  unreadAlertsCount: _unreadAlertsCount,
  currentLang = 'en',
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-white/95 backdrop-blur-md px-2 py-2 border-t border-slate-200 shadow-lg">
      {NAV_ITEMS.map((item) => {
        const isActive = currentScreen === item.id;
        const translatedLabel = t(item.labelKey, currentLang) || item.defaultLabel;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-colors cursor-pointer select-none"
          >
            {isActive && (
              <motion.div
                layoutId="mobileNavActivePill"
                className="absolute inset-0 bg-slate-900 rounded-xl shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span
              className={`relative z-10 material-symbols-outlined text-[20px] transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.icon}
            </span>
            <span
              className={`relative z-10 font-mono text-[9px] leading-tight mt-0.5 transition-colors duration-200 truncate max-w-[70px] ${
                isActive ? 'text-white font-semibold' : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              {translatedLabel}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
