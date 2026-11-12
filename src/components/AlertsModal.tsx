import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemAlert, LanguageCode } from '../types';
import { t, translateFullText } from '../utils/i18n';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SystemAlert[];
  onMarkAllRead: () => void;
  onToggleRead?: (alertId: string) => void;
  onDismissAlert?: (alertId: string) => void;
  onClearReadAlerts?: () => void;
  onTriggerTestAlert?: () => void;
  onAction: (alertId: string, actionType: string) => void;
  currentLang?: LanguageCode;
}

type FilterTab = 'all' | 'unread' | 'critical' | 'warning' | 'info';

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onMarkAllRead,
  onToggleRead,
  onDismissAlert,
  onClearReadAlerts,
  onTriggerTestAlert,
  onAction,
  currentLang = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation: Escape key closes or un-minimizes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Track scroll position for quick scroll-to-top floating button
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setShowScrollTop(scrollContainerRef.current.scrollTop > 180);
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);
  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === 'critical').length, [alerts]);
  const warningCount = useMemo(() => alerts.filter((a) => a.severity === 'warning').length, [alerts]);
  const hasReadAlerts = useMemo(() => alerts.some((a) => a.read), [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Tab filter
      if (activeTab === 'unread' && alert.read) return false;
      if (activeTab === 'critical' && alert.severity !== 'critical') return false;
      if (activeTab === 'warning' && alert.severity !== 'warning') return false;
      if (activeTab === 'info' && (alert.severity === 'critical' || alert.severity === 'warning')) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          alert.title.toLowerCase().includes(q) ||
          alert.description.toLowerCase().includes(q) ||
          alert.time.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alerts, activeTab, searchQuery]);

  const handleActionClick = (alertId: string, actionName: string) => {
    onAction(alertId, actionName);
    setFeedbackMessage(`Executed: "${actionName}"`);
    setTimeout(() => setFeedbackMessage(null), 2800);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Optional soft backdrop when not in pinned mode, enabling user to click outside or focus purely */}
      {!isPinned && (
        <motion.div
          key="alerts-soft-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* FLOATING ALERT SCREEN CONTAINER */}
      <motion.div
        key="alerts-floating-screen"
        initial={{ opacity: 0, y: -20, scale: 0.94, x: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          x: 0,
          height: isMinimized ? 'auto' : undefined,
        }}
        exit={{ opacity: 0, y: -20, scale: 0.94, x: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className={`fixed z-50 right-3 sm:right-6 top-16 sm:top-20 w-[calc(100vw-24px)] sm:w-[480px] md:w-[520px] max-w-[calc(100vw-24px)] bg-white rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMinimized
            ? 'h-auto max-h-[80px]'
            : 'h-[calc(100vh-140px)] sm:h-[640px] max-h-[86vh]'
        }`}
        style={{
          boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.08)',
        }}
        role="dialog"
        aria-modal="false"
        aria-labelledby="floating-alerts-title"
      >
        {/* Floating Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-col gap-2.5 shrink-0 select-none border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <span className="material-symbols-outlined text-[20px] animate-pulse">
                  notifications_active
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="floating-alerts-title" className="text-base font-bold text-white tracking-tight">
                    System Alerts &amp; Telemetry
                  </h2>
                  {unreadCount > 0 && (
                    <span className="bg-rose-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full animate-in fade-in">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Floating Telemetry Feed
                </p>
              </div>
            </div>

            {/* Window Controls: Pin, Minimize, Close */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? 'Unpin (enable click-outside dismiss)' : 'Pin on top (keep open while navigating)'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs flex items-center justify-center ${
                  isPinned
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isPinned ? 'push_pin' : 'keep'}
                </span>
              </button>

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand Alerts Window' : 'Minimize to Header'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isMinimized ? 'expand_more' : 'expand_less'}
                </span>
              </button>

              <button
                onClick={onClose}
                title="Close Alerts Screen"
                aria-label="Close alerts screen"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 transition-colors cursor-pointer flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Quick Action Toolbar (visible when expanded) */}
          {!isMinimized && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={onMarkAllRead}
                  disabled={unreadCount === 0}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 rounded-lg font-mono text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">done_all</span>
                  <span>Mark Read</span>
                </button>

                {hasReadAlerts && onClearReadAlerts && (
                  <button
                    onClick={onClearReadAlerts}
                    className="px-2.5 py-1 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded-lg font-mono text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[13px] text-slate-400">delete_sweep</span>
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {onTriggerTestAlert && (
                <button
                  onClick={onTriggerTestAlert}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 ml-auto"
                  title="Simulate a live telemetry or stock threshold event"
                >
                  <span className="material-symbols-outlined text-[14px]">sensors</span>
                  <span>+ Anomaly</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* BODY CONTENT (when expanded) */}
        {!isMinimized && (
          <>
            {/* Filter Tabs & Search Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  All ({alerts.length})
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    activeTab === 'unread'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                      activeTab === 'unread' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700 font-bold'
                    }`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('critical')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'critical'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  onClick={() => setActiveTab('warning')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'warning'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Warn ({warningCount})
                </button>
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'info'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Logs
                </button>
              </div>

              {/* Instant Search Filter */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter alert texts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-800 w-full sm:w-36 md:w-44 placeholder:text-slate-400"
                />
                <span className="material-symbols-outlined absolute left-2 top-1.5 text-[13px] text-slate-400">
                  search
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1 text-slate-400 hover:text-slate-700 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Temporary Feedback Banner */}
            <AnimatePresence>
              {feedbackMessage && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-emerald-700 text-white px-4 py-1.5 text-xs font-mono font-bold flex items-center justify-between gap-2 overflow-hidden shrink-0 shadow-inner"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    <span>{feedbackMessage}</span>
                  </div>
                  <button
                    onClick={() => setFeedbackMessage(null)}
                    className="text-emerald-200 hover:text-white text-xs cursor-pointer"
                  >
                    ×
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SCROLLABLE NOTIFICATIONS FEED */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="p-3.5 sm:p-4 overflow-y-auto flex-1 flex flex-col gap-3 bg-slate-100/60 relative scroll-smooth overscroll-contain"
            >
              {filteredAlerts.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-2xs my-auto">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {searchQuery ? 'No matching notifications' : 'Telemetry Normal & Stable'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                    {searchQuery
                      ? 'No alerts match your filter keyword.'
                      : 'All warehouse storage zones and stock par thresholds are healthy.'}
                  </p>

                  {onTriggerTestAlert && !searchQuery && (
                    <button
                      onClick={onTriggerTestAlert}
                      className="mt-3 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">sensors</span>
                      <span>Trigger Test Anomaly</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const isCritical = alert.severity === 'critical';
                  const isWarning = alert.severity === 'warning';
                  const isSuccess = alert.severity === 'success';

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      key={alert.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border bg-white shadow-2xs transition-all relative overflow-hidden group ${
                        !alert.read ? 'ring-1 ring-emerald-500/30' : 'opacity-95'
                      } ${
                        isCritical
                          ? 'border-l-4 border-l-rose-600 border-slate-200'
                          : isWarning
                          ? 'border-l-4 border-l-amber-500 border-slate-200'
                          : isSuccess
                          ? 'border-l-4 border-l-emerald-500 border-slate-200'
                          : 'border-l-4 border-l-slate-400 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Severity Icon */}
                        <div
                          className={`p-2 rounded-xl flex-shrink-0 ${
                            isCritical
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : isWarning
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span className="material-symbols-outlined fill text-[18px]">
                            {alert.icon || (isCritical ? 'warning' : isWarning ? 'error' : 'info')}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {translateFullText(alert.title, currentLang)}
                              </h3>
                              {!alert.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" title="Unread"></span>
                              )}
                              <span
                                className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded-md ${
                                  isCritical
                                    ? 'bg-rose-100 text-rose-800'
                                    : isWarning
                                    ? 'bg-amber-100 text-amber-800'
                                    : isSuccess
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {alert.severity}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[11px] font-mono text-slate-400">
                                {alert.time}
                              </span>

                              {/* Toggle Read */}
                              {onToggleRead && (
                                <button
                                  onClick={() => onToggleRead(alert.id)}
                                  title={alert.read ? 'Mark Unread' : 'Mark Read'}
                                  className="p-0.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    {alert.read ? 'mark_chat_unread' : 'done'}
                                  </span>
                                </button>
                              )}

                              {/* Dismiss */}
                              {onDismissAlert && (
                                <button
                                  onClick={() => onDismissAlert(alert.id)}
                                  title="Dismiss Alert"
                                  className="p-0.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    delete
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">
                            {translateFullText(alert.description, currentLang)}
                          </p>

                          {/* Action Buttons */}
                          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                            {alert.actionPrimary ? (
                              <button
                                onClick={() => handleActionClick(alert.id, alert.actionPrimary!)}
                                className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                  isCritical
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : isWarning
                                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                }`}
                              >
                                {t(alert.actionPrimary.toLowerCase(), currentLang) || alert.actionPrimary}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActionClick(alert.id, 'Acknowledged')}
                                className="text-[11px] font-mono font-semibold bg-slate-900 text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                              >
                                Acknowledge
                              </button>
                            )}

                            {alert.actionSecondary && (
                              <button
                                onClick={() => handleActionClick(alert.id, alert.actionSecondary!)}
                                className="text-[11px] font-mono font-medium bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer active:scale-95"
                              >
                                {alert.actionSecondary}
                              </button>
                            )}

                            {!alert.actionSecondary && alert.actionPrimary !== 'Acknowledge' && (
                              <button
                                onClick={() => handleActionClick(alert.id, 'Acknowledged')}
                                className="text-[11px] font-mono font-medium bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer active:scale-95"
                              >
                                Acknowledge
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* Floating Scroll-to-Top Action */}
              <AnimatePresence>
                {showScrollTop && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    onClick={scrollToTop}
                    className="sticky bottom-2 self-center px-3 py-1 bg-slate-900 text-white rounded-full text-[11px] font-mono font-semibold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer z-10 border border-slate-700/50"
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                    <span>Scroll to Top</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Floating Footer Status */}
            <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{filteredAlerts.length} of {alerts.length} notifications</span>
              </div>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all active:scale-95"
              >
                Dismiss Window
              </button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
