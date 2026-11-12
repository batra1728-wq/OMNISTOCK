import React, { useState } from 'react';
import { ScreenId, LanguageCode } from '../types';
import { getRelativeDate } from '../utils/dateUtils';
import { t, translateRecordedItem, translateFullText } from '../utils/i18n';

interface AnalyticsScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenExportModal: () => void;
  currentLang?: LanguageCode;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  onNavigate,
  onOpenExportModal,
  currentLang = 'en',
}) => {
  const [timeRange, setTimeRange] = useState<string>('Last 30 Days');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [promoMarked, setPromoMarked] = useState<Record<string, boolean>>({});

  const monthlyData = [
    { month: 'MAR', value: 65, valuation: '₹1.56 Cr' },
    { month: 'APR', value: 72, valuation: '₹1.73 Cr' },
    { month: 'MAY', value: 85, valuation: '₹2.04 Cr' },
    { month: 'JUN', value: 60, valuation: '₹1.44 Cr' },
    { month: 'JUL', value: 92, valuation: '₹2.21 Cr' },
    { month: 'AUG', value: 78, valuation: '₹1.87 Cr' },
  ];

  const handleMarkPromo = (sku: string) => {
    setPromoMarked((prev) => ({ ...prev, [sku]: true }));
  };

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-200">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-1">
            OPERATIONAL INTELLIGENCE
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Inventory Analytics</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none flex items-center gap-1.5 pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium hover:bg-slate-50 transition-colors cursor-pointer outline-none shadow-2xs"
            >
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Quarter">This Quarter</option>
              <option value="Year to Date">Year to Date (YTD)</option>
              <option value="Fiscal Year 2026-27">Fiscal Year 2026-27</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[18px] text-slate-400">
              calendar_today
            </span>
          </div>

          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-mono font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI GRID: 5 Vital Metric Cards (Bento Tile Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Turnover Rate */}
        <div className="bento-card p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-mono text-slate-500 mb-1">Turnover Rate</p>
            <h3 className="text-2xl font-bold font-mono text-slate-900">4.5x</h3>
            <div className="flex items-center text-emerald-700 gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span className="font-mono text-[11px] font-semibold">+0.8% vs LY</span>
            </div>
          </div>
          <div className="relative w-13 h-13 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <circle
                className="text-slate-100"
                cx="18"
                cy="18"
                fill="transparent"
                r="15"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <circle
                className="text-emerald-600"
                cx="18"
                cy="18"
                fill="transparent"
                r="15"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeDasharray="94.2"
                strokeDashoffset="23.5"
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-700 text-[18px]">
                swap_horiz
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Stock Accuracy */}
        <div className="bento-card p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-mono text-slate-500 mb-1">Stock Accuracy</p>
            <h3 className="text-2xl font-bold font-mono text-slate-900">99.8%</h3>
            <div className="flex items-center text-emerald-700 gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              <span className="font-mono text-[11px] font-semibold">High Reliability</span>
            </div>
          </div>
          <div className="relative w-13 h-13 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <circle
                className="text-slate-100"
                cx="18"
                cy="18"
                fill="transparent"
                r="15"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <circle
                className="text-emerald-600"
                cx="18"
                cy="18"
                fill="transparent"
                r="15"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeDasharray="94.2"
                strokeDashoffset="1.5"
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-700 text-[18px]">
                verified
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Out of Stock */}
        <div className="bento-card p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-mono text-slate-500 mb-1">Out of Stock</p>
            <h3 className="text-2xl font-bold font-mono text-rose-600">12</h3>
            <div className="flex items-center text-rose-600 gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">warning</span>
              <span className="font-mono text-[11px] font-semibold">Requires Action</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <span className="material-symbols-outlined text-[22px]">inventory</span>
          </div>
        </div>

        {/* KPI 4: Total Valuation */}
        <div className="bento-card p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-mono text-slate-500 mb-1">Total Valuation</p>
            <h3 className="text-2xl font-bold font-mono text-slate-900">₹2.4 Cr</h3>
            <div className="flex items-center text-slate-400 gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">update</span>
              <span className="font-mono text-[11px]">Updated 2m ago</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
            <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
          </div>
        </div>

        {/* KPI 5: Expiring Soon */}
        <div className="bento-card p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-mono text-slate-500 mb-1">Expiring Soon</p>
            <h3 className="text-2xl font-bold font-mono text-amber-600">08</h3>
            <div className="flex items-center text-amber-700 gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">event_busy</span>
              <span className="font-mono text-[11px]">Next 7 Days</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <span className="material-symbols-outlined text-[22px]">timer</span>
          </div>
        </div>
      </div>

      {/* CHARTS MIDDLE SECTION (Bento Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart: Monthly Stock Valuation (2 Cols Bento Tile) */}
        <div className="lg:col-span-2 bento-card p-6 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-base md:text-lg font-bold text-slate-900">Monthly Stock Valuation</h4>
              <p className="text-xs text-slate-500 font-mono">Consolidated inventory asset value trends</p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span className="font-mono text-xs text-slate-600">Asset Value</span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="relative h-64 w-full flex items-end justify-between gap-3 pt-6 px-2">
            {/* Grid Guidelines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
              <div className="w-full border-t border-dashed border-slate-200"></div>
              <div className="w-full border-t border-dashed border-slate-200"></div>
              <div className="w-full border-t border-dashed border-slate-200"></div>
              <div className="w-full border-t border-dashed border-slate-200"></div>
            </div>

            {/* Render Bars */}
            {monthlyData.map((item, index) => {
              const isHovered = hoveredBarIndex === index;
              return (
                <div
                  key={item.month}
                  onMouseEnter={() => setHoveredBarIndex(index)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer z-10"
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-10 bg-slate-900 text-white text-[11px] font-mono font-bold py-1 px-2 rounded-lg shadow-md whitespace-nowrap animate-in fade-in duration-100 z-20">
                      {item.month}: {item.valuation}
                    </div>
                  )}

                  <div
                    className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 ${
                      isHovered ? 'bg-emerald-700 shadow-md scale-y-105' : 'bg-emerald-600'
                    }`}
                    style={{ height: `${item.value}%` }}
                  ></div>

                  <span className="mt-3 font-mono text-xs font-semibold text-slate-600">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie Chart: Inventory by Category (1 Col Bento Tile) */}
        <div className="bento-card p-6 shadow-xs flex flex-col justify-between">
          <h4 className="text-base md:text-lg font-bold text-slate-900 mb-2">
            Inventory by Category
          </h4>

          {/* Donut Chart SVG */}
          <div className="flex-1 flex items-center justify-center relative py-4">
            <svg className="w-44 h-44" viewBox="0 0 42 42">
              {/* Segment 1: Dry Goods (50%) */}
              <circle
                cx="21"
                cy="21"
                fill="transparent"
                r="15.915"
                stroke="#059669"
                strokeWidth="6"
                strokeDasharray="50 50"
                strokeDashoffset="25"
              />
              {/* Segment 2: Dairy (25%) */}
              <circle
                cx="21"
                cy="21"
                fill="transparent"
                r="15.915"
                stroke="#34d399"
                strokeWidth="6"
                strokeDasharray="25 75"
                strokeDashoffset="75"
              />
              {/* Segment 3: Pantry (25%) */}
              <circle
                cx="21"
                cy="21"
                fill="transparent"
                r="15.915"
                stroke="#0f172a"
                strokeWidth="6"
                strokeDasharray="25 75"
                strokeDashoffset="50"
              />
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-slate-900">654</span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                SKUS
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                <span className="text-xs text-slate-800">Dry Goods</span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-900">50%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="text-xs text-slate-800">Dairy</span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-900">25%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-900"></span>
                <span className="text-xs text-slate-800">Pantry Essentials</span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-900">25%</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION 1: Expiry Status Alerts (Bento Container) */}
      <div className="bento-card overflow-hidden shadow-xs">
        <div className="px-6 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h4 className="text-base font-bold text-slate-900">Expiry Status Alerts</h4>
          <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-mono font-bold rounded-md uppercase">
            Urgent
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-mono text-xs border-b border-slate-200">
                <th className="px-6 py-3 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-3 uppercase tracking-wider">Expiry Date</th>
                <th className="px-6 py-3 uppercase tracking-wider">Days Left</th>
                <th className="px-6 py-3 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Row 1: Fresh Whole Milk */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">{translateRecordedItem('Fresh Whole Milk', currentLang)}</span>
                    <span className="text-xs font-mono text-slate-500">#SKU-11022</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 font-mono text-xs text-slate-700">{getRelativeDate(2)}</td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs font-bold">
                    2 DAYS
                  </span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <button
                    onClick={() => handleMarkPromo('SKU-11022')}
                    className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      promoMarked['SKU-11022']
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {promoMarked['SKU-11022'] ? '✓ Marked for Promo' : 'Mark for Promo'}
                  </button>
                </td>
              </tr>

              {/* Row 2: Greek Yogurt Pack */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">{translateRecordedItem('Greek Yogurt Pack', currentLang)}</span>
                    <span className="text-xs font-mono text-slate-500">#SKU-44901</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 font-mono text-xs text-slate-700">{getRelativeDate(5)}</td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold">
                    5 DAYS
                  </span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <button
                    onClick={() => handleMarkPromo('SKU-44901')}
                    className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      promoMarked['SKU-44901']
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {promoMarked['SKU-44901'] ? '✓ Marked for Promo' : 'Mark for Promo'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM SECTION 2: Critical Reorder Analysis (Bento Container) */}
      <div className="bento-card overflow-hidden shadow-xs">
        <div className="px-6 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h4 className="text-base font-bold text-slate-900">Critical Reorder Analysis</h4>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-emerald-700 font-mono text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>View Full Inventory</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-300 font-mono text-xs">
                <th className="px-6 py-3 uppercase tracking-wider">SKU / Item Name</th>
                <th className="px-6 py-3 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 uppercase tracking-wider">Turnover</th>
                <th className="px-6 py-3 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Row 1: Salted Butter */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">{translateRecordedItem('Salted Butter', currentLang)}</span>
                    <span className="text-xs font-mono text-slate-500">#SKU-90210</span>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono rounded-md uppercase">
                    {translateFullText('Dairy', currentLang)}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <div className="w-32 space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-600">45/500</span>
                      <span className="text-rose-600 font-bold">9%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: '9%' }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-900">8.2x</td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs font-bold">
                    CRITICAL LOW
                  </span>
                </td>
              </tr>

              {/* Row 2: Olive Oil */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">{translateRecordedItem('Olive Oil', currentLang)}</span>
                    <span className="text-xs font-mono text-slate-500">#SKU-77341</span>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono rounded-md uppercase">
                    {translateFullText('Pantry', currentLang)}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <div className="w-32 space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-600">12/150</span>
                      <span className="text-rose-600 font-bold">8%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: '8%' }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-900">3.1x</td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs font-bold">
                    CRITICAL LOW
                  </span>
                </td>
              </tr>

              {/* Row 3: Yeast */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">Yeast</span>
                    <span className="text-xs font-mono text-slate-500">#SKU-21105</span>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono rounded-md uppercase">
                    Dry Goods
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <div className="w-32 space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-600">28/100</span>
                      <span className="text-amber-700 font-bold">28%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '28%' }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-900">5.5x</td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold">
                    LOW STOCK
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
