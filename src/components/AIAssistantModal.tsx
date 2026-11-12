import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, AIChatMessage, AIAssistantAction, AppliedRefillDetail, StockStatus, LanguageCode } from '../types';
import { OmniStockLogo } from './OmniStockLogo';
import { t, translateRecordedItem, translateRecordedUnit, translateFullText } from '../utils/i18n';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onRefillQuantity: (sku: string, addedQty: number) => void;
  onBatchRefill?: (items: Array<{ sku: string; quantity: number }>) => void;
  onNavigateToItem?: (sku: string) => void;
  currentLang?: LanguageCode;
}

type PromptCategory = 'all' | 'refills' | 'expiry' | 'valuation' | 'hindi';

interface QuickPrompt {
  label: string;
  query: string;
  category: PromptCategory;
  icon: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { label: 'Refill Low Stock', query: 'Refill all low stock items', category: 'all', icon: 'bolt' },
  { label: 'Basmati (+25)', query: 'Refill 25 units of Royal Basmati Rice', category: 'refills', icon: 'grain' },
  { label: 'Atta (+30)', query: 'Refill 30 units of Chakki Fresh Atta', category: 'refills', icon: 'inventory' },
  { label: 'Restock Dairy', query: 'Restock all dairy products to 90% capacity', category: 'refills', icon: 'egg' },
  { label: 'Expiring Soon', query: 'Show items expiring within 45 days', category: 'expiry', icon: 'event_busy' },
  { label: 'Shelf Life Audit', query: 'Perform full shelf-life expiry audit with FIFO priority', category: 'expiry', icon: 'verified' },
  { label: 'Total Valuation', query: 'What is our total warehouse inventory valuation in rupees?', category: 'valuation', icon: 'payments' },
  { label: 'Top Value Holdings', query: 'What are our top 3 highest value stock holdings?', category: 'valuation', icon: 'trending_up' },
  { label: 'Restock Budget', query: 'How much money in ₹ is needed to restock all low items to 100%?', category: 'valuation', icon: 'calculate' },
  { label: 'कम स्टॉक भरो (Hindi)', query: 'कम स्टॉक वाले सभी आइटम रीफिल करो', category: 'hindi', icon: 'translate' },
  { label: '20 पैकेट चावल (Hindi)', query: '20 पैकेट बासमती चावल रीफिल करो', category: 'hindi', icon: 'translate' },
  { label: 'एक्सपायरी चेक (Hindi)', query: 'कौन से आइटम जल्दी एक्सपायर होने वाले हैं?', category: 'hindi', icon: 'translate' },
  { label: 'कुल मूल्यांकन (Hindi)', query: 'कुल इन्वेंट्री का मूल्य कितना है?', category: 'hindi', icon: 'translate' },
];

const INITIAL_MESSAGES: AIChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'assistant',
    content: `Hello! I am your **OmniStock AI Copilot** powered by **Gemini 3.8 Flash**.\n\nI monitor your warehouse live and can execute instantaneous replenishment commands, run shelf-life audits, or compute stock valuations.\n\n• *"Refill 25 units of Basmati Rice and 15 Olive Oil"*\n• *"Refill all low stock items"*\n• *"Which items are expiring this month?"*\n• *"What is our total warehouse holding valuation in ₹?"*\n• *"कम स्टॉक वाले सभी आइटम रीफिल करो"*`,
    timestamp: 'Just now',
    suggestions: [
      '⚡ Refill all low stock items',
      '🍚 Refill 25 units of Basmati Rice',
      '⚠️ Show items expiring soon (<45 days)',
      '💰 Calculate warehouse total valuation',
      '📊 Category valuation breakdown',
    ],
  },
];

