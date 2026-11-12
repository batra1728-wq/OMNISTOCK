import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageCode } from '../types';
import { t } from '../utils/i18n';
import { OmniStockLogo } from './OmniStockLogo';

interface WarehouseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddStock?: () => void;
  onOpenScanner?: () => void;
  onOpenAIAssistant?: () => void;
  currentLang?: LanguageCode;
}

type GuideTab = 'getting_started' | 'stock_management' | 'scanning' | 'ai_copilot' | 'zones_storage' | 'reordering' | 'shortcuts';

export const WarehouseGuideModal: React.FC<WarehouseGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenAddStock,
  onOpenScanner,
  onOpenAIAssistant,
  currentLang = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('getting_started');
  const [guideSearch, setGuideSearch] = useState('');

  if (!isOpen) return null;

  const tabs: { id: GuideTab; label: string; icon: string }[] = [
    { id: 'getting_started', label: 'Quick Start', icon: 'rocket_launch' },
    { id: 'stock_management', label: 'Stock & Par Levels', icon: 'inventory_2' },
    { id: 'scanning', label: 'Barcode Scanner', icon: 'qr_code_scanner' },
    { id: 'ai_copilot', label: 'AI Voice Refill', icon: 'smart_toy' },
    { id: 'zones_storage', label: 'Warehouse Zones', icon: 'warehouse' },
    { id: 'reordering', label: 'Purchase Orders', icon: 'shopping_cart' },
    { id: 'shortcuts', label: 'Hotkeys & Tips', icon: 'keyboard' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center p-1 border border-white/20 shadow-sm">
                <OmniStockLogo variant="icon" size="sm" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">OmniStock Warehouse Guide</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-semibold border border-emerald-500/30">
                    Staff Manual v2.5
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Never Runout. Never Overstock — Inventory tracking, zones, AI voice refills, and reordering.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Guide"
              className="p-1.5 rounded-xl hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Navigation Bar / Tabs */}
          <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700">
            {/* TAB: Quick Start */}
            {activeTab === 'getting_started' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-700 text-lg">check_circle</span>
                      Welcome to your Fresh Warehouse Workspace
                    </h3>
                    <p className="text-xs text-emerald-800 mt-1">
                      Your account is created and ready. You have complete control to add, categorize, and track SKUs to match your exact commercial kitchen or warehouse operations.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenAddStock && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenAddStock();
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono font-semibold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_box</span>
                        <span>Add First Item</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold flex items-center justify-center text-sm mb-3">
                        01
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">Add or Scan SKUs</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Register your commercial items with unique SKU tags, max storage thresholds, shelf-life expiry dates, and unit prices in INR (₹).
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-mono text-emerald-700 font-semibold">Tip: Auto SKU Barcode Generation included</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold flex items-center justify-center text-sm mb-3">
                        02
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">Assign Physical Zones</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Organize stock across dedicated cold storage vaults, dry goods racks, pantry zones, and spice repositories for effortless floor audits.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-mono text-emerald-700 font-semibold">Cold Storage #1-4 & Dry Zones D-01..12</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold flex items-center justify-center text-sm mb-3">
                        03
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">Automate Refills with AI</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Use the built-in Gemini AI Copilot to speak or type natural language restock commands and audit par level anomalies in real-time.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-mono text-emerald-700 font-semibold">Voice & NLP Execution Engine</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 text-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="material-symbols-outlined text-amber-400">tips_and_updates</span>
                    <span>Pro Onboarding Workflow</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    OmniStock automatically tracks consumption velocities, turnover multiples, and days until expiry. Whenever an item's volume drops beneath 20% of capacity, an automated alert and draft purchase order are drafted instantly.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: Stock & Par Levels */}
            {activeTab === 'stock_management' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Understanding Par Levels & Stock Statuses</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    OmniStock uses dynamic ratio monitoring between Current Stock and Maximum Par Capacity.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        OPTIMAL (40% – 95%)
                      </span>
                      <span className="material-symbols-outlined text-emerald-600">verified</span>
                    </div>
                    <p className="text-xs text-emerald-950 mt-2">
                      Healthy operating range. Stock levels are sufficient for current weekly consumption velocity without overstock risk.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300">
                        FULL (100% Capacity)
                      </span>
                      <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                    </div>
                    <p className="text-xs text-blue-950 mt-2">
                      Storage bin or pallet is at 100% designated capacity. Inbound shipments will require zone re-allocation.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        REORDER (20% – 40%)
                      </span>
                      <span className="material-symbols-outlined text-amber-600">shopping_cart_checkout</span>
                    </div>
                    <p className="text-xs text-amber-950 mt-2">
                      Stock is nearing safety threshold. Auto-batch recommendation is generated to prevent supplier lead-time runouts.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        CRITICAL (&lt; 20% or Expiring)
                      </span>
                      <span className="material-symbols-outlined text-rose-600">warning</span>
                    </div>
                    <p className="text-xs text-rose-950 mt-2">
                      Immediate action required. Stock count is below 20% or expiry date is within 3 days. High priority restock badge triggered.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider mb-2">
                    How to Edit & Correct Stock
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                    <li>Click on any inventory row to open the full Item Drawer with valuation analytics and audit history.</li>
                    <li>Click the <strong>Edit Stock</strong> icon to adjust par thresholds, unit costs (₹), or shelf-life expiry dates.</li>
                    <li>Use the <strong>Quick +1 / +5 / +10 / +50</strong> buttons to register floor restocks in under a second.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB: Barcode Scanner */}
            {activeTab === 'scanning' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">High-Precision Barcode & QR Scanner</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supports mobile device cameras, built-in webcams, and USB/Bluetooth hardware barcode laser guns.
                    </p>
                  </div>
                  {onOpenScanner && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenScanner();
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono font-semibold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                      <span>Launch Scanner</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
                      <span className="material-symbols-outlined text-emerald-700">photo_camera</span>
                      <span>Camera Mode</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      Align the red viewfinder guide with any product barcode (EAN-13, Code 128, QR Code). OmniStock will emit an audio confirmation beep and pull up the item details immediately.
                    </p>
                    <div className="text-[11px] font-mono text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                      Camera Permission: Handled automatically with camera flash toggle.
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
                      <span className="material-symbols-outlined text-emerald-700">barcode_reader</span>
                      <span>Hardware Scanner Gun Mode</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      Industrial barcode laser guns that send keystrokes are automatically recognized. Simply point and shoot at physical warehouse labels without needing to click any text box.
                    </p>
                    <div className="text-[11px] font-mono text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                      Shortcut: Press <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-300">S</kbd> anywhere to open scanner.
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
                  <span className="font-bold">Automated SKU Matching:</span> If a scanned barcode matches an existing catalog item, you can tap <strong>+1 Restock</strong> or <strong>-1 Pick</strong> with a single tap. If it's a new SKU, you will be prompted to register it immediately.
                </div>
              </div>
            )}

            {/* TAB: AI Copilot */}
            {activeTab === 'ai_copilot' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Gemini-Powered AI Voice & Natural Refill Engine</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Interact with warehouse data using spoken natural language or smart text prompts.
                    </p>
                  </div>
                  {onOpenAIAssistant && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAIAssistant();
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-mono font-semibold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                      <span>Open AI Copilot</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
                    Example Spoken / Written Commands:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                      <div>
                        <span className="font-mono text-emerald-700 font-semibold block mb-1">Direct Refill:</span>
                        <p className="text-slate-700 font-medium">"Refill 50 units of Whole Wheat Flour (Atta)"</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2">Adjusts stock by +50 and logs batch shipment</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                      <div>
                        <span className="font-mono text-emerald-700 font-semibold block mb-1">Batch Par Top-up:</span>
                        <p className="text-slate-700 font-medium">"Restock all critical dairy items to maximum par"</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2">Finds all dairy &lt; 20% and tops them up</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                      <div>
                        <span className="font-mono text-emerald-700 font-semibold block mb-1">Expiry Audit:</span>
                        <p className="text-slate-700 font-medium">"Which items are expiring in the next 7 days?"</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2">Returns expiring batches with discount guidance</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                      <div>
                        <span className="font-mono text-emerald-700 font-semibold block mb-1">Valuation Breakdown:</span>
                        <p className="text-slate-700 font-medium">"What is the total valuation of cold storage items?"</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2">Calculates live line value in Indian Rupees (₹)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl text-slate-200 text-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">mic</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Hands-Free Operation in Fast-Paced Kitchens:</p>
                    <p className="text-slate-400 text-[11px]">
                      Click the microphone icon inside the AI Assistant modal to dictate replenishment while on the warehouse floor.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Warehouse Zones */}
            {activeTab === 'zones_storage' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Physical Zone Organization</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structure your warehouse floor into designated physical zones for maximum picking velocity.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-mono font-bold text-xs">
                        CS
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Cold Storage Vaults (#1 – #4)</h4>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      Temperature controlled 0°C to 4°C. Reserved for fresh milk, cream, artisanal cheeses, butter, and perishable dairy.
                    </p>
                    <span className="text-[10px] font-mono text-sky-700 font-semibold">Critical FIFO Expiry Priority</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-mono font-bold text-xs">
                        D
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Dry Goods Storage (Zone D-01 .. D-12)</h4>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      Palletized and shelving racks for grains, Basmati rice bags, whole wheat flour (Atta), pasta, and cashews.
                    </p>
                    <span className="text-[10px] font-mono text-amber-700 font-semibold">High Volume Bulk Capacity</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-mono font-bold text-xs">
                        P
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Pantry & Oils (Zone P-01 .. P-08)</h4>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      Specialized shelving for Extra Virgin Olive Oil, aged balsamic vinegars, condiments, and preserved ingredients.
                    </p>
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold">Glass & Bottle Safe Racking</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-mono font-bold text-xs">
                        S
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Spices & Seasonings (Zone S-01 .. S-09)</h4>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      Aroma-sealed climate racks for Malabar black pepper, Himalayan pink rock salt, saffron, and specialty seasoning jars.
                    </p>
                    <span className="text-[10px] font-mono text-purple-700 font-semibold">Sealed Moisture-Proof Enclosures</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Purchase Orders */}
            {activeTab === 'reordering' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Automated Reordering & Purchase Orders (PO)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Streamline procurement by aggregating supplier drafts and single-click PO approvals.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-700 text-base">auto_fix_high</span>
                      AI Batch Recommendations
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      OmniStock monitors weekly consumption trends (+14% WoW, -4% WoW) and computes optimal reorder batch sizes based on supplier lead times.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-700 text-base">receipt_long</span>
                      Single-Click PO Generation
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Convert low-stock alerts or draft batches into formal Purchase Orders with auto-calculated GST totals, vendor routing, and exportable PDF manifests.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Hotkeys & Shortcuts */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Keyboard Shortcuts & Efficiency Tips</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Operate OmniStock at lightning speed with built-in hotkeys.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-mono">
                    <span className="text-slate-700 font-sans">Open Quick Search</span>
                    <kbd className="px-2 py-1 bg-white rounded border border-slate-300 text-slate-800 text-[11px] shadow-2xs">
                      /
                    </kbd>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-mono">
                    <span className="text-slate-700 font-sans">Launch Barcode Scanner</span>
                    <kbd className="px-2 py-1 bg-white rounded border border-slate-300 text-slate-800 text-[11px] shadow-2xs">
                      S
                    </kbd>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-mono">
                    <span className="text-slate-700 font-sans">Open AI Copilot Voice / Refill</span>
                    <kbd className="px-2 py-1 bg-white rounded border border-slate-300 text-slate-800 text-[11px] shadow-2xs">
                      A
                    </kbd>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-mono">
                    <span className="text-slate-700 font-sans">Add New Inventory SKU</span>
                    <kbd className="px-2 py-1 bg-white rounded border border-slate-300 text-slate-800 text-[11px] shadow-2xs">
                      N
                    </kbd>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>OmniStock Warehouse Guide • Ready for Operations</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
              >
                Close & Return to Warehouse
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
