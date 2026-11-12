import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

interface InventoryItemDTO {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  currentStock: number;
  maxStock: number;
  unit: string;
  price: number;
  expiryDate: string;
  daysToExpiry?: number;
  status: string;
  location?: string;
  imageUrl?: string;
  packagingType?: string;
  isScanned?: boolean;
  scannedAt?: number;
}

interface AIAction {
  type: 'refill' | 'batch_refill' | 'reorder_draft' | 'filter_view';
  sku?: string;
  quantity?: number;
  mode?: 'add' | 'set' | 'fill_to_max';
  items?: Array<{ sku: string; quantity: number; mode: 'add' | 'set' | 'fill_to_max' }>;
  reason?: string;
}

// Fallback Natural Language Parser with Multilingual & Hindi/Hinglish Support
function executeRuleBasedAssistant(message: string, inventory: InventoryItemDTO[], language: string = 'en') {
  const lower = message.toLowerCase().trim();
  const isHindiMode = language === 'hi' || /[\u0900-\u097F]/.test(message);
  const actions: AIAction[] = [];
  let reply = '';
  const suggestions: string[] = isHindiMode
    ? [
        '⚡ कम स्टॉक वाले सभी आइटम रीफिल करो',
        '⚠️ एक्सपायर होने वाले आइटम दिखाओ',
        '💰 गोदाम का कुल मूल्यांकन बताओ',
        '🍚 25 पैकेट बासमती चावल रीफिल करो',
      ]
    : [
        '⚡ Refill all low stock items',
        '⚠️ Show items expiring soon (<30 days)',
        '💰 Calculate warehouse total valuation',
        '🍚 Refill 25 units of Basmati Rice',
        '📊 Category valuation breakdown',
      ];

  // Common Hindi to SKU/Name keyword dictionary
  const HINDI_ITEM_MAP: Record<string, string[]> = {
    'RC-BAS-5KG': ['chawal', 'rice', 'basmati', 'chaawal'],
    'FL-CHK-10K': ['atta', 'aata', 'flour', 'gehu', 'chakki'],
    'OL-EV-750': ['olive', 'oil', 'tel', 'jaitun'],
    'DA-AM-500': ['butter', 'makkhan', 'makhan'],
    'MK-FC-1L': ['milk', 'doodh', 'dudh'],
    'GH-COW-1L': ['ghee', 'cow ghee', 'desi ghee'],
    'SG-REF-5KG': ['sugar', 'cheeni', 'chini', 'shakkar'],
    'ST-IOD-1KG': ['salt', 'namak'],
    'DL-TR-1KG': ['toor', 'dal', 'daal', 'arhar'],
    'PN-ML-500G': ['paneer', 'malai paneer'],
    'SP-GM-250': ['garam masala', 'masala', 'spices'],
    'TE-ASM-500': ['tea', 'chai', 'assam tea', 'patti'],
    'NT-ROA-500': ['cashew', 'kaju', 'dry fruit', 'nuts'],
    'CF-ARB-250': ['coffee', 'arabica'],
    'CH-CHD-1KG': ['cheese', 'cheddar'],
  };

  // 1. Refill ALL low/critical items (supports English + Hindi)
  const isBatchRefillAll =
    lower.includes('refill all') ||
    lower.includes('restock all') ||
    lower.includes('replenish all') ||
    (lower.includes('all') && (lower.includes('low') || lower.includes('critical') || lower.includes('reorder'))) ||
    lower.includes('sab low stock') ||
    lower.includes('saare low stock') ||
    lower.includes('sab replenish') ||
    lower.includes('kam stock bhar do') ||
    lower.includes('sab refill');

  if (isBatchRefillAll) {
    const lowItems = inventory.filter(
      (i) => i.status === 'LOW' || i.status === 'REORDER' || i.status === 'CRITICAL' || i.currentStock < i.maxStock * 0.4
    );

    if (lowItems.length === 0) {
      reply = `All inventory items are currently operating at healthy buffer levels! No urgent low-stock replenishment is required right now.`;
    } else {
      let totalAddedQty = 0;
      let totalCostInr = 0;

      const batchItems = lowItems.map((item) => {
        const needed = Math.max(1, Math.round(item.maxStock * 0.85) - item.currentStock);
        totalAddedQty += needed;
        totalCostInr += needed * item.price;
        return {
          sku: item.sku,
          quantity: needed,
          mode: 'add' as const,
        };
      });

      actions.push({
        type: 'batch_refill',
        items: batchItems,
        reason: `Restocking ${lowItems.length} low/critical stock items to 85%+ optimal threshold.`,
      });

      const itemsListStr = lowItems
        .map((i) => {
          const needed = Math.max(1, Math.round(i.maxStock * 0.85) - i.currentStock);
          return `• **${i.name}** (\`${i.sku}\`): **+${needed} ${i.unit}** (New: ${i.currentStock + needed}/${i.maxStock} — ₹${(needed * i.price).toLocaleString('en-IN')})`;
        })
        .join('\n');

      reply = `Understood! Prepared and executed batch replenishment for **${lowItems.length} low-stock SKUs**:\n\n${itemsListStr}\n\n• **Total Volume Added**: **${totalAddedQty} units**\n• **Replenishment Value**: **₹${totalCostInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**\n• **Status**: All levels synchronized live across the warehouse database.`;
    }
    return { reply, actions, suggestions };
  }

  // 2. Specific Item Refill / Adjustment
  const isRefillCommand =
    lower.includes('refill') ||
    lower.includes('restock') ||
    lower.includes('add ') ||
    lower.includes('replenish') ||
    lower.includes('increase') ||
    lower.includes('badhao') ||
    lower.includes('bhar do') ||
    lower.includes('daalo') ||
    lower.includes('jodo');

  if (isRefillCommand) {
    // Look for numbers in message
    const numMatches = message.match(/\b\d+\b/g);
    const quantity = numMatches ? parseInt(numMatches[0], 10) : 20;

    // Find matching item in inventory using name, SKU, or Hindi keywords
    const matchedItem = inventory.find((item) => {
      const skuMatch = lower.includes(item.sku.toLowerCase());
      const nameParts = item.name.toLowerCase().split(/[\s,()]+/);
      const nameMatch = nameParts.some((part) => part.length > 2 && lower.includes(part));
      const hindiKeywords = HINDI_ITEM_MAP[item.sku] || [];
      const hindiMatch = hindiKeywords.some((kw) => lower.includes(kw));
      return skuMatch || nameMatch || hindiMatch;
    });

    if (matchedItem) {
      const mode = lower.includes('to full') || lower.includes('to max') || lower.includes('full bhar do')
        ? 'fill_to_max'
        : 'add';
      const actualQty = mode === 'fill_to_max' ? Math.max(1, matchedItem.maxStock - matchedItem.currentStock) : quantity;

      actions.push({
        type: 'refill',
        sku: matchedItem.sku,
        quantity: actualQty,
        mode,
        reason: `Refilled as requested via assistant command.`,
      });

      const newStockVal = mode === 'fill_to_max' ? matchedItem.maxStock : matchedItem.currentStock + actualQty;
      const unitStr = matchedItem.unit || 'units';

      reply = `✅ **Stock Refill Executed!**\n\nSuccessfully added **${actualQty} ${unitStr}** of **${matchedItem.name}** (\`${matchedItem.sku}\`).\n\n• **Previous Stock**: ${matchedItem.currentStock} / ${matchedItem.maxStock} ${unitStr}\n• **Updated Stock**: **${newStockVal} / ${matchedItem.maxStock}** ${unitStr} (${Math.round((newStockVal / matchedItem.maxStock) * 100)}% capacity)\n• **Line Valuation**: **₹${(newStockVal * matchedItem.price).toLocaleString('en-IN')}** (+₹${(actualQty * matchedItem.price).toLocaleString('en-IN')})\n• **Location**: ${matchedItem.location || 'Zone A'}`;
      return { reply, actions, suggestions };
    }
  }

  // 3. Expiring soon query (<30 days, <60 days)
  if (lower.includes('expir') || lower.includes('spoil') || lower.includes('shelf life') || lower.includes('khatam hone')) {
    const expiringItems = inventory
      .filter((i) => typeof i.daysToExpiry === 'number' && i.daysToExpiry <= 45)
      .sort((a, b) => (a.daysToExpiry ?? 999) - (b.daysToExpiry ?? 999));

    if (expiringItems.length === 0) {
      reply = `All active inventory batches have healthy shelf life integrity (>45 days remaining). No near-term expiry risks identified.`;
    } else {
      const list = expiringItems
        .map((i) => {
          const badge = (i.daysToExpiry ?? 99) <= 15 ? '🚨 CRITICAL' : '⚠️ WARNING';
          return `• **${i.name}** (\`${i.sku}\`): **${i.daysToExpiry} days remaining** (${i.expiryDate}) — ${i.currentStock} ${i.unit} (${badge}) in ${i.location || 'Warehouse'}`;
        })
        .join('\n');
      reply = `⚠️ **Shelf Life & Expiry Advisory**:\n\nIdentified **${expiringItems.length} batches** with near-term expiration dates:\n\n${list}\n\n*Action*: Prioritize FIFO dispatch or schedule immediate promotion in the Analytics panel.`;
    }
    return { reply, actions, suggestions };
  }

  // 4. Low stock / Reorder query
  if (
    lower.includes('low') ||
    lower.includes('critical') ||
    lower.includes('shortage') ||
    lower.includes('kam stock') ||
    lower.includes('reorder')
  ) {
    const lowItems = inventory.filter(
      (i) => i.status === 'LOW' || i.status === 'REORDER' || i.status === 'CRITICAL' || i.currentStock < i.maxStock * 0.3
    );

    if (lowItems.length === 0) {
      reply = `All inventory items are currently well above safety thresholds. Stock capacity is optimal!`;
    } else {
      let costToReplenish = 0;
      const list = lowItems
        .map((i) => {
          const needed = Math.max(1, i.maxStock - i.currentStock);
          costToReplenish += needed * i.price;
          return `• **${i.name}** (\`${i.sku}\`): **${i.currentStock} / ${i.maxStock}** ${i.unit} (${Math.round((i.currentStock / i.maxStock) * 100)}%) — Status: **${i.status}**`;
        })
        .join('\n');
      reply = `🔍 **Low Stock Advisory (${lowItems.length} SKUs)**:\n\n${list}\n\n• **Estimated Budget to Top-Up to 100%**: **₹${costToReplenish.toLocaleString('en-IN')}**\n\n*Quick Action*: Would you like me to **Refill all low stock items** now?`;
    }
    return { reply, actions, suggestions };
  }

  // 5. Valuation query (rupees, valuation, worth, cost)
  if (
    lower.includes('value') ||
    lower.includes('worth') ||
    lower.includes('valuation') ||
    lower.includes('money') ||
    lower.includes('moolya') ||
    lower.includes('keemat') ||
    lower.includes('cost')
  ) {
    const totalValuation = inventory.reduce((sum, i) => sum + i.currentStock * i.price, 0);
    const sorted = [...inventory].sort((a, b) => b.currentStock * b.price - a.currentStock * a.price);
    const topItem = sorted[0];

    // Category breakdown
    const catMap: Record<string, number> = {};
    for (const it of inventory) {
      catMap[it.category] = (catMap[it.category] || 0) + it.currentStock * it.price;
    }
    const catBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([cat, val]) => `  - **${cat}**: ₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${Math.round((val / totalValuation) * 100)}%)`)
      .join('\n');

    reply = `📊 **Warehouse Valuation Summary**:\n\n• **Total Holding Valuation**: **₹${totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n• **Total Active SKUs**: **${inventory.length} items**\n• **Highest Value Holding**: **${topItem?.name}** (\`${topItem?.sku}\`) at **₹${(topItem ? topItem.currentStock * topItem.price : 0).toLocaleString('en-IN')}**\n• **Top Category Holdings**:\n${catBreakdown}\n• **Currency Standard**: Indian Rupee (INR / ₹)`;
    return { reply, actions, suggestions };
  }

  // 6. Category query
  const categories = ['dairy', 'grains', 'spices', 'beverages', 'oils', 'nuts', 'sweets'];
  const matchedCat = categories.find((c) => lower.includes(c));
  if (matchedCat) {
    const itemsInCat = inventory.filter((i) => i.category.toLowerCase().includes(matchedCat));
    if (itemsInCat.length > 0) {
      const catVal = itemsInCat.reduce((sum, i) => sum + i.currentStock * i.price, 0);
      const list = itemsInCat
        .map((i) => `• **${i.name}** (\`${i.sku}\`): ${i.currentStock} / ${i.maxStock} ${i.unit} (₹${(i.currentStock * i.price).toLocaleString('en-IN')})`)
        .join('\n');
      reply = `📦 **Category Spotlight: ${matchedCat.toUpperCase()}** (${itemsInCat.length} SKUs):\n\n${list}\n\n• **Total Category Valuation**: **₹${catVal.toLocaleString('en-IN')}**`;
      return { reply, actions, suggestions };
    }
  }

  // Default general assistant response
  reply = `Hello! I am your **OmniStock AI Assistant** powered by Gemini. I monitor warehouse inventory in real time and can execute instant replenishment commands or provide deep analytics.\n\n**Try asking:**\n• "Refill 25 units of Royal Basmati Rice"\n• "Refill all low stock items"\n• "Show items expiring this month"\n• "What is our current total warehouse valuation?"\n• "कम स्टॉक वाले सभी आइटम रीफिल करो"`;

  return { reply, actions, suggestions };
}