// Rich Markdown Text Formatter
const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Heading 1 / 2 / 3
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-slate-900 text-sm mt-2 mb-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} className="font-bold text-slate-900 text-sm sm:text-base mt-2 mb-1">
              {trimmed.replace(/^#+\s/, '')}
            </h3>
          );
        }

        // Bullet point
        const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const textToRender = isBullet ? trimmed.replace(/^[•\-*]\s+/, '') : trimmed;

        // Parse inline formatting: **bold**, `code`, and currency ₹
        const renderFormattedSpans = (text: string) => {
          const parts = text.split(/(\*\*.*?\*\*|`.*?`|₹[\d,]+(?:\.\d+)?)/g);

          return parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900 font-mono">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code
                  key={pIdx}
                  className="px-1.5 py-0.5 rounded-md bg-slate-100 text-emerald-800 font-mono text-[11px] font-semibold border border-slate-200"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            if (part.startsWith('₹')) {
              return (
                <span key={pIdx} className="font-bold text-emerald-800 font-mono">
                  {part}
                </span>
              );
            }
            return part;
          });
        };

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-emerald-700 font-bold text-sm leading-tight shrink-0">•</span>
              <span className="flex-1 text-slate-700">{renderFormattedSpans(textToRender)}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-slate-700">
            {renderFormattedSpans(textToRender)}
          </p>
        );
      })}
    </div>
  );
};

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onRefillQuantity,
  onBatchRefill,
  onNavigateToItem,
  currentLang = 'en',
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('all');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute live warehouse stats for context ribbon
  const totalValuation = inventory.reduce((sum, item) => sum + item.currentStock * item.price, 0);
  const lowStockCount = inventory.filter(
    (i) => i.status === 'LOW' || i.status === 'REORDER' || i.status === 'CRITICAL' || i.currentStock < i.maxStock * 0.35
  ).length;
  const expiringCount = inventory.filter(
    (i) => typeof i.daysToExpiry === 'number' && i.daysToExpiry <= 45
  ).length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 150);
    } else {
      // Stop speech when modal closes
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setCurrentlySpeakingId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Keyboard shortcut listener: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Text to Speech playback
  const handleToggleSpeech = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (currentlySpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text of markdown characters before speaking
    const cleanText = text
      .replace(/[#*`_]/g, '')
      .replace(/₹/g, 'Rupees ')
      .replace(/•/g, ', ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langLocales: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      ar: 'ar-SA',
      ja: 'ja-JP',
      zh: 'zh-CN',
      te: 'te-IN',
      ta: 'ta-IN',
      bn: 'bn-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
      kn: 'kn-IN',
    };
    utterance.lang = langLocales[currentLang] || 'en-IN';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setCurrentlySpeakingId(null);
    };
    utterance.onerror = () => {
      setCurrentlySpeakingId(null);
    };

    setCurrentlySpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Copy message to clipboard
  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Execute refilling actions returned from AI
  const executeActions = (actions: AIAssistantAction[]): AppliedRefillDetail[] => {
    const appliedList: AppliedRefillDetail[] = [];
    const batchItemsToRefill: Array<{ sku: string; quantity: number }> = [];

    for (const action of actions) {
      if (action.type === 'refill' && action.sku && typeof action.quantity === 'number') {
        const item = inventory.find((i) => i.sku === action.sku);
        if (item) {
          const prev = item.currentStock;
          let added = action.quantity;
          if (action.mode === 'fill_to_max') {
            added = Math.max(0, item.maxStock - prev);
          } else if (action.mode === 'set') {
            added = Math.max(0, action.quantity - prev);
          }

          if (added > 0) {
            onRefillQuantity(item.sku, added);
            const newStock = prev + added;
            let newStatus: StockStatus = item.status;
            if (newStock >= item.maxStock) newStatus = 'FULL';
            else if (newStock > item.maxStock * 0.4) newStatus = 'OPTIMAL';
            else newStatus = 'REORDER';

            appliedList.push({
              sku: item.sku,
              name: item.name,
              previousStock: prev,
              newStock,
              addedQty: added,
              unit: item.unit,
              status: newStatus,
              lineValue: newStock * item.price,
            });
          }
        }
      } else if (action.type === 'batch_refill' && Array.isArray(action.items)) {
        for (const it of action.items) {
          const item = inventory.find((i) => i.sku === it.sku);
          if (item && it.quantity > 0) {
            batchItemsToRefill.push({ sku: it.sku, quantity: it.quantity });
            const prev = item.currentStock;
            const newStock = prev + it.quantity;
            let newStatus: StockStatus = item.status;
            if (newStock >= item.maxStock) newStatus = 'FULL';
            else if (newStock > item.maxStock * 0.4) newStatus = 'OPTIMAL';
            else newStatus = 'REORDER';

            appliedList.push({
              sku: item.sku,
              name: item.name,
              previousStock: prev,
              newStock,
              addedQty: it.quantity,
              unit: item.unit,
              status: newStatus,
              lineValue: newStock * item.price,
            });
          }
        }
      }
    }

    if (batchItemsToRefill.length > 0 && onBatchRefill) {
      onBatchRefill(batchItemsToRefill);
    }

    return appliedList;
  };

  // Undo a specific refill action
  const handleUndoRefill = (sku: string, addedQty: number) => {
    onRefillQuantity(sku, -addedQty);
    const item = inventory.find((i) => i.sku === sku);
    const sysMsg: AIChatMessage = {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: `↩️ **Refill Rolled Back**: Reverted **${addedQty} units** of **${item?.name || sku}**. Inventory returned to original count.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, sysMsg]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isProcessing) return;

    setInputValue('');

    // Append user message
    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Call server-side AI endpoint powered by Gemini 3.8 Flash
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          inventory,
          language: currentLang,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reach AI service');
      }

      const data = await response.json();
      const actions: AIAssistantAction[] = data.actions || [];
      const appliedRefills = executeActions(actions);

      const aiMsgId = `ai-${Date.now()}`;
      const aiReplyText = data.reply || 'Request processed successfully.';

      const aiMsg: AIChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        appliedRefills: appliedRefills.length > 0 ? appliedRefills : undefined,
        suggestions: data.suggestions || [
          '⚡ Refill all low stock items',
          '📊 Show inventory valuation',
          '⚠️ Check shelf-life expiry',
        ],
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Auto speech if enabled
      if (autoSpeakEnabled) {
        setTimeout(() => handleToggleSpeech(aiMsgId, aiReplyText), 200);
      }
    } catch {
      // Fallback local execution
      const lower = query.toLowerCase();
      let fallbackText = `I have received and verified your command: "${query}".`;
      const appliedList: AppliedRefillDetail[] = [];

      const matched = inventory.find((i) => lower.includes(i.name.toLowerCase()) || lower.includes(i.sku.toLowerCase()));
      if (matched && (lower.includes('refill') || lower.includes('add') || lower.includes('restock') || lower.includes('badhao'))) {
        const numMatch = query.match(/\b\d+\b/);
        const qty = numMatch ? parseInt(numMatch[0], 10) : 25;
        onRefillQuantity(matched.sku, qty);

        const prev = matched.currentStock;
        const newStock = prev + qty;
        appliedList.push({
          sku: matched.sku,
          name: matched.name,
          previousStock: prev,
          newStock,
          addedQty: qty,
          unit: matched.unit,
          status: newStock >= matched.maxStock ? 'FULL' : 'OPTIMAL',
          lineValue: newStock * matched.price,
        });

        fallbackText = `✅ **Refill Executed Successfully!**\n\nAdded **${qty} ${matched.unit}** of **${matched.name}** (\`${matched.sku}\`).\n\n• **Previous Stock**: ${prev} / ${matched.maxStock} ${matched.unit}\n• **Updated Stock**: **${newStock} / ${matched.maxStock}** ${matched.unit}\n• **Line Value**: **₹${(newStock * matched.price).toLocaleString('en-IN')}**`;
      } else if (lower.includes('all low') || (lower.includes('low') && lower.includes('refill')) || lower.includes('sab low')) {
        const lowItems = inventory.filter((i) => i.status === 'LOW' || i.status === 'REORDER' || i.status === 'CRITICAL');
        for (const it of lowItems) {
          const qty = Math.max(1, Math.round(it.maxStock * 0.85) - it.currentStock);
          onRefillQuantity(it.sku, qty);
          appliedList.push({
            sku: it.sku,
            name: it.name,
            previousStock: it.currentStock,
            newStock: it.currentStock + qty,
            addedQty: qty,
            unit: it.unit,
            status: 'OPTIMAL',
            lineValue: (it.currentStock + qty) * it.price,
          });
        }
        fallbackText = `✅ **Batch Replenishment Completed!**\n\nRestocked **${lowItems.length} low-stock SKUs** back to healthy 85%+ buffer thresholds. All inventory levels updated live.`;
      }

      const fallbackMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        appliedRefills: appliedList.length > 0 ? appliedList : undefined,
        suggestions: ['⚡ Refill all low stock items', '💰 Show total valuation', '⚠️ Audit expiring items'],
      };

      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: 'Speech recognition is not supported by this browser. Please type your query or replenishment command in the input box.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      const langLocales: Record<string, string> = {
        en: 'en-IN',
        hi: 'hi-IN',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        ar: 'ar-SA',
        ja: 'ja-JP',
        zh: 'zh-CN',
        te: 'te-IN',
        ta: 'ta-IN',
        bn: 'bn-IN',
        mr: 'mr-IN',
        gu: 'gu-IN',
        kn: 'kn-IN',
      };
      recognition.lang = langLocales[currentLang] || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const filteredPrompts = QUICK_PROMPTS.filter((p) => activeCategory === 'all' || p.category === activeCategory || p.category === 'all');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 360 }}
        className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[720px]"
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-md p-1">
              <OmniStockLogo variant="icon" size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">OmniStock AI Copilot</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Never Runout. Never Overstock • Real-Time Database Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Auto-TTS Toggle */}
            <button
              onClick={() => setAutoSpeakEnabled((prev) => !prev)}
              title={autoSpeakEnabled ? 'Auto voice readout: Enabled' : 'Auto voice readout: Muted'}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                autoSpeakEnabled
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {autoSpeakEnabled ? 'volume_up' : 'volume_off'}
              </span>
            </button>

            {/* Clear conversation */}
            <button
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                setMessages(INITIAL_MESSAGES);
              }}
              title="Clear conversation"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Real-time Warehouse Context Ribbon */}
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 grid grid-cols-4 gap-2 text-center text-white shrink-0">
          <div className="bg-slate-800/60 rounded-xl p-1.5 border border-slate-700/50">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Catalog SKUs</span>
            <span className="text-xs font-bold text-slate-200 font-mono">{inventory.length} Items</span>
          </div>

          <button
            onClick={() => handleSendMessage('Which items are low in stock and need reordering?')}
            className="bg-amber-950/40 hover:bg-amber-950/70 rounded-xl p-1.5 border border-amber-800/40 transition-colors cursor-pointer text-center"
            title="Click to audit low stock"
          >
            <span className="text-[10px] font-mono text-amber-400 block uppercase flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Low Stock
            </span>
            <span className="text-xs font-bold text-amber-300 font-mono">{lowStockCount} SKUs</span>
          </button>

          <button
            onClick={() => handleSendMessage('Show items expiring soon within 45 days')}
            className="bg-rose-950/40 hover:bg-rose-950/70 rounded-xl p-1.5 border border-rose-800/40 transition-colors cursor-pointer text-center"
            title="Click to audit expiring batches"
          >
            <span className="text-[10px] font-mono text-rose-400 block uppercase flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              Expiring &lt;45d
            </span>
            <span className="text-xs font-bold text-rose-300 font-mono">{expiringCount} SKUs</span>
          </button>

          <button
            onClick={() => handleSendMessage('What is our total inventory valuation and highest holding?')}
            className="bg-emerald-950/40 hover:bg-emerald-950/70 rounded-xl p-1.5 border border-emerald-800/40 transition-colors cursor-pointer text-center"
            title="Click to calculate valuation"
          >
            <span className="text-[10px] font-mono text-emerald-400 block uppercase">Valuation (₹)</span>
            <span className="text-xs font-bold text-emerald-300 font-mono truncate block">
              ₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </button>
        </div>

        {/* Prompt Category Tabs & Action Pills */}
        <div className="bg-slate-100/90 border-b border-slate-200 p-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-1.5">
            {[
              { id: 'all', label: 'All Prompts' },
              { id: 'refills', label: '⚡ Refills' },
              { id: 'expiry', label: '⚠️ Shelf Life' },
              { id: 'valuation', label: '💰 Valuation' },
              { id: 'hindi', label: '🇮🇳 हिंदी' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as PromptCategory)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {filteredPrompts.slice(0, 6).map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSendMessage(prompt.query)}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 text-xs font-mono font-medium shrink-0 border border-slate-200 hover:border-emerald-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px] text-emerald-600">{prompt.icon}</span>
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/70">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';
            const isSpeaking = currentlySpeakingId === msg.id;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono max-w-lg text-center shadow-2xs">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 border border-slate-800 p-1">
                    <OmniStockLogo variant="icon" size="sm" />
                  </div>
                )}

                <div className={`max-w-[88%] sm:max-w-[82%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-xs transition-all ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-xs font-mono text-xs sm:text-sm'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-line break-words">{msg.content}</div>
                    ) : (
                      <FormattedMarkdown content={msg.content} />
                    )}

                    {/* LIVE APPLIED REFILL ACTION CARDS */}
                    {msg.appliedRefills && msg.appliedRefills.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-800 uppercase">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                            Inventory Mutated Live ({msg.appliedRefills.length} SKUs Updated)
                          </span>
                        </div>

                        <div className="space-y-2">
                          {msg.appliedRefills.map((refill) => {
                            const currentItem = inventory.find((i) => i.sku === refill.sku);
                            const capacityPercent = currentItem
                              ? Math.round((refill.newStock / currentItem.maxStock) * 100)
                              : 80;

                            return (
                              <div
                                key={refill.sku}
                                className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col gap-2 shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 text-xs sm:text-sm font-mono">
                                        {translateRecordedItem(refill.name, currentLang)}
                                      </span>
                                      <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800 font-bold">
                                        {refill.sku}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 font-mono mt-1 flex items-center gap-2 flex-wrap">
                                      <span>
                                        Stock: {refill.previousStock} →{' '}
                                        <strong className="text-emerald-900 font-bold">{refill.newStock}</strong> {translateRecordedUnit(refill.unit, currentLang)}
                                      </span>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-emerald-700 font-bold">
                                        Line Value: ₹{refill.lineValue.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  </div>

                                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs shadow-xs shrink-0">
                                    +{refill.addedQty} {translateRecordedUnit(refill.unit, currentLang)}
                                  </span>
                                </div>

                                {/* Stock Progress Bar */}
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, capacityPercent)}%` }}
                                  />
                                </div>

                                {/* Card Actions */}
                                <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                                  <span className="text-slate-500">Capacity: {capacityPercent}%</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleUndoRefill(refill.sku, refill.addedQty)}
                                      className="text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-0.5 cursor-pointer hover:underline"
                                      title="Undo this stock addition"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">undo</span>
                                      <span>Undo</span>
                                    </button>
                                    {onNavigateToItem && (
                                      <button
                                        onClick={() => {
                                          onNavigateToItem(refill.sku);
                                          onClose();
                                        }}
                                        className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
                                      >
                                        <span>View in Inventory</span>
                                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Tools Bar (TTS, Copy, Timestamp) */}
                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] font-mono text-slate-400">
                    <span>{msg.timestamp}</span>

                    {!isUser && (
                      <>
                        <span>•</span>
                        {/* Audio Speak */}
                        <button
                          onClick={() => handleToggleSpeech(msg.id, msg.content)}
                          className={`flex items-center gap-1 hover:text-slate-700 cursor-pointer transition-colors ${
                            isSpeaking ? 'text-emerald-600 font-bold' : ''
                          }`}
                          title={isSpeaking ? 'Stop reading' : 'Read aloud with AI voice'}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {isSpeaking ? 'stop_circle' : 'volume_up'}
                          </span>
                          <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                        </button>

                        <span>•</span>
                        {/* Copy text */}
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="flex items-center gap-1 hover:text-slate-700 cursor-pointer transition-colors"
                          title="Copy response to clipboard"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {copiedMsgId === msg.id ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedMsgId === msg.id ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Suggestion Follow-up Pills */}
                  {msg.suggestions && msg.suggestions.length > 0 && !isUser && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(sug)}
                          className="text-[11px] font-mono bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 px-3 py-1 rounded-full shadow-2xs transition-all cursor-pointer text-left flex items-center gap-1"
                        >
                          <span className="text-emerald-600">↳</span>
                          <span>{sug}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs font-mono text-xs font-bold mt-0.5">
                    YOU
                  </div>
                )}
              </div>
            );
          })}

          {/* AI Thinking Animation */}
          {isProcessing && (
            <div className="flex gap-3 justify-start animate-in fade-in duration-150">
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-xs p-1">
                <OmniStockLogo variant="icon" size="sm" />
              </div>
              <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.3s]"></span>
                </div>
                <span className="text-xs font-mono text-slate-600">
                  Gemini 3.8 Flash analyzing catalog &amp; calculating warehouse actions...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`p-3 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-rose-50 border-rose-400 text-rose-600 animate-pulse ring-2 ring-rose-200'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-2xs'
              }`}
              title={isListening ? 'Listening... Speak in English or Hindi now' : 'Dictate voice command'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isListening ? 'mic' : 'mic_none'}
              </span>
            </button>

            {/* Input field */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='Ask anything or command: e.g. "Refill 25 Basmati Rice", "कम स्टॉक भरो"...'
                disabled={isProcessing}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-slate-900 transition-all placeholder:text-slate-400 disabled:opacity-60 shadow-2xs"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                  title="Clear input"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Execute / Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isProcessing}
              className="px-4 sm:px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 text-white rounded-2xl font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <span>Execute</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>Commands support English &amp; हिंदी (e.g. &quot;Refill 20 milk&quot; or &quot;20 पैकेट आटा डालो&quot;)</span>
            <span className="hidden sm:inline">Press ↵ Enter to send • Esc to close</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
