import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, LanguageCode } from '../types';
import { t } from '../utils/i18n';
import { exportInventoryToExcel, exportInventoryToPDF, triggerBrowserPrint } from '../utils/exportUtils';
import { OmniStockLogo } from './OmniStockLogo';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  currentLang?: LanguageCode;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  inventory,
  currentLang = 'en',
}) => {
  const [format, setFormat] = useState<'excel' | 'pdf' | 'csv' | 'print'>('excel');
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const totalValuation = inventory.reduce((sum, item) => sum + item.currentStock * item.price, 0);

  const handleExecuteExport = () => {
    if (format === 'excel') {
      exportInventoryToExcel(inventory);
    } else if (format === 'pdf') {
      exportInventoryToPDF(inventory);
    } else if (format === 'print') {
      const rowsHtml = inventory
        .map(
          (i, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${i.name}</strong><br><small>${i.sku}</small></td>
          <td>${i.category}</td>
          <td>${i.currentStock} / ${i.maxStock} ${i.unit}</td>
          <td>₹${i.price.toLocaleString('en-IN')}</td>
          <td><strong>₹${(i.currentStock * i.price).toLocaleString('en-IN')}</strong></td>
          <td>${i.status.toUpperCase()}</td>
          <td>${i.location || 'Bay-A1'}</td>
        </tr>`
        )
        .join('');

      const html = `
        <div class="invoice-card">
          <div class="header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f2b48; padding-bottom: 16px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <svg width="44" height="44" viewBox="0 0 200 200" fill="none">
                <path d="M 62 142 A 66 66 0 1 1 148 64" fill="none" stroke="#16a34a" stroke-width="14" stroke-linecap="round"/>
                <polygon points="144,48 166,66 138,76" fill="#16a34a"/>
                <g transform="translate(4, 8)">
                  <path d="M 96 46 L 132 66 L 96 86 L 60 66 Z" fill="#122a46"/>
                  <path d="M 78 56 L 114 76" stroke="#0b1c30" stroke-width="2" stroke-linecap="round"/>
                  <path d="M 60 66 L 96 86 L 96 134 L 60 114 Z" fill="#0b2239"/>
                  <polygon points="68,103 74,106 74,116 68,113" fill="#22c55e"/>
                  <polygon points="77,96 83,99 83,119 77,116" fill="#16a34a"/>
                  <polygon points="86,88 92,91 92,122 86,119" fill="#15803d"/>
                  <path d="M 96 86 L 132 66 L 132 114 L 96 134 Z" fill="#07192b"/>
                </g>
                <g transform="translate(138, 126)">
                  <circle cx="0" cy="0" r="23" fill="#ffffff" />
                  <circle cx="0" cy="0" r="20" fill="#16a34a" />
                  <path d="M -7 -1 L -2 5 L 8 -6" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
                </g>
              </svg>
              <div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 900; line-height: 1.1;"><span style="color: #0b2545;">Omni</span><span style="color: #16a34a;">Stock</span> Enterprise Inventory Audit</h1>
                <p style="margin: 3px 0 0 0; color: #1e3a5f; font-weight: 700; font-size: 11px;">Never Runout. Never Overstock</p>
                <p style="margin: 2px 0 0 0; color: #64748b; font-size: 11px;">Generated: ${new Date().toLocaleString()}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 22px; color: #0b2545;">₹${totalValuation.toLocaleString('en-IN')}</h2>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Total Stock Valuation</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #16a34a;">${inventory.length} Verified SKUs</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item & SKU</th>
                <th>Category</th>
                <th>Stock / Max</th>
                <th>Unit Rate</th>
                <th>Valuation</th>
                <th>Status</th>
                <th>Storage Bay</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
      triggerBrowserPrint('OmniStock Inventory Audit', html);
    } else {
      // CSV
      const headers = ['SKU', 'Name', 'Category', 'Current Stock', 'Max Stock', 'Price (INR)', 'Valuation (INR)', 'Expiry Date', 'Status'];
      const rows = inventory.map((i) => [
        i.sku,
        `"${i.name}"`,
        i.category,
        i.currentStock,
        i.maxStock,
        i.price.toFixed(2),
        (i.currentStock * i.price).toFixed(2),
        i.expiryDate,
        i.status,
      ]);
      const fileContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([fileContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OmniStock_Inventory_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col gap-4"
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <OmniStockLogo variant="icon" size="sm" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('export_inventory', currentLang)}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Generate printable PDF documents, Excel spreadsheets (.xlsx), or raw data tables of your entire inventory catalog.
          </p>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-slate-900 dark:text-white">
              Choose Export Option
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('excel')}
                className={`p-3 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                  format === 'excel'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">table_view</span>
                <span>{t('export_excel', currentLang)} (.xlsx)</span>
              </button>

              <button
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                  format === 'pdf'
                    ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                <span>{t('export_pdf', currentLang)} (PDF)</span>
              </button>

              <button
                onClick={() => setFormat('print')}
                className={`p-3 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                  format === 'print'
                    ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>{t('print_report', currentLang)}</span>
              </button>

              <button
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                  format === 'csv'
                    ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">grid_on</span>
                <span>CSV Table</span>
              </button>
            </div>
          </div>

          {/* Preview Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total Catalog Items:</span>
              <span className="font-bold text-slate-900 dark:text-white">{inventory.length} SKUs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total Calculated Valuation:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteExport}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-mono text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {downloaded ? (
                <>
                  <span className="material-symbols-outlined text-sm">check</span>
                  <span>Generated!</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Export {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
