import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, StockStatus, LanguageCode } from '../types';
import { ItemDetailDrawer } from './ItemDetailDrawer';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import {
  t,
  translateRecordedItem,
  translateRecordedLocation,
  translateRecordedUnit,
} from '../utils/i18n';

interface InventoryScreenProps {
  inventory: InventoryItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentLang?: LanguageCode;
  recentlyUpdatedSku?: string | null;
  onOpenScanner: (item?: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onAddToDraft: (item: InventoryItem) => void;
  onOpenAddStock: () => void;
  onOpenExport?: () => void;
  onOpenGuide?: () => void;
  onLoadSampleCatalog?: () => void;
  onRefillQuantity?: (sku: string, addedQty: number) => void;
  onBatchAddToDraft?: (items: InventoryItem[]) => void;
  onDeleteItem?: (item: InventoryItem) => void;
  onBatchDelete?: (items: InventoryItem[]) => void;
}

type ViewMode = 'table' | 'cards' | 'compact';
type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'stock-asc'
  | 'stock-desc'
  | 'percentage-asc'
  | 'value-desc'
  | 'value-asc'
  | 'expiry-asc'
  | 'velocity-desc';

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  inventory,
  searchQuery,
  onSearchChange,
  currentLang = 'en',
  recentlyUpdatedSku,
  onOpenScanner,
  onEditItem,
  onAddToDraft,
  onOpenAddStock,
  onOpenExport,
  onOpenGuide,
  onLoadSampleCatalog,
  onRefillQuantity,
  onBatchAddToDraft,
  onDeleteItem,
  onBatchDelete,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expiring_soon' | 'stable'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [inspectedItem, setInspectedItem] = useState<InventoryItem | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [quickRestockFeedback, setQuickRestockFeedback] = useState<string | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<InventoryItem | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Dynamic Category list with exact counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = { All: inventory.length };
    inventory.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return [
      { name: 'All', count: counts['All'] || 0 },
      { name: 'Pantry', count: counts['Pantry'] || 0 },
      { name: 'Dry Goods', count: counts['Dry Goods'] || 0 },
      { name: 'Dairy', count: counts['Dairy'] || 0 },
      { name: 'Spices', count: counts['Spices'] || 0 },
      { name: 'Equipment', count: counts['Equipment'] || 0 },
      { name: 'Refrigerated', count: counts['Refrigerated'] || 0 },
    ].filter((c) => c.name === 'All' || c.count > 0);
  }, [inventory]);

  // Key KPI Aggregations
  const stats = useMemo(() => {
    const totalValuation = inventory.reduce((acc, item) => acc + item.price * item.currentStock, 0);
    const lowStockCount = inventory.filter((i) => i.status === 'LOW' || i.status === 'CRITICAL').length;
    const reorderCount = inventory.filter((i) => i.status === 'REORDER').length;
    const expiringSoonCount = inventory.filter((i) => i.daysToExpiry !== undefined && i.daysToExpiry <= 15).length;
    const totalUnits = inventory.reduce((acc, item) => acc + item.currentStock, 0);
    const maxCapacity = inventory.reduce((acc, item) => acc + item.maxStock, 0);
    const overallFillRate = maxCapacity > 0 ? Math.round((totalUnits / maxCapacity) * 100) : 0;

    return {
      totalItems: inventory.length,
      totalValuation,
      lowStockCount,
      reorderCount,
      expiringSoonCount,
      totalUnits,
      overallFillRate,
    };
  }, [inventory]);

  // Filter & Sort Logic
  const filteredAndSortedItems = useMemo(() => {
    let result = inventory.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        item.unit.toLowerCase().includes(q);

      const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;

      let matchZone = true;
      if (selectedZone !== 'All') {
        if (selectedZone === 'Cold Storage') {
          matchZone = !!item.location?.toLowerCase().includes('cold') || item.category === 'Dairy' || item.category === 'Refrigerated';
        } else if (selectedZone === 'Dry Goods') {
          matchZone = !!item.location?.toLowerCase().includes('zone d') || item.category === 'Dry Goods';
        } else if (selectedZone === 'Pantry') {
          matchZone = !!item.location?.toLowerCase().includes('zone p') || item.category === 'Pantry';
        } else if (selectedZone === 'Spices') {
          matchZone = !!item.location?.toLowerCase().includes('zone s') || item.category === 'Spices';
        }
      }

      let matchStatus = true;
      if (selectedStatus === 'LOW') {
        matchStatus = item.status === 'LOW' || item.status === 'CRITICAL';
      } else if (selectedStatus !== 'All') {
        matchStatus = item.status === selectedStatus;
      }

      let matchExpiry = true;
      if (expiryFilter === 'expiring_soon') {
        matchExpiry = item.daysToExpiry !== undefined && item.daysToExpiry <= 15;
      } else if (expiryFilter === 'stable') {
        matchExpiry = item.daysToExpiry === undefined || item.daysToExpiry > 15;
      }

      return matchSearch && matchCategory && matchZone && matchStatus && matchExpiry;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'stock-asc':
          return a.currentStock - b.currentStock;
        case 'stock-desc':
          return b.currentStock - a.currentStock;
        case 'percentage-asc':
          return (a.currentStock / (a.maxStock || 1)) - (b.currentStock / (b.maxStock || 1));
        case 'value-desc':
          return b.price * b.currentStock - a.price * a.currentStock;
        case 'value-asc':
          return a.price * a.currentStock - b.price * b.currentStock;
        case 'expiry-asc':
          return (a.daysToExpiry ?? 9999) - (b.daysToExpiry ?? 9999);
        case 'velocity-desc':
          return (
            parseFloat(b.consumptionVelocity?.replace(/[^0-9.-]/g, '') || '0') -
            parseFloat(a.consumptionVelocity?.replace(/[^0-9.-]/g, '') || '0')
          );
        default:
          return 0;
      }
    });

    return result;
  }, [inventory, searchQuery, selectedCategory, selectedZone, selectedStatus, expiryFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    return filteredAndSortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedZone !== 'All' ? 1 : 0) +
    (selectedStatus !== 'All' ? 1 : 0) +
    (expiryFilter !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const handleResetFilters = () => {
    onSearchChange('');
    setSelectedCategory('All');
    setSelectedZone('All');
    setSelectedStatus('All');
    setExpiryFilter('all');
    setSortBy('name-asc');
    setCurrentPage(1);
  };

  const toggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === paginatedItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(paginatedItems.map((i) => i.id)));
    }
  };

  const handleBatchReorder = () => {
    const selectedItems = inventory.filter((item) => selectedItemIds.has(item.id));
    if (onBatchAddToDraft) {
      onBatchAddToDraft(selectedItems);
    } else {
      selectedItems.forEach((item) => onAddToDraft(item));
    }
    setQuickRestockFeedback(`Added ${selectedItems.length} items to reorder draft`);
    setSelectedItemIds(new Set());
    setTimeout(() => setQuickRestockFeedback(null), 3000);
  };

  const handleConfirmSingleDelete = async () => {
    if (!deleteModalItem || !onDeleteItem) return;
    setIsDeleting(true);
    try {
      await onDeleteItem(deleteModalItem);
      setDeleteModalItem(null);
      if (inspectedItem?.id === deleteModalItem.id) {
        setInspectedItem(null);
      }
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteModalItem.id);
        return next;
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBatchDelete = async () => {
    const selectedItems = inventory.filter((item) => selectedItemIds.has(item.id));
    if (selectedItems.length === 0) return;
    setIsDeleting(true);
    try {
      if (onBatchDelete) {
        await onBatchDelete(selectedItems);
      } else if (onDeleteItem) {
        for (const it of selectedItems) {
          await onDeleteItem(it);
        }
      }
      setSelectedItemIds(new Set());
      setIsBatchDeleteModalOpen(false);
      if (inspectedItem && selectedItemIds.has(inspectedItem.id)) {
        setInspectedItem(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInlineRestock = (item: InventoryItem, qty: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRefillQuantity) {
      onRefillQuantity(item.sku, qty);
      setQuickRestockFeedback(`Restocked +${qty} ${item.unit.split(' ')[0]} for ${item.name}`);
      setTimeout(() => setQuickRestockFeedback(null), 2500);
    }
  };

  const getStatusBadge = (status: StockStatus, currentStock: number, maxStock: number) => {
    const safeMax = maxStock > 0 ? maxStock : 1;
    const percentage = Math.min(100, Math.round((currentStock / safeMax) * 100));

    switch (status) {
      case 'CRITICAL':
      case 'LOW':
        return {
          label: 'LOW STOCK',
          pillColor: 'text-rose-700 bg-rose-50 border-rose-200',
          barColor: 'bg-rose-500',
          percentage,
        };
      case 'REORDER':
        return {
          label: 'REORDER',
          pillColor: 'text-amber-700 bg-amber-50 border-amber-200',
          barColor: 'bg-amber-500',
          percentage,
        };
      case 'FULL':
        return {
          label: 'FULL',
          pillColor: 'text-emerald-800 bg-emerald-50 border-emerald-200',
          barColor: 'bg-emerald-600',
          percentage: 100,
        };
      case 'OPTIMAL':
      default:
        return {
          label: 'OPTIMAL',
          pillColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          barColor: 'bg-emerald-600',
          percentage,
        };
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback for Quick Restock */}
      <AnimatePresence>
        {quickRestockFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-18 right-6 z-50 px-4 py-2.5 bg-emerald-800 text-white text-xs font-mono font-bold rounded-2xl shadow-xl border border-emerald-600 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{quickRestockFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header & KPI Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Warehouse Catalog &amp; Stock Levels
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold">
              {inventory.length} SKUs Active
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Real-Time Valuation: <span className="font-bold text-slate-900">₹{stats.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> • Total Units in Storage: <span className="font-bold text-slate-900">{stats.totalUnits.toLocaleString()}</span>
          </p>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="Open Warehouse User Guide"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-700">menu_book</span>
              <span>Warehouse Guide</span>
            </button>
          )}

          <button
            onClick={() => onOpenScanner()}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Scan Product Barcode"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            <span>Scan Barcode</span>
          </button>

          <button
            onClick={onOpenAddStock}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-mono text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            <span>Add New SKU</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Stock Volume */}
        <div className="bento-card p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>TOTAL SKUs</span>
            <span className="material-symbols-outlined text-slate-400 text-base">inventory_2</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{stats.totalItems}</span>
            <span className="text-xs font-mono text-slate-500 block mt-0.5">
              {stats.overallFillRate}% Storage Fill
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <button
          onClick={() => setSelectedStatus(selectedStatus === 'LOW' ? 'All' : 'LOW')}
          className={`bento-card p-4 flex flex-col justify-between text-left transition-all cursor-pointer ${
            selectedStatus === 'LOW' ? 'ring-2 ring-rose-500 bg-rose-50/40' : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-rose-700">
            <span className="font-bold">LOW STOCK ITEMS</span>
            <span className="material-symbols-outlined text-rose-600 text-base">warning</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-rose-700">{stats.lowStockCount}</span>
            <span className="text-xs font-mono text-slate-500 block mt-0.5">
              {selectedStatus === 'LOW' ? 'Filtered (Click to reset)' : 'Click to filter'}
            </span>
          </div>
        </button>

        {/* Reorder Queue */}
        <button
          onClick={() => setSelectedStatus(selectedStatus === 'REORDER' ? 'All' : 'REORDER')}
          className={`bento-card p-4 flex flex-col justify-between text-left transition-all cursor-pointer ${
            selectedStatus === 'REORDER' ? 'ring-2 ring-amber-500 bg-amber-50/40' : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-amber-700">
            <span className="font-bold">REORDER QUEUE</span>
            <span className="material-symbols-outlined text-amber-600 text-base">shopping_cart_checkout</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-amber-800">{stats.reorderCount}</span>
            <span className="text-xs font-mono text-slate-500 block mt-0.5">
              {selectedStatus === 'REORDER' ? 'Filtered (Click to reset)' : 'Click to filter'}
            </span>
          </div>
        </button>

        {/* Expiring Soon */}
        <button
          onClick={() => setExpiryFilter(expiryFilter === 'expiring_soon' ? 'all' : 'expiring_soon')}
          className={`bento-card p-4 flex flex-col justify-between text-left transition-all cursor-pointer ${
            expiryFilter === 'expiring_soon' ? 'ring-2 ring-rose-500 bg-rose-50/50' : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-700">
            <span className="font-bold">EXPIRING &le; 15 DAYS</span>
            <span className="material-symbols-outlined text-amber-600 text-base">timer</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{stats.expiringSoonCount}</span>
            <span className="text-xs font-mono text-slate-500 block mt-0.5">
              {expiryFilter === 'expiring_soon' ? 'Filtered (Click to reset)' : 'Click to filter'}
            </span>
          </div>
        </button>
      </div>

      {/* Main Search, Filter Toolbar & View Mode Switcher */}
      <div className="bento-card p-5 space-y-4 shadow-xs">
        {/* Row 1: Search Bar & Primary Actions */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by SKU, item name, category, warehouse zone, or unit..."
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all outline-none text-sm text-slate-900 placeholder:text-slate-400 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-slate-900 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {/* Action Buttons & View Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 px-2.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Detailed Table View"
              >
                <span className="material-symbols-outlined text-[18px]">table_rows</span>
                <span className="hidden sm:inline">Table</span>
              </button>

              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 px-2.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visual Card Grid View"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                <span className="hidden sm:inline">Cards</span>
              </button>

              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 px-2.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'compact' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="High-Density Compact View"
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
                <span className="hidden sm:inline">Compact</span>
              </button>
            </div>

            {/* Export Button */}
            {onOpenExport && (
              <button
                onClick={onOpenExport}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Category Chips & Sorters */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between pt-2 border-t border-slate-100">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-xs font-mono font-semibold text-slate-500 uppercase shrink-0 mr-1">Category:</span>
            {categoriesWithCounts.map((cat) => (
              <button
                key={cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === cat.name
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Warehouse Physical Zone Filter & Sorter */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
            {/* Zone Selector */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-slate-500 uppercase mr-1 hidden sm:inline">Zone:</span>
              <select
                value={selectedZone}
                onChange={(e) => {
                  setSelectedZone(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono py-1.5 px-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
              >
                <option value="All">All Physical Zones</option>
                <option value="Cold Storage">Cold Storage (#1 - #4)</option>
                <option value="Dry Goods">Dry Goods (Zone D)</option>
                <option value="Pantry">Pantry &amp; Oils (Zone P)</option>
                <option value="Spices">Spices &amp; Seasonings (Zone S)</option>
              </select>
            </div>

            {/* Status Quick Toggle */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-slate-500 uppercase mr-1 hidden sm:inline">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono py-1.5 px-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="OPTIMAL">Optimal</option>
                <option value="FULL">Full (100%)</option>
                <option value="REORDER">Reorder Needed</option>
                <option value="LOW">Critical / Low</option>
              </select>
            </div>

            {/* Sorter */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-slate-500 uppercase mr-1 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono py-1.5 px-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
              >
                <option value="name-asc">Name (A &rarr; Z)</option>
                <option value="name-desc">Name (Z &rarr; A)</option>
                <option value="stock-asc">Stock (Lowest First)</option>
                <option value="stock-desc">Stock (Highest First)</option>
                <option value="percentage-asc">Fill Rate (% Lowest)</option>
                <option value="value-desc">Value (₹ High &rarr; Low)</option>
                <option value="value-asc">Value (₹ Low &rarr; High)</option>
                <option value="expiry-asc">Expiry (Soonest First)</option>
                <option value="velocity-desc">Consumption Velocity</option>
              </select>
            </div>

            {/* Reset Filters Pill */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer border border-rose-200"
              >
                <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Batch Selection Banner */}
        {selectedItemIds.size > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{selectedItemIds.size} SKU(s) Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchReorder}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">shopping_cart_checkout</span>
                <span>Batch Reorder</span>
              </button>
              {(onBatchDelete || onDeleteItem) && (
                <button
                  onClick={() => setIsBatchDeleteModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  <span>Delete Selected ({selectedItemIds.size})</span>
                </button>
              )}
              <button
                onClick={() => setSelectedItemIds(new Set())}
                className="px-2.5 py-1.5 bg-white text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Content Renderers */}
        {inventory.length === 0 ? (
          /* COMPLETELY FRESH WORKSPACE VIEW */
          <div className="p-8 md:p-12 text-center bg-slate-50/70 border border-dashed border-slate-300 rounded-3xl space-y-6">
            <div className="max-w-md mx-auto space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
                <span className="material-symbols-outlined text-3xl">warehouse</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Fresh Warehouse Workspace Initialized</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your authorized operator account is set up. You can now easily configure items, barcode tags, and storage zones tailored to your commercial workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              <button
                onClick={onOpenAddStock}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-xl">add_box</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Register Custom SKU</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Enter item name, category, par levels, unit price in ₹, and storage location.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-emerald-700 font-bold mt-3 flex items-center gap-1">
                  <span>Add First Item</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </button>

              <button
                onClick={() => onOpenScanner()}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Scan Barcode</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Use your device camera or hardware barcode gun to scan product packaging.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-teal-700 font-bold mt-3 flex items-center gap-1">
                  <span>Open Scanner</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </button>

              <button
                onClick={onOpenGuide}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-xl">menu_book</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Warehouse User Guide</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Read the complete staff manual for AI voice refills, par levels, and zone maps.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-700 font-bold mt-3 flex items-center gap-1">
                  <span>Explore Manual</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </button>
            </div>

            {onLoadSampleCatalog && (
              <div className="pt-2 text-center">
                <span className="text-xs text-slate-400 mr-2">Want to explore pre-configured data?</span>
                <button
                  onClick={onLoadSampleCatalog}
                  className="text-xs font-mono text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  Load 15 Standard Culinary SKUs
                </button>
              </div>
            )}
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 border border-slate-200">
              <span className="material-symbols-outlined text-3xl">inventory_2</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No SKUs Match Criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any inventory items matching your current filters or search query.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-mono font-bold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-300 text-xs font-mono uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <button
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      title="Select all on this page"
                    >
                      <span className="material-symbols-outlined text-base">
                        {selectedItemIds.size === paginatedItems.length && paginatedItems.length > 0
                          ? 'check_box'
                          : 'check_box_outline_blank'}
                      </span>
                    </button>
                  </th>
                  <th className="py-3 px-4 w-14">Image</th>
                  <th className="py-3 px-4">Item &amp; Category</th>
                  <th className="py-3 px-4">SKU &amp; Location</th>
                  <th className="py-3 px-4 min-w-[200px]">Stock Level</th>
                  <th className="py-3 px-4 text-center">Expiry</th>
                  <th className="py-3 px-4 text-right">Price / Value</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedItems.map((item) => {
                  const badge = getStatusBadge(item.status, item.currentStock, item.maxStock);
                  const isSelected = selectedItemIds.has(item.id);
                  const lineValue = item.price * item.currentStock;
                  const isLiveUpdated = Boolean(recentlyUpdatedSku && item.sku === recentlyUpdatedSku);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setInspectedItem(item)}
                      className={`group hover:bg-slate-50/80 transition-all cursor-pointer ${
                        isLiveUpdated
                          ? 'bg-emerald-100/70 ring-2 ring-emerald-500 ring-inset shadow-xs animate-pulse'
                          : isSelected
                          ? 'bg-emerald-50/30'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => toggleSelectItem(item.id, e)}>
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-700 text-lg">
                          {isSelected ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                      </td>

                      {/* Image */}
                      <td className="py-3.5 px-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </td>

                      {/* Item Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                            {translateRecordedItem(item.name, currentLang)}
                          </span>
                          {isLiveUpdated && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                              LIVE SYNCED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 font-medium">{t(item.category.toLowerCase(), currentLang) || item.category}</span>
                          {item.consumptionVelocity && (
                            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                              {t(item.consumptionVelocity.toLowerCase(), currentLang) || item.consumptionVelocity}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* SKU & Location */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg inline-block">
                          {item.sku}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-1">
                          <span className="material-symbols-outlined text-[13px] text-slate-400">location_on</span>
                          <span>{translateRecordedLocation(item.location || 'Zone A-01', currentLang)}</span>
                        </div>
                      </td>

                      {/* Stock Level Bar */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const reorderThreshold = item.reorderPoint !== undefined && !isNaN(item.reorderPoint)
                            ? item.reorderPoint
                            : Math.max(1, Math.round(item.maxStock * 0.25));
                          const isUnder = item.currentStock <= reorderThreshold;
                          return (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="font-bold text-slate-900">
                                  {item.currentStock.toLocaleString()} / {item.maxStock.toLocaleString()}{' '}
                                  <span className="text-slate-500 font-normal">{translateRecordedUnit(item.unit.split(' ')[0], currentLang)}</span>
                                </span>
                                <span className={`font-bold ${badge.pillColor} px-1.5 py-0.2 rounded text-[10px]`}>
                                  {t(badge.label.toLowerCase(), currentLang) || badge.label} ({badge.percentage}%)
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${badge.barColor}`}
                                  style={{ width: `${badge.percentage}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
                                <span className={isUnder ? 'text-rose-700 font-bold flex items-center gap-0.5' : 'text-slate-500'}>
                                  {isUnder && <span className="material-symbols-outlined text-[12px]">notification_important</span>}
                                  <span>Reorder Pt: {reorderThreshold}</span>
                                </span>
                                {isUnder && (
                                  <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1 py-0.2 rounded border border-rose-200">
                                    ALERT: DEFICIT -{reorderThreshold - item.currentStock}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        {item.daysToExpiry !== undefined ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-bold ${
                              item.daysToExpiry <= 3
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : item.daysToExpiry <= 15
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.daysToExpiry}d left
                          </span>
                        ) : (
                          <span className="text-slate-400">Stable</span>
                        )}
                      </td>

                      {/* Price & Valuation */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        <div className="font-bold text-slate-900">₹{item.price.toFixed(2)}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                          Line: ₹{lineValue.toFixed(2)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Inline Refill Buttons */}
                          {onRefillQuantity && (
                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 mr-1">
                              <button
                                onClick={(e) => handleInlineRestock(item, 5, e)}
                                title="Quick +5 restock"
                                className="px-1.5 py-0.5 text-[10px] font-mono font-bold hover:bg-emerald-600 hover:text-white rounded transition-colors text-slate-700 cursor-pointer"
                              >
                                +5
                              </button>
                              <button
                                onClick={(e) => handleInlineRestock(item, 20, e)}
                                title="Quick +20 restock"
                                className="px-1.5 py-0.5 text-[10px] font-mono font-bold hover:bg-emerald-600 hover:text-white rounded transition-colors text-slate-700 cursor-pointer"
                              >
                                +20
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => onEditItem(item)}
                            title="Edit Stock & Par Levels"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>

                          <button
                            onClick={() => onAddToDraft(item)}
                            title="Add to Reorder Draft"
                            className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                          </button>

                          <button
                            onClick={() => onOpenScanner(item)}
                            title="Scan Barcode"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                          </button>

                          {onDeleteItem && (
                            <button
                              onClick={() => setDeleteModalItem(item)}
                              title="Remove Food Item from Inventory"
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'cards' ? (
          /* Visual Cards Grid View */
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedItems.map((item) => {
              const badge = getStatusBadge(item.status, item.currentStock, item.maxStock);
              const isSelected = selectedItemIds.has(item.id);
              const lineValue = item.price * item.currentStock;
              const isLiveUpdated = Boolean(recentlyUpdatedSku && item.sku === recentlyUpdatedSku);

              return (
                <div
                  key={item.id}
                  onClick={() => setInspectedItem(item)}
                  className={`bento-card p-4 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer relative group ${
                    isLiveUpdated
                      ? 'ring-2 ring-emerald-500 bg-emerald-50/40 shadow-md animate-pulse'
                      : isSelected
                      ? 'ring-2 ring-emerald-600 bg-emerald-50/20'
                      : ''
                  }`}
                >
                  {/* Select Checkbox on Card */}
                  <div
                    onClick={(e) => toggleSelectItem(item.id, e)}
                    className="absolute top-3 left-3 z-10 p-1 bg-white/90 backdrop-blur-xs rounded-lg shadow-xs cursor-pointer text-slate-600 hover:text-slate-900"
                  >
                    <span className="material-symbols-outlined text-base">
                      {isSelected ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </div>

                  {/* Card Header & Photo */}
                  <div>
                    <div className="relative h-40 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden mb-3.5 shadow-2xs">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.8 rounded-xl border backdrop-blur-md ${badge.pillColor} bg-white/90 shadow-2xs`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-lg text-[10px] font-mono">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        <span>{translateRecordedLocation(item.location || 'Zone A-01', currentLang)}</span>
                      </div>
                    </div>

                    {/* Product Name & SKU */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-500 uppercase">{t(item.category.toLowerCase(), currentLang) || item.category}</span>
                        <div className="flex items-center gap-1.5">
                          {isLiveUpdated && (
                            <span className="text-[9px] font-mono font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-white animate-ping"></span>
                              LIVE
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {item.sku}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {translateRecordedItem(item.name, currentLang)}
                      </h3>
                    </div>

                    {/* Stock Progress Meter */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-600 font-semibold">
                          {item.currentStock.toLocaleString()} / {item.maxStock.toLocaleString()} {item.unit.split(' ')[0]}
                        </span>
                        <span className="text-slate-900 font-bold">{badge.percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${badge.barColor}`}
                          style={{ width: `${badge.percentage}%` }}
                        />
                      </div>
                      {(() => {
                        const reorderThreshold = item.reorderPoint !== undefined && !isNaN(item.reorderPoint)
                          ? item.reorderPoint
                          : Math.max(1, Math.round(item.maxStock * 0.25));
                        const isUnder = item.currentStock <= reorderThreshold;
                        return (
                          <div className="flex justify-between items-center text-[10px] font-mono pt-0.5">
                            <span className={isUnder ? 'text-rose-700 font-bold flex items-center gap-0.5' : 'text-slate-500'}>
                              {isUnder && <span className="material-symbols-outlined text-[12px]">notification_important</span>}
                              <span>Reorder Pt: {reorderThreshold}</span>
                            </span>
                            {isUnder && (
                              <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1 py-0.2 rounded border border-rose-200">
                                BELOW REORDER PT
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Value & Expiry Grid */}
                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Valuation</span>
                        <span className="font-bold text-emerald-700">₹{lineValue.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase block">Expiry</span>
                        <span className="font-bold text-slate-800">
                          {item.daysToExpiry !== undefined ? `${item.daysToExpiry}d left` : 'Stable'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {onRefillQuantity && (
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          onClick={(e) => handleInlineRestock(item, 5, e)}
                          className="px-2 py-1 bg-white hover:bg-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 transition-colors cursor-pointer"
                          title="Add +5 units"
                        >
                          +5
                        </button>
                        <button
                          onClick={(e) => handleInlineRestock(item, 20, e)}
                          className="px-2 py-1 bg-white hover:bg-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 transition-colors cursor-pointer"
                          title="Add +20 units"
                        >
                          +20
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => onAddToDraft(item)}
                      className="flex-1 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">shopping_cart_checkout</span>
                      <span>Reorder</span>
                    </button>

                    {onDeleteItem && (
                      <button
                        onClick={() => setDeleteModalItem(item)}
                        className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer flex items-center justify-center"
                        title="Remove Food Item"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Compact View */
          <div className="divide-y divide-slate-100">
            {paginatedItems.map((item) => {
              const badge = getStatusBadge(item.status, item.currentStock, item.maxStock);
              const isSelected = selectedItemIds.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => setInspectedItem(item)}
                  className={`px-5 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-xs font-mono ${
                    isSelected ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      onClick={(e) => toggleSelectItem(item.id, e)}
                      className="material-symbols-outlined text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
                    >
                      {isSelected ? 'check_box' : 'check_box_outline_blank'}
                    </span>

                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {item.sku}
                    </span>

                    <span className="font-bold text-slate-900 truncate max-w-xs">{translateRecordedItem(item.name, currentLang)}</span>

                    <span className="text-slate-400 hidden md:inline">({t(item.category.toLowerCase(), currentLang) || item.category})</span>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <span className="text-slate-600 hidden sm:inline">{translateRecordedLocation(item.location || 'Zone A-01', currentLang)}</span>

                    <div className="w-28 hidden lg:block">
                      <div className="flex justify-between text-[11px]">
                        <span>{item.currentStock}</span>
                        <span className="text-slate-400">/ {item.maxStock}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${badge.barColor}`} style={{ width: `${badge.percentage}%` }} />
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.pillColor}`}>
                      {badge.label}
                    </span>

                    <span className="font-bold text-slate-900 w-16 text-right">₹{item.price.toFixed(2)}</span>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onAddToDraft(item)}
                        className="p-1 hover:bg-emerald-50 rounded text-emerald-700 cursor-pointer"
                        title="Reorder"
                      >
                        <span className="material-symbols-outlined text-base">shopping_cart_checkout</span>
                      </button>
                      <button
                        onClick={() => setInspectedItem(item)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </button>
                      {onDeleteItem && (
                        <button
                          onClick={() => setDeleteModalItem(item)}
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Remove Food Item"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table Footer & Pagination Controls */}
        {filteredAndSortedItems.length > 0 && (
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-slate-600">
            <span className="text-xs font-mono">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} items
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 px-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-xs font-mono font-semibold"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 px-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-xs font-mono font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Item Detail Inspector Drawer */}
      <ItemDetailDrawer
        item={inspectedItem}
        isOpen={!!inspectedItem}
        currentLang={currentLang}
        onClose={() => setInspectedItem(null)}
        onEditItem={onEditItem}
        onOpenScanner={onOpenScanner}
        onAddToDraft={onAddToDraft}
        onRefillQuantity={onRefillQuantity}
        onDeleteItem={(item) => setDeleteModalItem(item)}
      />

      {/* Single Item Deletion Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteModalItem}
        item={deleteModalItem}
        onClose={() => !isDeleting && setDeleteModalItem(null)}
        onConfirm={handleConfirmSingleDelete}
        currentLang={currentLang}
        isDeleting={isDeleting}
      />

      {/* Batch Items Deletion Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isBatchDeleteModalOpen}
        batchItems={inventory.filter((item) => selectedItemIds.has(item.id))}
        onClose={() => !isDeleting && setIsBatchDeleteModalOpen(false)}
        onConfirm={handleConfirmBatchDelete}
        currentLang={currentLang}
        isDeleting={isDeleting}
      />
    </div>
  );
};