interface LiveScanEvent {
  id: string;
  sku: string;
  barcode?: string;
  itemName: string;
  unit: string;
  addedQty: number;
  newStock: number;
  previousStock: number;
  location: string;
  device: string;
  sessionId?: string;
  timestamp: number;
}

interface ScannerSession {
  sessionId: string;
  createdAt: number;
  status: 'waiting' | 'connected' | 'active';
  device?: string;
  lastConnectedAt?: number;
  scansCount: number;
  lastScannedItem?: string;
}

// Global in-memory cache for live inventory & SSE connections
const serverInventory = new Map<string, InventoryItemDTO>();
const recentScanEvents: LiveScanEvent[] = [];
const sseClients = new Set<express.Response>();
const scannerSessions = new Map<string, ScannerSession>();

// Persistent storage file path
const DATA_DIR = path.join(process.cwd(), 'data');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const SCAN_HISTORY_FILE = path.join(DATA_DIR, 'scan_history.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Failed to ensure data dir:', e);
  }
}

function saveInventoryToDisk() {
  try {
    ensureDataDir();
    const items = Array.from(serverInventory.values());
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save inventory to disk:', err);
  }
}

function saveScanHistoryToDisk() {
  try {
    ensureDataDir();
    fs.writeFileSync(SCAN_HISTORY_FILE, JSON.stringify(recentScanEvents, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save scan history to disk:', err);
  }
}

function loadScanHistoryFromDisk() {
  try {
    if (fs.existsSync(SCAN_HISTORY_FILE)) {
      const raw = fs.readFileSync(SCAN_HISTORY_FILE, 'utf-8');
      const events = JSON.parse(raw);
      if (Array.isArray(events) && events.length > 0) {
        recentScanEvents.length = 0;
        recentScanEvents.push(...events);
        return true;
      }
    }
  } catch (err) {
    console.warn('Could not load scan history from disk:', err);
  }
  return false;
}

function loadInventoryFromDisk() {
  try {
    if (fs.existsSync(INVENTORY_FILE)) {
      const raw = fs.readFileSync(INVENTORY_FILE, 'utf-8');
      const items = JSON.parse(raw);
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          if (item && item.sku) {
            serverInventory.set(item.sku.toUpperCase(), item);
          }
        }
        return true;
      }
    }
  } catch (err) {
    console.warn('Could not load inventory from disk:', err);
  }
  return false;
}

