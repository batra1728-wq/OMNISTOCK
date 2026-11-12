import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomerOrder, BuyerContact, InventoryItem, LanguageCode } from '../types';
import { t, translateRecordedItem, translateRecordedUnit } from '../utils/i18n';
import { exportInvoiceToExcel, exportInvoiceToPDF, triggerBrowserPrint } from '../utils/exportUtils';

interface OrdersScreenProps {
  orders: CustomerOrder[];
  buyers: BuyerContact[];
  inventory: InventoryItem[];
  currentLang: LanguageCode;
  onUpdateOrders: (orders: CustomerOrder[]) => void;
  onUpdateBuyers: (buyers: BuyerContact[]) => void;
  onShowToast: (msg: string) => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  orders,
  buyers,
  inventory,
  currentLang,
  onUpdateOrders,
  onUpdateBuyers,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'buyers'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isAddBuyerOpen, setIsAddBuyerOpen] = useState(false);
  const [chatOrder, setChatOrder] = useState<CustomerOrder | null>(null);
  const [chatBuyer, setChatBuyer] = useState<BuyerContact | null>(null);
  const [newChatText, setNewChatText] = useState('');

  // Selected Order for Invoice Quick Preview
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<CustomerOrder | null>(null);

  // New Order Form State
  const [orderBuyerId, setOrderBuyerId] = useState<string>(buyers[0]?.id || '');
  const [orderItems, setOrderItems] = useState<Array<{ sku: string; name: string; quantity: number; unit: string; unitPrice: number; total: number }>>([]);
  const [selectedSkuToAdd, setSelectedSkuToAdd] = useState<string>(inventory[0]?.sku || '');
  const [addQty, setAddQty] = useState<number>(10);
  const [orderTaxRate, setOrderTaxRate] = useState<number>(18);
  const [orderNotes, setOrderNotes] = useState<string>('');

  // New Buyer Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerCompany, setBuyerCompany] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');

  // Filtering
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyerCompany.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBuyers = buyers.filter((b) => {
    return (
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone.includes(searchQuery) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate Metrics
  const totalSalesValuation = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length;
  const dispatchedOrdersCount = orders.filter((o) => o.status === 'shipped').length;

  // Add Item to New Order
  const handleAddItemToOrder = () => {
    const item = inventory.find((i) => i.sku === selectedSkuToAdd);
    if (!item) return;

    const existingIdx = orderItems.findIndex((i) => i.sku === item.sku);
    if (existingIdx >= 0) {
      const updated = [...orderItems];
      updated[existingIdx].quantity += Number(addQty);
      updated[existingIdx].total = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
      setOrderItems(updated);
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          sku: item.sku,
          name: item.name,
          quantity: Number(addQty),
          unit: item.unit,
          unitPrice: item.price,
          total: Number(addQty) * item.price,
        },
      ]);
    }
    onShowToast(`Added ${item.name} (${addQty} ${item.unit})`);
  };

  const handleRemoveOrderItem = (sku: string) => {
    setOrderItems((prev) => prev.filter((i) => i.sku !== sku));
  };

  // Submit New Order
  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const buyer = buyers.find((b) => b.id === orderBuyerId);
    if (!buyer) {
      onShowToast('Please select a valid buyer contact');
      return;
    }
    if (orderItems.length === 0) {
      onShowToast('Please add at least one inventory item to the order');
      return;
    }

    const subtotal = orderItems.reduce((acc, i) => acc + i.total, 0);
    const taxAmount = Math.round(subtotal * (orderTaxRate / 100));
    const totalAmount = subtotal + taxAmount;

    const newOrder: CustomerOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-2026-${Math.floor(100 + Math.random() * 900)}`,
      buyerId: buyer.id,
      buyerName: buyer.name,
      buyerCompany: buyer.company,
      buyerPhone: buyer.phone,
      buyerWhatsapp: buyer.whatsapp,
      buyerEmail: buyer.email,
      buyerAddress: buyer.address,
      buyerGstin: buyer.gstin,
      items: orderItems,
      subtotal,
      taxRate: orderTaxRate,
      taxAmount,
      totalAmount,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      notes: orderNotes || 'Standard Commercial Order',
      chatHistory: [
        {
          id: `msg-${Date.now()}`,
          sender: 'me',
          text: `Order created for ₹${totalAmount.toLocaleString('en-IN')} with ${orderItems.length} items.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    onUpdateOrders([newOrder, ...orders]);
    setIsCreateOrderOpen(false);
    setOrderItems([]);
    setOrderNotes('');
    onShowToast(`Order ${newOrder.orderNumber} successfully booked for ${buyer.name}!`);
  };

  // Submit New Buyer
  const handleCreateBuyerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerPhone.trim()) {
      onShowToast('Please provide Buyer Name and Phone number');
      return;
    }

    const cleanWhatsapp = (buyerWhatsapp.trim() || buyerPhone.trim()).replace(/[^0-9+]/g, '');

    const newBuyer: BuyerContact = {
      id: `buyer-${Date.now()}`,
      name: buyerName.trim(),
      company: buyerCompany.trim() || `${buyerName.trim()} Enterprises`,
      phone: buyerPhone.trim(),
      whatsapp: cleanWhatsapp.startsWith('+') ? cleanWhatsapp : `+91${cleanWhatsapp}`,
      email: buyerEmail.trim() || 'buyer@domain.com',
      address: buyerAddress.trim() || 'Standard Commercial Hub, India',
      city: buyerAddress.split(',').pop()?.trim() || 'Pan-India',
      gstin: buyerGstin.trim() || '07AAACT0000F1Z0',
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=240&h=240`,
      totalOrdersCount: 0,
      totalSpent: 0,
      notes: 'New commercial buyer registered.',
    };

    onUpdateBuyers([newBuyer, ...buyers]);
    setIsAddBuyerOpen(false);
    setBuyerName('');
    setBuyerCompany('');
    setBuyerPhone('');
    setBuyerWhatsapp('');
    setBuyerEmail('');
    setBuyerAddress('');
    setBuyerGstin('');
    onShowToast(`Buyer contact ${newBuyer.name} added successfully!`);
  };

  // 1-Click WhatsApp Opener
  const handleOpenWhatsApp = (buyer: BuyerContact, order?: CustomerOrder) => {
    const rawNumber = (buyer.whatsapp || buyer.phone).replace(/[^0-9]/g, '');
    const validNumber = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;

    let messageText = `${t('whatsapp_order_msg', currentLang)}\n\nHello ${buyer.name} (${buyer.company}),`;
    if (order) {
      messageText += `\n\n📄 *Invoice / Order:* ${order.orderNumber}\n💰 *Total Amount:* ₹${order.totalAmount.toLocaleString('en-IN')}\n📦 *Items:* ${order.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}\n🚚 *Status:* ${order.status.toUpperCase()}\n\nThank you for choosing OmniStock Smart Logistics!`;
    } else {
      messageText += `\n\nConnecting with you regarding inventory updates and dispatch schedules from OmniStock.`;
    }

    const encoded = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${validNumber}?text=${encoded}`;
    window.open(waUrl, '_blank');
    onShowToast(`Opening WhatsApp chat with ${buyer.name}...`);
  };

  // In-App Chat Message Sender
  const handleSendChatMessage = () => {
    if (!newChatText.trim() || !chatOrder) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'me' as const,
      text: newChatText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedOrders = orders.map((o) => {
      if (o.id === chatOrder.id) {
        return {
          ...o,
          chatHistory: [...(o.chatHistory || []), newMsg],
        };
      }
      return o;
    });

    onUpdateOrders(updatedOrders);
    setChatOrder((prev) => (prev ? { ...prev, chatHistory: [...(prev.chatHistory || []), newMsg] } : null));
    setNewChatText('');
    onShowToast('Direct message logged');
  };

  // Update Order Status
  const handleUpdateOrderStatus = (orderId: string, newStatus: CustomerOrder['status']) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
    onUpdateOrders(updated);
    onShowToast(`Order status updated to ${newStatus.toUpperCase()}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <span className="material-symbols-outlined text-[24px]">shopping_cart_checkout</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {t('nav_orders', currentLang)}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Manage commercial buyer accounts, generate GST tax invoices, export Excel & PDF reports, and contact buyers directly via WhatsApp and live chat.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setIsAddBuyerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Buyer Contact</span>
          </button>

          <button
            onClick={() => setIsCreateOrderOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
            <span>{t('create_order', currentLang)}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card p-4 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Total Sales Volume
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              ₹{totalSalesValuation.toLocaleString('en-IN')}
            </h3>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-medium">
              {orders.length} Invoiced Orders
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">payments</span>
          </div>
        </div>

        <div className="bento-card p-4 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Pending Fulfillment
            </p>
            <h3 className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {pendingOrdersCount} Orders
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              In Packing & Dispatch
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">pending_actions</span>
          </div>
        </div>

        <div className="bento-card p-4 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Dispatched Consignments
            </p>
            <h3 className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {dispatchedOrdersCount} Shipped
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              On Route to Buyers
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">local_shipping</span>
          </div>
        </div>

        <div className="bento-card p-4 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Active Buyer Accounts
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {buyers.length} Buyers
            </h3>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
              Direct WhatsApp Ready
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">contacts</span>
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab switchers */}
        <div className="flex items-center p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>{t('tab_orders', currentLang)} ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('buyers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'buyers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            <span>{t('tab_buyers', currentLang)} ({buyers.length})</span>
          </button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder={t('search_placeholder', currentLang)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {activeTab === 'orders' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: CUSTOMER ORDERS LIST */}
      {activeTab === 'orders' && (
        <div className="flex flex-col gap-4">
          <div className="bento-card overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Order / Invoice #</th>
                    <th className="py-3.5 px-4">Buyer / Company</th>
                    <th className="py-3.5 px-4">Items & Val</th>
                    <th className="py-3.5 px-4">Total (Inc. GST)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4 text-right">Direct Buyer Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        No orders found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const buyerObj = buyers.find((b) => b.id === order.buyerId) || {
                        id: order.buyerId,
                        name: order.buyerName,
                        company: order.buyerCompany,
                        phone: order.buyerPhone,
                        whatsapp: order.buyerWhatsapp,
                        email: order.buyerEmail,
                        address: order.buyerAddress,
                        city: 'Pan-India',
                        avatar: '',
                        totalOrdersCount: 1,
                        totalSpent: order.totalAmount,
                      };

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Order Number & Date */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900 dark:text-white block">
                              {order.orderNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {order.orderDate}
                            </span>
                          </td>

                          {/* Buyer & Company */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                                {order.buyerName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                                  {order.buyerName}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  {order.buyerCompany}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Items summary */}
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-700 dark:text-slate-300 block truncate max-w-[200px]">
                              {order.items.map((i) => `${translateRecordedItem(i.name, currentLang)} (x${i.quantity})`).join(', ')}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {order.items.length} SKUs • Subtotal: ₹{order.subtotal.toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Total Amount */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            ₹{order.totalAmount.toLocaleString('en-IN')}
                            <span className="text-[10px] text-slate-400 font-normal block">
                              GST {order.taxRate}% (₹{order.taxAmount.toLocaleString('en-IN')})
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleUpdateOrderStatus(order.id, e.target.value as CustomerOrder['status'])
                              }
                              className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg border focus:outline-hidden cursor-pointer ${
                                order.status === 'confirmed'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900'
                                  : order.status === 'shipped'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900'
                                  : order.status === 'delivered'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                                  : order.status === 'cancelled'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>

                          {/* Payment */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                                order.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                  : order.paymentStatus === 'partial'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </td>

                          {/* Direct Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-Click WhatsApp Button */}
                              <button
                                onClick={() => handleOpenWhatsApp(buyerObj, order)}
                                title="Chat on WhatsApp with prefilled Invoice"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <span className="material-symbols-outlined text-[15px]">chat</span>
                                <span>WhatsApp</span>
                              </button>

                              {/* In-App Direct Chat */}
                              <button
                                onClick={() => setChatOrder(order)}
                                title="Direct In-App Chat & Notes"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[17px]">forum</span>
                              </button>

                              {/* Print & PDF Invoice */}
                              <button
                                onClick={() => exportInvoiceToPDF(order)}
                                title="Download Tax Invoice (PDF)"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
                              </button>

                              {/* Excel Export */}
                              <button
                                onClick={() => exportInvoiceToExcel(order)}
                                title="Download Tax Invoice (Excel .xlsx)"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[17px]">table_view</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUYER CONTACTS DIRECTORY */}
      {activeTab === 'buyers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBuyers.map((buyer) => (
            <div
              key={buyer.id}
              className="bento-card p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={buyer.avatar}
                      alt={buyer.name}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        {buyer.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {buyer.company}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                    {buyer.city}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                    <span>{buyer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">chat</span>
                    <span>WA: {buyer.whatsapp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">mail</span>
                    <span className="truncate">{buyer.email}</span>
                  </div>
                  {buyer.gstin && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="material-symbols-outlined text-[15px] text-slate-400">badge</span>
                      <span>GSTIN: {buyer.gstin}</span>
                    </div>
                  )}
                </div>

                {buyer.notes && (
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 line-clamp-2">
                    {buyer.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons for Buyer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenWhatsApp(buyer)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>{t('contact_whatsapp', currentLang)}</span>
                </button>

                <a
                  href={`tel:${buyer.phone}`}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  title="Phone Call"
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                </a>

                <button
                  onClick={() => {
                    setOrderBuyerId(buyer.id);
                    setIsCreateOrderOpen(true);
                  }}
                  className="p-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Book New Order for this Buyer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: CREATE NEW CUSTOMER ORDER */}
      <AnimatePresence>
        {isCreateOrderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[22px]">
                    add_shopping_cart
                  </span>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">
                    Create New Customer Order & Tax Invoice
                  </h2>
                </div>
                <button
                  onClick={() => setIsCreateOrderOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateOrderSubmit} className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
                {/* Buyer selection */}
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                    Select Commercial Buyer Contact *
                  </label>
                  <select
                    value={orderBuyerId}
                    onChange={(e) => setOrderBuyerId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    {buyers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.company} ({b.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add items to order */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
                  <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300 uppercase">
                    Select Inventory Items to Bill
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-7">
                      <select
                        value={selectedSkuToAdd}
                        onChange={(e) => setSelectedSkuToAdd(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs cursor-pointer"
                      >
                        {inventory.map((item) => (
                          <option key={item.sku} value={item.sku}>
                            {translateRecordedItem(item.name, currentLang)} (Stock: {item.currentStock} {translateRecordedUnit(item.unit, currentLang)} | ₹{item.price})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        min="1"
                        value={addQty}
                        onChange={(e) => setAddQty(Number(e.target.value))}
                        placeholder="Quantity"
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddItemToOrder}
                        className="w-full h-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Selected items list */}
                  {orderItems.length > 0 && (
                    <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500">
                          <tr>
                            <th className="p-2">Item</th>
                            <th className="p-2">Qty</th>
                            <th className="p-2">Rate</th>
                            <th className="p-2">Total</th>
                            <th className="p-2 text-right">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {orderItems.map((i) => (
                            <tr key={i.sku}>
                              <td className="p-2 font-medium">{translateRecordedItem(i.name, currentLang)}</td>
                              <td className="p-2 font-mono">
                                {i.quantity} {translateRecordedUnit(i.unit, currentLang)}
                              </td>
                              <td className="p-2 font-mono">₹{i.unitPrice}</td>
                              <td className="p-2 font-mono font-bold">₹{i.total.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOrderItem(i.sku)}
                                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Tax Rate & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      GST Tax Slab
                    </label>
                    <select
                      value={orderTaxRate}
                      onChange={(e) => setOrderTaxRate(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs cursor-pointer font-mono"
                    >
                      <option value="0">0% (Nil / Exempted)</option>
                      <option value="5">5% GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST (Standard)</option>
                      <option value="28">28% GST</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Order / Delivery Notes
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Deliver before 10 AM, Gate 3"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>

                {/* Calculation breakdown */}
                {orderItems.length > 0 && (
                  <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl font-mono flex flex-col gap-1 text-slate-900 dark:text-white">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>
                        ₹{orderItems.reduce((acc, i) => acc + i.total, 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>GST ({orderTaxRate}%):</span>
                      <span>
                        ₹
                        {Math.round(
                          orderItems.reduce((acc, i) => acc + i.total, 0) * (orderTaxRate / 100)
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                      <span>Grand Total:</span>
                      <span>
                        ₹
                        {(
                          orderItems.reduce((acc, i) => acc + i.total, 0) +
                          Math.round(orderItems.reduce((acc, i) => acc + i.total, 0) * (orderTaxRate / 100))
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateOrderOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Confirm & Generate Invoice
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD NEW BUYER CONTACT */}
      <AnimatePresence>
        {isAddBuyerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[22px]">person_add</span>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">
                    Register New Buyer Contact
                  </h2>
                </div>
                <button
                  onClick={() => setIsAddBuyerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateBuyerSubmit} className="p-5 flex flex-col gap-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Buyer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="e.g. Ramesh Chandra"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Company / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerCompany}
                      onChange={(e) => setBuyerCompany(e.target.value)}
                      placeholder="e.g. Royal Banquet Catering"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      WhatsApp Number (For Direct Chats)
                    </label>
                    <input
                      type="text"
                      value={buyerWhatsapp}
                      onChange={(e) => setBuyerWhatsapp(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="buyer@domain.com"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      GSTIN Identification
                    </label>
                    <input
                      type="text"
                      value={buyerGstin}
                      onChange={(e) => setBuyerGstin(e.target.value)}
                      placeholder="07AAACT1234F1Z9"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                    Billing / Delivery Address
                  </label>
                  <input
                    type="text"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="Plot 10, Industrial Hub, New Delhi"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddBuyerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Save Buyer Contact
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: IN-APP DIRECT CHAT & NOTES WITH BUYER */}
      <AnimatePresence>
        {chatOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[520px]"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                    {chatOrder.buyerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                      Direct Chat: {chatOrder.buyerName}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Order: {chatOrder.orderNumber} • {chatOrder.buyerCompany}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const buyerObj = buyers.find((b) => b.id === chatOrder.buyerId) || {
                        id: chatOrder.buyerId,
                        name: chatOrder.buyerName,
                        company: chatOrder.buyerCompany,
                        phone: chatOrder.buyerPhone,
                        whatsapp: chatOrder.buyerWhatsapp,
                        email: chatOrder.buyerEmail,
                        address: chatOrder.buyerAddress,
                        city: '',
                        avatar: '',
                        totalOrdersCount: 1,
                        totalSpent: chatOrder.totalAmount,
                      };
                      handleOpenWhatsApp(buyerObj, chatOrder);
                    }}
                    title="Switch to WhatsApp"
                    className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                  </button>
                  <button
                    onClick={() => setChatOrder(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-50/50 dark:bg-slate-950/40">
                {(!chatOrder.chatHistory || chatOrder.chatHistory.length === 0) ? (
                  <p className="text-center text-slate-400 text-xs py-8">
                    No communication history yet. Send a dispatch notice or payment reminder below.
                  </p>
                ) : (
                  chatOrder.chatHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                          msg.sender === 'me'
                            ? 'bg-slate-900 text-white dark:bg-emerald-600 rounded-br-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                        <span
                          className={`text-[9px] font-mono block mt-1 ${
                            msg.sender === 'me' ? 'text-slate-400 dark:text-emerald-200' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Template Chips */}
              <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
                <span className="text-slate-400 shrink-0">Quick:</span>
                <button
                  type="button"
                  onClick={() =>
                    setNewChatText(`Your order ${chatOrder.orderNumber} is packed and ready for dispatch.`)
                  }
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
                >
                  Order Packed
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewChatText(`Tax invoice for ₹${chatOrder.totalAmount.toLocaleString('en-IN')} has been generated.`)
                  }
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
                >
                  Invoice Shared
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewChatText(`Kindly clear the pending balance of ₹${chatOrder.totalAmount.toLocaleString('en-IN')}.`)
                  }
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
                >
                  Payment Reminder
                </button>
              </div>

              {/* Input box */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                <input
                  type="text"
                  value={newChatText}
                  onChange={(e) => setNewChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChatMessage();
                  }}
                  placeholder="Type dispatch update, tracking link, or note..."
                  className="flex-1 p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSendChatMessage}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Send
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
