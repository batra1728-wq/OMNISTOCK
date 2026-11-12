import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, LanguageCode } from '../types';
import { getRelativeDate } from '../utils/dateUtils';
import { t } from '../utils/i18n';
import { COMMON_QUANTITY_UNITS, getUnitIcon } from '../utils/units';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  currentLang?: LanguageCode;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  currentLang = 'en',
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<InventoryItem['category']>('Pantry');
  const [currentStock, setCurrentStock] = useState(50);
  const [maxStock, setMaxStock] = useState(100);
  const [reorderPoint, setReorderPoint] = useState(25);
  const [unit, setUnit] = useState('units');
  const [price, setPrice] = useState(250.0);
  const [expiryDate, setExpiryDate] = useState(() => getRelativeDate(180));
  const [location, setLocation] = useState('Zone P-02');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300&h=300'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;

    let calculatedStatus: InventoryItem['status'] = 'OPTIMAL';
    if (currentStock === 0) calculatedStatus = 'CRITICAL';
    else if (currentStock <= maxStock * 0.2) calculatedStatus = 'LOW';
    else if (currentStock <= maxStock * 0.4) calculatedStatus = 'REORDER';
    else if (currentStock >= maxStock) calculatedStatus = 'FULL';

    onAddItem({
      name,
      sku: sku.toUpperCase(),
      category,
      currentStock,
      maxStock,
      reorderPoint: Number(reorderPoint),
      unit,
      price: Number(price),
      expiryDate: expiryDate || 'N/A',
      status: calculatedStatus,
      imageUrl:
        imageUrl ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300&h=300',
      location,
      consumptionVelocity: '+5.0% WoW',
      turnoverRate: '4.0x',
      leadTimeDays: 7,
    });

    onClose();
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
          className="bg-white text-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">add_box</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Register New SKU</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                Item Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Organic Almond Milk"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                SKU Identifier
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MK-ALM-1L"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              >
                <option value="Pantry">Pantry</option>
                <option value="Dry Goods">Dry Goods</option>
                <option value="Dairy">Dairy</option>
                <option value="Spices">Spices</option>
                <option value="Equipment">Equipment</option>
                <option value="Refrigerated">Refrigerated</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                Unit Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                Max Capacity
              </label>
              <input
                type="number"
                required
                value={maxStock}
                onChange={(e) => setMaxStock(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1 flex items-center justify-between">
                <span>Quantity Unit</span>
                <span className="text-[10px] text-emerald-600 font-bold uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">{getUnitIcon(unit)}</span>
                  {unit}
                </span>
              </label>
              <select
                value={COMMON_QUANTITY_UNITS.some((u) => u.id === unit || u.shortLabel === unit) ? unit : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setUnit(e.target.value);
                  } else {
                    setUnit('');
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              >
                <optgroup label="Bulk Packaging">
                  <option value="boxes">📦 Boxes (box)</option>
                  <option value="barrels">🛢️ Barrels (bbl)</option>
                  <option value="crates">🧺 Crates (crt)</option>
                  <option value="cartons">📦 Cartons (ctn)</option>
                  <option value="drums">🛢️ Drums (drm)</option>
                  <option value="sacks">🛍️ Sacks (sck)</option>
                  <option value="pallets">🪵 Pallets (plt)</option>
                  <option value="cases">📦 Cases (cs)</option>
                </optgroup>
                <optgroup label="Containers & Retail">
                  <option value="bags">🛍️ Bags (bag)</option>
                  <option value="tins">🥫 Tins / Cans (tin)</option>
                  <option value="packs">📦 Packs (pck)</option>
                  <option value="bottles">🍾 Bottles (btl)</option>
                  <option value="jars">🫙 Jars (jar)</option>
                </optgroup>
                <optgroup label="Weight & Volume">
                  <option value="kg">⚖️ Kilograms (kg)</option>
                  <option value="g">⚖️ Grams (g)</option>
                  <option value="liters">💧 Liters (L)</option>
                  <option value="ml">💧 Milliliters (ml)</option>
                </optgroup>
                <optgroup label="Discrete & Other">
                  <option value="units">🏷️ Units / Pieces (pcs)</option>
                  <option value="custom">✏️ Custom Unit...</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Quick Packaging Unit Badges & Custom Input */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Quick Unit Presets:</span>
              <span className="text-[10px] text-slate-400">Box, Barrel, Crate, etc.</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'boxes', label: 'Boxes', icon: 'inventory_2' },
                { id: 'barrels', label: 'Barrels', icon: 'oil_barrel' },
                { id: 'crates', label: 'Crates', icon: 'grid_view' },
                { id: 'cartons', label: 'Cartons', icon: 'all_inbox' },
                { id: 'drums', label: 'Drums', icon: 'propane_tank' },
                { id: 'sacks', label: 'Sacks', icon: 'shopping_bag' },
                { id: 'bags', label: 'Bags', icon: 'shopping_bag' },
                { id: 'tins', label: 'Tins', icon: 'takeout_dining' },
                { id: 'bottles', label: 'Bottles', icon: 'water_bottle' },
                { id: 'kg', label: 'kg', icon: 'scale' },
                { id: 'liters', label: 'Liters', icon: 'opacity' },
                { id: 'units', label: 'Units', icon: 'filter_frames' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setUnit(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1 transition-all cursor-pointer ${
                    unit.toLowerCase().includes(opt.id)
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* If custom or user wants to type exact unit */}
            {(!COMMON_QUANTITY_UNITS.some((u) => u.id === unit || u.shortLabel === unit) || unit === '') && (
              <div className="pt-1">
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Enter custom packaging unit (e.g. 50L Drum, Wooden Crate)..."
                  className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Reorder Point Threshold Alert Setting */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/90 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-950">
                <span className="material-symbols-outlined text-[16px] text-amber-700">notification_important</span>
                <span>Reorder Point Alert Threshold ({unit})</span>
              </label>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                  currentStock <= reorderPoint
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                {currentStock <= reorderPoint ? '⚠️ Triggers Alert' : '✅ Stock Safe'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={maxStock}
                required
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Math.max(0, Number(e.target.value)))}
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-600 outline-none shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setReorderPoint(Math.max(1, Math.round(maxStock * 0.25)))}
                className="shrink-0 px-2.5 py-2 text-xs font-mono font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl transition-colors cursor-pointer"
                title="Reset to 25% Par Level"
              >
                25% Par
              </button>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-tight">
              An automated desktop alert and audio chime triggers whenever stock falls to or below this threshold.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="e.g. 15 Oct 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                Warehouse Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Zone A-01"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
              Image URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl font-mono text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-700 text-white rounded-xl font-mono text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              Save SKU to System
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  </AnimatePresence>
  );
};
