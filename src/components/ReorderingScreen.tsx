import React, { useState } from 'react';
import { PurchaseOrder, BatchRecommendation, LanguageCode } from '../types';
import { t, translateRecordedItem, translateRecordedUnit, translateFullText } from '../utils/i18n';
import { exportPOToExcel, exportPOToPDF, triggerBrowserPrint } from '../utils/exportUtils';

interface ReorderingScreenProps {
  purchaseOrders: PurchaseOrder[];
  batchRecs: BatchRecommendation[];
  currentLang?: LanguageCode;
  onApprovePO: (poId: string) => void;
  onAddBatchToDraft: (batchId: string) => void;
  onCreateCustomPO: () => void;
}

export const ReorderingScreen: React.FC<ReorderingScreenProps> = ({
  purchaseOrders,
  batchRecs,
  currentLang = 'en',
  onApprovePO,
  onAddBatchToDraft,
  onCreateCustomPO,
}) => {
  const [processingPoId, setProcessingPoId] = useState<string | null>(null);
  const [addedBatches, setAddedBatches] = useState<Record<string, boolean>>({});

  const handleApproveClick = (poId: string) => {
    setProcessingPoId(poId);
    setTimeout(() => {
      onApprovePO(poId);
      setProcessingPoId(null);
    }, 1200);
  };

  const handleAddBatch = (batchId: string) => {
    setAddedBatches((prev) => ({ ...prev, [batchId]: true }));
    onAddBatchToDraft(batchId);
    setTimeout(() => {
      setAddedBatches((prev) => ({ ...prev, [batchId]: false }));
    }, 2000);
  };

  const handlePrintPO = (po: PurchaseOrder) => {
    const itemsHtml =
      po.items && po.items.length > 0
        ? po.items
            .map(
              (i, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${i.name}</strong><br><small>${i.sku}</small></td>
            <td>${i.quantity} ${i.unit}</td>
            <td>₹${i.unitPrice.toLocaleString('en-IN')}</td>
            <td><strong>₹${i.total.toLocaleString('en-IN')}</strong></td>
          </tr>`
            )
            .join('')
        : `<tr><td>1</td><td>${po.itemsSummary}</td><td>${po.skuCount} SKUs</td><td>Bulk Rate</td><td>₹${po.totalValue.toLocaleString('en-IN')}</td></tr>`;

    const html = `
      <div class="invoice-card">
        <div class="header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f2b48; padding-bottom: 14px; margin-bottom: 18px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <svg width="40" height="40" viewBox="0 0 200 200" fill="none">
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
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; line-height: 1.1;"><span style="color: #0b2545;">Omni</span><span style="color: #16a34a;">Stock</span> Official Purchase Order</h1>
              <p style="margin: 2px 0 0 0; color: #1e3a5f; font-weight: bold; font-size: 11px;">Never Runout. Never Overstock</p>
              <p style="margin: 2px 0 0 0; color: #64748b; font-size: 11px;">PO: <strong>${po.poNumber}</strong> | Date: ${po.orderDate || new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 20px; color: #0b2545;">₹${po.totalValue.toLocaleString('en-IN')}</h2>
            <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #16a34a;">Status: ${po.status.toUpperCase()}</p>
          </div>
        </div>

        <div class="grid">
          <div>
            <h3>Supplier / Vendor</h3>
            <p><strong>${po.supplier}</strong></p>
            <p>Category: ${po.category}</p>
            <p>Contact: ${po.supplierPhone || '+91 98112 34567'}</p>
            <p>Email: ${po.supplierEmail || 'vendor@procurement.in'}</p>
          </div>
          <div>
            <h3>Delivery & Payment Terms</h3>
            <p>Expected: <strong>${po.expectedDelivery || 'Within 48 Hours'}</strong></p>
            <p>Terms: ${po.paymentTerms || 'Net 30 Days'}</p>
            <p>Warehouse: OmniStock Central Hub Bay-A</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Material Description</th>
              <th>Quantity</th>
              <th>Unit Rate</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row grand-total">
            <span>Total PO Value:</span>
            <span>₹${po.totalValue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    `;

    triggerBrowserPrint(`Purchase Order ${po.poNumber}`, html);
  };

  const pendingOrdersCount = purchaseOrders.filter((p) => p.status === 'pending').length;

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-200">
      {/* Header Banner - Matches Dashboard & Inventory Header Pattern */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Predictive Procurement Engine
            </p>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Purchase Orders &amp; Smart Reordering
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs font-semibold">
            {pendingOrdersCount} Pending Approval
          </span>
          <button
            onClick={onCreateCustomPO}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
            <span>New Custom PO</span>
          </button>
        </div>
      </div>

      {/* HERO: Predictive Engine AI Visualization */}
      <section className="relative overflow-hidden bento-card p-6 md:p-8 shadow-xs bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="material-symbols-outlined text-emerald-600 fill text-[20px]">
                auto_awesome
              </span>
              <span className="font-mono text-xs font-bold text-emerald-800 tracking-wider uppercase bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                Predictive Engine Active
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 max-w-2xl">
              AI-Optimized Replenishment Recommendations
            </h3>
            <p className="text-sm text-slate-600 mt-2 max-w-xl leading-relaxed">
              AI-driven analysis of sales velocity (12.4% ↑), supplier lead times, and seasonal volatility has
              identified 14 critical stock items requiring immediate replenishment.
            </p>
          </div>

          {/* Value Banner */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-2xs w-full md:w-auto min-w-[240px]">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-semibold">
              ESTIMATED ORDER VALUE
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-mono text-slate-900">
              ₹42,840.00
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 w-3/4 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* LEFT (8 Cols): Bento Priority & Batch Table */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-bold text-slate-900">
              Replenishment Priority
            </h3>
            <span className="text-xs font-mono text-slate-500 font-medium">AUTO-REFRESH IN 02:45</span>
          </div>

          {/* High Priority Priority Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1 */}
            <div className="p-5 bento-card shadow-xs flex flex-col justify-between bg-white border border-slate-200">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
                    CRITICAL STOCK
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-0.5">
                  {translateRecordedItem('Salted Grass-Fed Butter', currentLang)} (250g)
                </h4>
                <p className="text-xs font-mono text-slate-500 mb-4">SKU: SKU-BF-902</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600">Current Level</span>
                  <span className="text-rose-700 font-bold">12 / 150 Units</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '8%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-emerald-700">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  <span className="font-mono text-xs font-semibold">Velocity: +18.4% WoW</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-5 bento-card shadow-xs flex flex-col justify-between bg-white border border-slate-200">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
                    OPTIMIZED
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-0.5">
                  {translateRecordedItem('Organic All-Purpose Flour / Atta', currentLang)} (25kg)
                </h4>
                <p className="text-xs font-mono text-slate-500 mb-4">SKU: SKU-FL-309</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600">Current Level</span>
                  <span className="text-emerald-700 font-bold">48 / 60 Sacks</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: '80%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-emerald-700">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  <span className="font-mono text-xs font-semibold">Velocity: +4.2% WoW</span>
                </div>
              </div>
            </div>
          </div>

          {/* Batch Recommendations Table */}
          <div className="bento-card overflow-hidden shadow-xs bg-white border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  Automated SKU Restock Queue
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click to include recommended batch quantities directly into draft purchase orders.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-600 uppercase bg-slate-50/80 font-semibold">
                    <th className="px-5 py-3.5">SKU / Item Description</th>
                    <th className="px-5 py-3.5">Consumption Trend</th>
                    <th className="px-5 py-3.5">Suggested Order</th>
                    <th className="px-5 py-3.5 text-right">Draft Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {batchRecs.map((batch) => {
                    const isAdded = addedBatches[batch.id] || batch.addedToDraft;
                    return (
                      <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{translateRecordedItem(batch.name, currentLang)}</p>
                          <p className="text-[11px] font-mono text-slate-500">{batch.sku}</p>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`font-mono text-xs font-semibold inline-flex items-center gap-1 ${
                              batch.consumptionTrend === 'up'
                                ? 'text-emerald-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {batch.consumptionTrend === 'up' ? '▲' : '▬'} {batch.consumptionChange > 0 ? `+${batch.consumptionChange}%` : `${batch.consumptionChange}%`}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                          {batch.reorderQty.toLocaleString()} {translateRecordedUnit(batch.unit, currentLang)}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleAddBatch(batch.id)}
                            className={`font-mono text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-700 text-white shadow-2xs'
                                : 'text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100'
                            }`}
                          >
                            {isAdded ? '✓ Added' : 'Add to Draft'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT (4 Cols): Draft Purchase Orders with PDF / Excel / Print */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-bold text-slate-900">
              {t('export_po', currentLang)} ({purchaseOrders.length})
            </h3>
            <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold border border-slate-200">
              {pendingOrdersCount} PENDING
            </span>
          </div>

          <div className="space-y-4">
            {purchaseOrders.map((po) => {
              const isProcessing = processingPoId === po.id;
              const isSent = po.status === 'sent' || po.status === 'approved';

              return (
                <div
                  key={po.id}
                  className={`p-5 bento-card shadow-xs transition-all bg-white border border-slate-200 ${
                    po.isAiGenerated
                      ? 'border-l-4 border-l-emerald-600'
                      : 'border-l-4 border-l-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs text-slate-500 font-semibold">{po.poNumber}</span>
                    <div className="flex items-center gap-1.5">
                      {/* PDF Export */}
                      <button
                        onClick={() => exportPOToPDF(po)}
                        title="Download PO as PDF"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      </button>

                      {/* Excel Export */}
                      <button
                        onClick={() => exportPOToExcel(po)}
                        title="Download PO as Excel (.xlsx)"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">table_view</span>
                      </button>

                      {/* Print PO */}
                      <button
                        onClick={() => handlePrintPO(po)}
                        title="Print Purchase Order"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">print</span>
                      </button>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mb-2">{po.supplier}</h4>

                  <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Items</p>
                      <p className="text-xs font-semibold text-slate-900 truncate">{translateFullText(po.itemsSummary, currentLang)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Total Value</p>
                      <p className="text-xs font-mono font-bold text-emerald-700">
                        ₹{po.totalValue.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isSent || isProcessing}
                    onClick={() => handleApproveClick(po.id)}
                    className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      isSent
                        ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-default'
                        : isProcessing
                        ? 'bg-emerald-700 text-white opacity-80 cursor-wait'
                        : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        <span>Processing Order...</span>
                      </>
                    ) : isSent ? (
                      <>
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>Approved &amp; Dispatched</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm fill">send</span>
                        <span>Approve &amp; Send</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}

            {/* Create Custom PO Button */}
            <button
              onClick={onCreateCustomPO}
              className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl font-mono text-xs text-slate-700 hover:text-slate-900 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer bg-white hover:bg-slate-50 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-700">add_shopping_cart</span>
              <span>Create Custom Purchase Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