// Preload baseline items
const DEFAULT_BASELINE_ITEMS: InventoryItemDTO[] = [
  { id: 'item-1', name: 'Extra Virgin Olive Oil', sku: 'OO-EV-100', category: 'Pantry', currentStock: 12, maxStock: 100, unit: 'bottles (750ml)', price: 950, expiryDate: '2027-10-15', status: 'LOW', location: 'Zone P-03' },
  { id: 'item-2', name: 'Organic Whole Wheat Flour (Atta)', sku: 'FL-ORG-AP', category: 'Dry Goods', currentStock: 840, maxStock: 1000, unit: 'kg', price: 48, expiryDate: '2026-11-05', status: 'OPTIMAL', location: 'Zone D-12' },
  { id: 'item-3', name: 'Salted Dairy Butter (500g)', sku: 'BT-GF-SLT', category: 'Dairy', currentStock: 45, maxStock: 150, unit: 'blocks (500g)', price: 280, expiryDate: '2026-09-16', status: 'REORDER', location: 'Cold Storage #2' },
  { id: 'item-4', name: 'Durum Wheat Pasta (500g)', sku: 'PS-WG-250', category: 'Dry Goods', currentStock: 210, maxStock: 250, unit: 'packs (500g)', price: 145, expiryDate: '2028-02-03', status: 'OPTIMAL', location: 'Zone D-04' },
  { id: 'item-5', name: 'Iodized Table Salt', sku: 'SL-SEA-FINE', category: 'Spices', currentStock: 5000, maxStock: 5000, unit: 'kg', price: 28, expiryDate: '2029-09-11', status: 'FULL', location: 'Zone S-01' },
  { id: 'item-6', name: 'Royal Basmati Rice (Premium)', sku: 'RIC-BAS-500', category: 'Dry Goods', currentStock: 40, maxStock: 500, unit: 'kg', price: 165, expiryDate: '2027-08-12', status: 'LOW', location: 'Zone D-01' },
  { id: 'item-7', name: 'Pure Desi Cow Ghee (1L Tin)', sku: 'GH-DESI-1L', category: 'Dairy', currentStock: 18, maxStock: 120, unit: 'tins (1L)', price: 720, expiryDate: '2027-03-20', status: 'LOW', location: 'Cold Storage #1' },
  { id: 'item-8', name: 'Single Origin Arabica Coffee Beans', sku: 'CF-ARB-250', category: 'Beverages', currentStock: 85, maxStock: 200, unit: 'bags (1kg)', price: 1250, expiryDate: '2027-01-10', status: 'OPTIMAL', location: 'Zone B-05' },
];

for (const item of DEFAULT_BASELINE_ITEMS) {
  serverInventory.set(item.sku.toUpperCase(), item);
}

// Load any previously persisted items from disk to survive restarts and refresh
loadInventoryFromDisk();
loadScanHistoryFromDisk();

function broadcastPayload(payload: any) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
      (client as any).flush?.();
    } catch {
      sseClients.delete(client);
    }
  }
}

function broadcastScanEvent(event: LiveScanEvent, item?: InventoryItemDTO) {
  const finalItem = item || serverInventory.get(event.sku);
  broadcastPayload({
    type: 'scan_event',
    event,
    item: finalItem,
    timestamp: Date.now(),
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Permissive CORS middleware for cross-origin mobile and preview connections
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'OmniStock Smart Inventory Engine',
      aiAvailable: !!process.env.GEMINI_API_KEY,
      connectedClients: sseClients.size,
      cachedItems: serverInventory.size,
    });
  });

  // Get Live Inventory
  app.get('/api/inventory', (_req, res) => {
    res.json({
      inventory: Array.from(serverInventory.values()),
      timestamp: Date.now(),
    });
  });

  // Sync Inventory from Front-End
  app.post('/api/inventory/sync', (req, res) => {
    const items = req.body?.inventory;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item && item.sku) {
          const key = item.sku.toUpperCase();
          const existing = serverInventory.get(key);
          if (existing) {
            serverInventory.set(key, { ...existing, ...item });
          } else {
            serverInventory.set(key, item);
          }
        }
      }
      saveInventoryToDisk();
    }
    res.json({ success: true, count: serverInventory.size });
  });

  // Generic Real-Time Inventory Updation (Website Refills, Reorders, Manual Adjustments)
  app.post('/api/inventory/update', (req, res) => {
    try {
      const { sku, addedQty = 0, newStock: customNewStock, mode = 'add', device = 'Warehouse Dashboard', sessionId } = req.body;
      if (!sku) {
        res.status(400).json({ error: 'SKU is required' });
        return;
      }
      const searchKey = sku.trim().toUpperCase();
      let matchedItem = serverInventory.get(searchKey);
      if (!matchedItem) {
        for (const item of serverInventory.values()) {
          if (item.sku.toUpperCase() === searchKey) {
            matchedItem = item;
            break;
          }
        }
      }

      if (!matchedItem) {
        res.status(404).json({ error: 'Item not found in warehouse inventory' });
        return;
      }

      const prevStock = matchedItem.currentStock;
      let finalNewStock = prevStock;
      let delta = Number(addedQty) || 0;

      if (customNewStock !== undefined && customNewStock !== null && !isNaN(Number(customNewStock))) {
        finalNewStock = Math.max(0, Number(customNewStock));
        delta = finalNewStock - prevStock;
      } else if (mode === 'set') {
        finalNewStock = Math.max(0, delta);
        delta = finalNewStock - prevStock;
      } else {
        finalNewStock = Math.max(0, prevStock + delta);
      }

      matchedItem.currentStock = finalNewStock;
      const pct = (finalNewStock / (matchedItem.maxStock || 100)) * 100;
      if (pct <= 20) matchedItem.status = 'CRITICAL';
      else if (pct <= 40) matchedItem.status = 'LOW';
      else if (pct >= 95) matchedItem.status = 'FULL';
      else matchedItem.status = 'OPTIMAL';

      serverInventory.set(matchedItem.sku, matchedItem);
      saveInventoryToDisk();

      const scanEvent: LiveScanEvent = {
        id: `upd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sku: matchedItem.sku,
        barcode: (matchedItem as any).barcode || matchedItem.sku,
        itemName: matchedItem.name,
        unit: matchedItem.unit,
        addedQty: delta,
        newStock: finalNewStock,
        previousStock: prevStock,
        location: matchedItem.location || 'Zone A-01',
        device,
        sessionId,
        timestamp: Date.now(),
      };

      recentScanEvents.unshift(scanEvent);
      if (recentScanEvents.length > 50) recentScanEvents.length = 50;

      broadcastScanEvent(scanEvent, matchedItem);

      res.json({
        success: true,
        item: matchedItem,
        event: scanEvent,
        message: `Updated stock of ${matchedItem.name} to ${finalNewStock} ${matchedItem.unit}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Inventory update failed' });
    }
  });

  // Batch Inventory Replenishment (Multi-SKU updates)
  app.post('/api/inventory/batch-update', (req, res) => {
    try {
      const { items, device = 'Warehouse Dashboard (Batch)' } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Items array is required' });
        return;
      }

      const updatedItems: InventoryItemDTO[] = [];
      const events: LiveScanEvent[] = [];

      for (const it of items) {
        if (!it || !it.sku) continue;
        const searchKey = it.sku.trim().toUpperCase();
        let matched = serverInventory.get(searchKey);
        if (!matched) {
          for (const item of serverInventory.values()) {
            if (item.sku.toUpperCase() === searchKey) {
              matched = item;
              break;
            }
          }
        }
        if (matched) {
          const prev = matched.currentStock;
          const addVal = Number(it.quantity) || 0;
          const newStk = Math.max(0, prev + addVal);
          matched.currentStock = newStk;
          const pct = (newStk / (matched.maxStock || 100)) * 100;
          if (pct <= 20) matched.status = 'CRITICAL';
          else if (pct <= 40) matched.status = 'LOW';
          else if (pct >= 95) matched.status = 'FULL';
          else matched.status = 'OPTIMAL';

          serverInventory.set(matched.sku, matched);
          updatedItems.push(matched);

          const ev: LiveScanEvent = {
            id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sku: matched.sku,
            barcode: (matched as any).barcode || matched.sku,
            itemName: matched.name,
            unit: matched.unit,
            addedQty: addVal,
            newStock: newStk,
            previousStock: prev,
            location: matched.location || 'Zone A-01',
            device,
            timestamp: Date.now(),
          };
          events.push(ev);
          recentScanEvents.unshift(ev);
          broadcastScanEvent(ev, matched);
        }
      }

      if (recentScanEvents.length > 50) recentScanEvents.length = 50;

      saveInventoryToDisk();

      res.json({
        success: true,
        updatedCount: updatedItems.length,
        items: updatedItems,
        events,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Batch update failed' });
    }
  });

  // Delete a single item by SKU or ID (DELETE)
  app.delete('/api/inventory/:sku', (req, res) => {
    try {
      const skuParam = req.params.sku?.trim().toUpperCase();
      if (!skuParam) {
        res.status(400).json({ error: 'SKU is required.' });
        return;
      }

      let matchedItem: InventoryItemDTO | undefined;
      let matchedKey = skuParam;
      for (const [key, item] of serverInventory.entries()) {
        if (key.toUpperCase() === skuParam || item.sku.toUpperCase() === skuParam || item.id === req.params.sku) {
          matchedItem = item;
          matchedKey = key;
          break;
        }
      }

      if (matchedItem) {
        serverInventory.delete(matchedKey);
        serverInventory.delete(matchedItem.sku);
        saveInventoryToDisk();

        const eventId = (req.body && req.body.eventId) || `del-${matchedItem.sku}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const deletePayload = {
          type: 'item_deleted',
          eventId,
          sku: matchedItem.sku,
          id: matchedItem.id,
          itemName: matchedItem.name,
          device: (req.body && req.body.device) || 'Commercial Operator',
          timestamp: Date.now(),
        };

        broadcastPayload(deletePayload);

        res.json({
          success: true,
          message: `Successfully removed "${matchedItem.name}" (${matchedItem.sku}) from inventory.`,
          item: matchedItem,
          eventId,
        });
      } else {
        res.status(404).json({ error: `Item with SKU "${skuParam}" not found in inventory.` });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete item.' });
    }
  });

  // POST alias for single item deletion
  app.post('/api/inventory/delete', (req, res) => {
    try {
      const { sku, id } = req.body;
      const target = (sku || id || '').trim().toUpperCase();
      if (!target) {
        res.status(400).json({ error: 'SKU or item ID is required.' });
        return;
      }

      let matchedItem: InventoryItemDTO | undefined;
      let matchedKey = target;
      for (const [key, item] of serverInventory.entries()) {
        if (key.toUpperCase() === target || item.sku.toUpperCase() === target || item.id === sku || item.id === id) {
          matchedItem = item;
          matchedKey = key;
          break;
        }
      }

      if (matchedItem) {
        serverInventory.delete(matchedKey);
        serverInventory.delete(matchedItem.sku);
        saveInventoryToDisk();

        const eventId = (req.body && req.body.eventId) || `del-${matchedItem.sku}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const deletePayload = {
          type: 'item_deleted',
          eventId,
          sku: matchedItem.sku,
          id: matchedItem.id,
          itemName: matchedItem.name,
          device: (req.body && req.body.device) || 'Commercial Operator',
          timestamp: Date.now(),
        };

        broadcastPayload(deletePayload);

        res.json({
          success: true,
          message: `Successfully removed "${matchedItem.name}" (${matchedItem.sku}) from inventory.`,
          item: matchedItem,
          eventId,
        });
      } else {
        res.status(404).json({ error: `Item "${target}" not found in inventory.` });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete item.' });
    }
  });

  // Batch delete items
  app.post('/api/inventory/batch-delete', (req, res) => {
    try {
      const { skus, ids } = req.body;
      const targets = Array.isArray(skus) ? skus : Array.isArray(ids) ? ids : [];
      if (targets.length === 0) {
        res.status(400).json({ error: 'List of SKUs or IDs is required.' });
        return;
      }

      const deletedItems: InventoryItemDTO[] = [];
      const normalizedTargets = new Set(targets.map((t: string) => String(t).trim().toUpperCase()));

      for (const [key, item] of Array.from(serverInventory.entries())) {
        if (
          normalizedTargets.has(key.toUpperCase()) ||
          normalizedTargets.has(item.sku.toUpperCase()) ||
          normalizedTargets.has(item.id.toUpperCase())
        ) {
          serverInventory.delete(key);
          serverInventory.delete(item.sku);
          deletedItems.push(item);
        }
      }

      saveInventoryToDisk();

      const eventId = (req.body && req.body.eventId) || `bdel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const batchDeletePayload = {
        type: 'items_batch_deleted',
        eventId,
        skus: deletedItems.map((i) => i.sku),
        ids: deletedItems.map((i) => i.id),
        count: deletedItems.length,
        device: (req.body && req.body.device) || 'Commercial Operator',
        timestamp: Date.now(),
      };

      broadcastPayload(batchDeletePayload);

      res.json({
        success: true,
        deletedCount: deletedItems.length,
        items: deletedItems,
        eventId,
        message: `Successfully removed ${deletedItems.length} items from inventory.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to batch delete items.' });
    }
  });

  // 1. Session Initialization & Public URL resolution for QR code
  app.get('/api/scanner/session/init', (req, res) => {
    try {
      let sessionId = typeof req.query.sessionId === 'string' && req.query.sessionId.trim()
        ? req.query.sessionId.trim()
        : `SES-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Resolve origin dynamically from query baseUrl or request headers
      const queryBaseUrl = typeof req.query.baseUrl === 'string' ? req.query.baseUrl.trim() : '';
      const forwardedHost = req.get('x-forwarded-host') || req.get('host');
      const forwardedProto = req.get('x-forwarded-proto') || req.protocol || 'https';
      const defaultHostOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : `http://localhost:${PORT}`;
      const resolvedOrigin = queryBaseUrl || defaultHostOrigin;

      const targetSku = typeof req.query.sku === 'string' && req.query.sku.trim() ? req.query.sku.trim() : '';
      const skuQuery = targetSku ? `&sku=${encodeURIComponent(targetSku)}` : '';

      const publicUrl = `${resolvedOrigin}/?action=scan&scanner=mobile&session=${sessionId}${skuQuery}`;
      const sharedHost = resolvedOrigin.includes('ais-dev-') ? resolvedOrigin.replace('ais-dev-', 'ais-pre-') : resolvedOrigin;
      const sharedUrl = `${sharedHost}/?action=scan&scanner=mobile&session=${sessionId}${skuQuery}`;

      // Try detecting LAN IPv4 for local Wi-Fi pairing
      let lanUrl: string | undefined;
      try {
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
          const list = nets[name];
          if (list) {
            for (const net of list) {
              if (net.family === 'IPv4' && !net.internal && (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.'))) {
                lanUrl = `http://${net.address}:${PORT}/?action=scan&scanner=mobile&session=${sessionId}${skuQuery}`;
                break;
              }
            }
          }
          if (lanUrl) break;
        }
      } catch {}

      let session = scannerSessions.get(sessionId);
      if (!session) {
        session = {
          sessionId,
          createdAt: Date.now(),
          status: 'waiting',
          scansCount: 0,
        };
        scannerSessions.set(sessionId, session);
      }

      res.json({
        success: true,
        sessionId,
        publicUrl,
        currentUrl: publicUrl,
        lanUrl,
        sharedUrl,
        status: session.status,
        device: session.device,
        scansCount: session.scansCount,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Session init failed' });
    }
  });

  // Explicit route handler for mobile scanner paths to guarantee no 404
  app.get(['/scanner', '/mobile', '/mobile-scanner', '/scan'], (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      const distPath = path.join(process.cwd(), 'dist');
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      const currentQuery = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      req.url = currentQuery ? `/?action=scan&scanner=mobile&${currentQuery.substring(1)}` : '/?action=scan&scanner=mobile';
      next();
    }
  });

  // 2. Mobile Handshake: Mobile automatically calls this when opened from QR Code
  app.post('/api/scanner/connect', (req, res) => {
    try {
      const { sessionId, device = 'Mobile Camera Phone' } = req.body;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      let session = scannerSessions.get(sessionId);
      if (!session) {
        session = {
          sessionId,
          createdAt: Date.now(),
          status: 'connected',
          device,
          lastConnectedAt: Date.now(),
          scansCount: 0,
        };
        scannerSessions.set(sessionId, session);
      } else {
        session.status = 'connected';
        session.device = device;
        session.lastConnectedAt = Date.now();
      }

      // Broadcast mobile connection to desktop app immediately!
      broadcastPayload({
        type: 'mobile_connected',
        sessionId,
        device,
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        sessionId,
        status: 'connected',
        device,
        message: `Mobile camera linked successfully (${device})`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Mobile connect failed' });
    }
  });

  // 3. Query Session Status
  app.get('/api/scanner/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = scannerSessions.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found', status: 'unknown' });
      return;
    }
    res.json({
      success: true,
      sessionId: session.sessionId,
      status: session.status,
      device: session.device,
      scansCount: session.scansCount,
      lastConnectedAt: session.lastConnectedAt,
      lastScannedItem: session.lastScannedItem,
    });
  });

  // 4. Reset Session Endpoint
  app.post('/api/scanner/session/reset', (req, res) => {
    try {
      const { oldSessionId, newSessionId } = req.body;
      if (oldSessionId) {
        scannerSessions.delete(oldSessionId);
      }
      const freshId = newSessionId || `SES-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const freshSession = {
        sessionId: freshId,
        createdAt: Date.now(),
        status: 'waiting' as const,
        scansCount: 0,
      };
      scannerSessions.set(freshId, freshSession);

      broadcastPayload({
        type: 'session_reset',
        oldSessionId,
        newSessionId: freshId,
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        sessionId: freshId,
        status: 'waiting',
        message: 'Scanner session reset successfully',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Session reset failed' });
    }
  });

  // Real-time Mobile Scan Endpoint (Called by mobile phone when scanning barcode)
  app.post('/api/scanner/scan', (req, res) => {
    try {
      const { sku, barcode, addedQty = 1, mode = 'add', device = 'Mobile Phone', sessionId } = req.body;

      if (!sku && !barcode) {
        res.status(400).json({ error: 'SKU or Barcode is required' });
        return;
      }

      // Update session if available
      if (sessionId && scannerSessions.has(sessionId)) {
        const sess = scannerSessions.get(sessionId)!;
        sess.status = 'active';
        sess.scansCount++;
        sess.lastConnectedAt = Date.now();
        if (device) sess.device = device;
      }

      // Find item by SKU or Barcode
      const searchKey = (sku || barcode || '').trim().toUpperCase();
      let matchedItem: InventoryItemDTO | undefined;

      for (const item of serverInventory.values()) {
        if (
          item.sku.toUpperCase() === searchKey ||
          (item as any).barcode === searchKey ||
          item.name.toUpperCase().includes(searchKey)
        ) {
          matchedItem = item;
          break;
        }
      }

      // If not found in memory, create a fallback record so the scan never fails
      if (!matchedItem) {
        const targetUnit = (req.body.unit || req.body.packagingType || 'boxes').trim();
        matchedItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `Scanned Item (${sku || barcode})`,
          sku: (sku || barcode || 'SKU-UNKNOWN').toUpperCase(),
          barcode: barcode || sku,
          category: 'Pantry',
          currentStock: 0,
          maxStock: 100,
          unit: targetUnit,
          price: 150,
          expiryDate: '2027-12-31',
          status: 'LOW',
          location: 'Zone A-01',
          isScanned: true,
          scannedAt: Date.now(),
        };
        serverInventory.set(matchedItem.sku, matchedItem);
      } else {
        matchedItem.isScanned = true;
        matchedItem.scannedAt = Date.now();
        if (req.body.unit && typeof req.body.unit === 'string') {
          matchedItem.unit = req.body.unit.trim();
        }
      }

      if (sessionId && scannerSessions.has(sessionId)) {
        scannerSessions.get(sessionId)!.lastScannedItem = matchedItem.name;
      }

      const parsedQty = Number(addedQty);
      const absQty = Math.abs(isNaN(parsedQty) || parsedQty === 0 ? 1 : parsedQty);
      const prevStock = matchedItem.currentStock;
      let newStock = prevStock;
      let actualDelta = absQty;

      if (mode === 'set') {
        newStock = Math.max(0, absQty);
        actualDelta = newStock - prevStock;
      } else if (mode === 'deduct' || (typeof addedQty === 'number' && addedQty < 0)) {
        newStock = Math.max(0, prevStock - absQty);
        actualDelta = -absQty;
      } else {
        // default add / refill
        newStock = prevStock + absQty;
        actualDelta = absQty;
      }

      matchedItem.currentStock = newStock;
      const pct = (newStock / (matchedItem.maxStock || 100)) * 100;
      if (pct <= 20) matchedItem.status = 'CRITICAL';
      else if (pct <= 40) matchedItem.status = 'LOW';
      else if (pct >= 95) matchedItem.status = 'FULL';
      else matchedItem.status = 'OPTIMAL';

      serverInventory.set(matchedItem.sku, matchedItem);
      saveInventoryToDisk();

      const scanEvent: LiveScanEvent = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sku: matchedItem.sku,
        barcode: barcode || matchedItem.sku,
        itemName: matchedItem.name,
        unit: matchedItem.unit,
        addedQty: actualDelta,
        newStock,
        previousStock: prevStock,
        location: matchedItem.location || 'Zone A-01',
        device: typeof device === 'string' && device ? device : 'Mobile Camera Phone',
        sessionId,
        timestamp: Date.now(),
      };

      recentScanEvents.unshift(scanEvent);
      if (recentScanEvents.length > 100) {
        recentScanEvents.length = 100;
      }
      saveScanHistoryToDisk();

      // Instant SSE Broadcast to all connected desktop apps
      broadcastScanEvent(scanEvent, matchedItem);

      res.json({
        success: true,
        message: `Successfully ${actualDelta >= 0 ? 'restocked' : 'dispensed'} ${Math.abs(actualDelta)} ${matchedItem.unit} of ${matchedItem.name}`,
        item: matchedItem,
        event: scanEvent,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Scan update failed' });
    }
  });

  // Real-Time Product Addition Endpoint (Called by mobile scanner or web app)
  app.post('/api/products/add', (req, res) => {
    try {
      const {
        name,
        sku,
        barcode,
        category = 'Pantry',
        currentStock = 20,
        maxStock = 100,
        unit = 'units',
        price = 199,
        location = 'Zone A-01',
        expiryDate = '2027-12-31',
        imageUrl,
        device = 'Mobile Scanner',
        sessionId,
      } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Product name is required.' });
        return;
      }

      const finalSku = (sku || barcode || `SKU-${Date.now().toString().slice(-6)}`).trim().toUpperCase();
      const stockNum = Math.max(0, Number(currentStock) || 0);
      const maxNum = Math.max(stockNum || 1, Number(maxStock) || 100);
      const priceNum = Math.max(0, Number(price) || 100);

      let status: 'FULL' | 'OPTIMAL' | 'LOW' | 'REORDER' | 'CRITICAL' = 'OPTIMAL';
      const pct = (stockNum / maxNum) * 100;
      if (pct <= 20) status = 'CRITICAL';
      else if (pct <= 40) status = 'LOW';
      else if (pct >= 95) status = 'FULL';

      const fallbackImages: Record<string, string> = {
        Pantry: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=300&h=300',
        Dairy: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=300&h=300',
        Spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=300&h=300',
        'Dry Goods': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300&h=300',
        Beverages: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=300&h=300',
      };

      const newProduct: InventoryItemDTO = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        sku: finalSku,
        barcode: (barcode || finalSku).trim(),
        category,
        currentStock: stockNum,
        maxStock: maxNum,
        unit: unit || 'units',
        price: priceNum,
        location: location || 'Zone A-01',
        expiryDate: expiryDate || '2027-12-31',
        status,
        imageUrl: imageUrl || fallbackImages[category] || fallbackImages['Pantry'],
        isScanned: true,
        scannedAt: Date.now(),
      };

      serverInventory.set(finalSku, newProduct);
      saveInventoryToDisk();

      if (sessionId && scannerSessions.has(sessionId)) {
        const sess = scannerSessions.get(sessionId)!;
        sess.status = 'active';
        sess.scansCount++;
        sess.lastScannedItem = newProduct.name;
        sess.lastConnectedAt = Date.now();
        if (device) sess.device = device;
      }

      // Record a scan event for history
      const scanEvent: LiveScanEvent = {
        id: `add-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sku: finalSku,
        barcode: barcode || finalSku,
        itemName: newProduct.name,
        unit: newProduct.unit,
        addedQty: stockNum,
        newStock: stockNum,
        previousStock: 0,
        location: newProduct.location,
        device: typeof device === 'string' && device ? device : 'Mobile Camera Phone',
        sessionId,
        timestamp: Date.now(),
      };
      recentScanEvents.unshift(scanEvent);
      if (recentScanEvents.length > 100) recentScanEvents.length = 100;
      saveScanHistoryToDisk();

      // Real-time broadcast to all connected desktop apps
      broadcastPayload({
        type: 'product_added',
        product: newProduct,
        event: scanEvent,
        device,
        sessionId,
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        message: `Successfully added "${newProduct.name}" (${newProduct.sku}) to warehouse catalog!`,
        product: newProduct,
        event: scanEvent,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to add new product.' });
    }
  });

  // Get full persisted Scanned Items History list (survives refresh and app close)
  app.get('/api/scanner/history', (_req, res) => {
    res.json({
      success: true,
      history: recentScanEvents,
      count: recentScanEvents.length,
      timestamp: Date.now(),
    });
  });

  // Record / Sync Scanned Items History list from client
  app.post('/api/scanner/history', (req, res) => {
    try {
      const { item, history: bulkHistory } = req.body;
      if (Array.isArray(bulkHistory)) {
        for (const ev of bulkHistory) {
          if (ev && ev.id && !recentScanEvents.some((e) => e.id === ev.id)) {
            recentScanEvents.push(ev);
          }
        }
        recentScanEvents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (recentScanEvents.length > 100) recentScanEvents.length = 100;
        saveScanHistoryToDisk();
      } else if (item && item.sku) {
        const scanEvent: LiveScanEvent = {
          id: item.id || `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sku: item.sku,
          barcode: item.barcode || item.sku,
          itemName: item.itemName || item.name || `Scanned Item (${item.sku})`,
          unit: item.unit || 'units',
          addedQty: Number(item.addedQty ?? item.quantity ?? 1),
          newStock: Number(item.newStock ?? item.currentStock ?? 0),
          previousStock: Number(item.previousStock ?? 0),
          location: item.location || 'Zone A-01',
          device: item.device || 'Mobile Scanner',
          sessionId: item.sessionId,
          timestamp: item.timestamp || Date.now(),
        };
        if (!recentScanEvents.some((e) => e.id === scanEvent.id)) {
          recentScanEvents.unshift(scanEvent);
          if (recentScanEvents.length > 100) recentScanEvents.length = 100;
          saveScanHistoryToDisk();
        }
      }
      res.json({ success: true, count: recentScanEvents.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to sync scan history' });
    }
  });

  // Delete an entry from Scanned History list
  app.delete('/api/scanner/history/:id', (req, res) => {
    try {
      const id = req.params.id;
      const index = recentScanEvents.findIndex((e) => e.id === id);
      if (index !== -1) {
        const [removed] = recentScanEvents.splice(index, 1);
        saveScanHistoryToDisk();
        res.json({ success: true, removed, count: recentScanEvents.length });
      } else {
        res.status(404).json({ error: 'Scan history entry not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete scan entry' });
    }
  });

  // Clear all Scanned History
  app.delete('/api/scanner/history', (_req, res) => {
    try {
      recentScanEvents.length = 0;
      saveScanHistoryToDisk();
      res.json({ success: true, message: 'Scan history cleared' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to clear scan history' });
    }
  });

  // Server-Sent Events (SSE) for Real-Time Instant Desktop & Mobile Updates
  app.get('/api/scanner/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform, no-store',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected', clients: sseClients.size + 1, timestamp: Date.now() })}\n\n`);
    (res as any).flush?.();
    sseClients.add(res);

    // Keep connection alive with lightweight comments every 5s
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
        (res as any).flush?.();
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 5000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // Polling fallback endpoint: returns new scan events + full live inventory snapshot
  app.get('/api/scanner/updates', (req, res) => {
    const since = parseInt(req.query.since as string, 10) || 0;
    // Allow a 2-second clock-drift margin so events created within network latency/clock skew are never missed
    const adjustedSince = Math.max(0, since - 2000);
    const newEvents = since > 0 ? recentScanEvents.filter((e) => e.timestamp > adjustedSince) : recentScanEvents.slice(0, 10);
    res.json({
      success: true,
      events: newEvents,
      recentEvents: recentScanEvents.slice(0, 20),
      inventory: Array.from(serverInventory.values()),
      timestamp: Date.now(),
      recentCount: recentScanEvents.length,
      connectedClients: sseClients.size,
    });
  });

  // AI Assistant Endpoint
  app.post('/api/ai/assistant', async (req, res) => {
    try {
      const { message, inventory, history, language } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message string is required' });
        return;
      }

      const userLang = typeof language === 'string' && language ? language : 'en';
      const invList: InventoryItemDTO[] = Array.isArray(inventory) ? inventory : [];
      const ai = getAi();

      if (!ai) {
        // Fallback to intelligent rule-based engine
        const fallbackResult = executeRuleBasedAssistant(message, invList, userLang);
        res.json(fallbackResult);
        return;
      }

      // Format inventory context for Gemini
      const inventoryCatalog = invList.map((i) => ({
        sku: i.sku,
        name: i.name,
        category: i.category,
        currentStock: i.currentStock,
        maxStock: i.maxStock,
        unit: i.unit,
        priceInr: i.price,
        status: i.status,
        daysToExpiry: i.daysToExpiry ?? 'N/A',
      }));

      const langMap: Record<string, string> = {
        en: 'English',
        hi: 'Hindi (हिंदी)',
        es: 'Spanish (Español)',
        fr: 'French (Français)',
        de: 'German (Deutsch)',
        ar: 'Arabic (العربية)',
        ja: 'Japanese (日本語)',
        zh: 'Chinese (中文)',
        te: 'Telugu (తెలుగు)',
        ta: 'Tamil (தமிழ்)',
        bn: 'Bengali (বাংলা)',
        mr: 'Marathi (मराठी)',
        gu: 'Gujarati (ગુજરાતી)',
        kn: 'Kannada (ಕನ್ನಡ)',
      };
      const activeLanguageName = langMap[userLang] || userLang;

      const systemPrompt = `You are OmniStock AI Copilot, an elite warehouse inventory intelligence assistant powered by Gemini 3.8 Flash.
All monetary valuations are strictly formatted in Indian Rupees (INR / ₹) with standard Indian numbering (e.g. ₹1,20,500.00).
You have real-time live access to the warehouse catalog provided below.

USER PREFERRED LANGUAGE:
The user interface is currently set to: ${activeLanguageName} (code: "${userLang}").
If the user speaks or queries in ${activeLanguageName} (or if their query is general), respond fluently, naturally, and professionally in ${activeLanguageName}.
If they query in another language (e.g. English, Hinglish, Hindi), reply in that language appropriately.
Ensure SKU codes, exact numbers, and ₹ currency symbols remain intact.

CAPABILITIES:
1. Replenishment & Stock Commands:
   - When a user asks to refill, restock, add, replenish, or top-up items (e.g., "Refill 25 units of Basmati rice", "Add 15 olive oil", "Restock all low items", "कम स्टॉक वाले आइटम भरो"):
     * Match exact SKU(s) from catalog.
     * Formulate appropriate actions in the "actions" array so the frontend immediately updates live inventory in the database.
     * In your reply, provide exact before/after stock numbers, capacity percentages, and line value increments in ₹.
2. Multilingual Fluency:
   - Understand English, Hindi (हिंदी), Hinglish (e.g. "sab low stock refill kar do", "20 packet chawal daalo", "expire hone wala maal batao"), and Indian regional terms.
3. Shelf Life & Expiry Analytics:
   - Identify near-term expiry batches (critical <15 days, warning <30 days, caution <60 days).
   - Suggest FIFO dispatch priority.
4. Valuation & Cost Forecasting:
   - Accurately calculate warehouse holding values, top revenue holdings, category spreads, and restocking budgets.
5. Suggestions:
   - Always return 3-4 context-aware, highly relevant, one-click follow-up suggestion prompts in the "suggestions" array (in the user's active language).

Output MUST be a strictly valid JSON object matching this schema:
{
  "reply": "string (Markdown formatted assistant response with bold text, bullet points, and ₹ currency)",
  "actions": [
    {
      "type": "refill" | "batch_refill" | "reorder_draft" | "filter_view",
      "sku": "string (valid SKU like RC-BAS-5KG, OL-EV-750, etc.)",
      "quantity": number,
      "mode": "add" | "set" | "fill_to_max",
      "items": [ { "sku": "string", "quantity": number, "mode": "add" | "set" | "fill_to_max" } ],
      "reason": "string"
    }
  ],
  "suggestions": ["string", "string", "string"]
}

Current Live Inventory Catalog:
${JSON.stringify(inventoryCatalog, null, 2)}
`;

      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history) && history.length > 0) {
        for (const h of history.slice(-6)) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          });
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '';
      try {
        const parsed = JSON.parse(text);
        res.json({
          reply: parsed.reply || 'Request processed successfully.',
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
          suggestions: Array.isArray(parsed.suggestions)
            ? parsed.suggestions
            : ['Refill low stock items', 'Audit expiring batches', 'View valuation'],
        });
      } catch {
        // In case json parsing failed, fallback gracefully
        const fallback = executeRuleBasedAssistant(message, invList, userLang);
        res.json(fallback);
      }
    } catch (err: any) {
      console.error('AI assistant error:', err);
      // Fallback on error so user never gets broken experience
      const fallback = executeRuleBasedAssistant(req.body?.message || '', req.body?.inventory || [], req.body?.language || 'en');
      res.json(fallback);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Guaranteed SPA HTML fallback in development for deep links and scanner URLs
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      if (req.originalUrl.startsWith('/api') || req.originalUrl.includes('.')) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          const template = fs.readFileSync(indexPath, 'utf-8');
          const html = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
          return;
        }
      } catch (err: any) {
        vite.ssrFixStacktrace(err);
      }
      next();
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OmniStock Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
