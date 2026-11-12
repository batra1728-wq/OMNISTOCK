export type ScreenId = 'signin' | 'dashboard' | 'inventory' | 'reordering' | 'analytics';

export type ThemeMode = 'light' | 'dark';

export type LanguageCode =
  | 'en'   // English
  | 'hi'   // Hindi (हिन्दी)
  | 'bn'   // Bengali (বাংলা)
  | 'te'   // Telugu (తెలుగు)
  | 'mr'   // Marathi (मराठी)
  | 'ta'   // Tamil (தமிழ்)
  | 'ur'   // Urdu (اردو)
  | 'gu'   // Gujarati (ગુજરાતી)
  | 'kn'   // Kannada (ಕನ್ನಡ)
  | 'ml'   // Malayalam (മലയാളം)
  | 'or'   // Odia (ଓଡ଼ିଆ)
  | 'pa'   // Punjabi (ਪੰਜਾਬੀ)
  | 'as'   // Assamese (অসমীয়া)
  | 'mai'  // Maithili (मैथिली)
  | 'sat'  // Santali (ᱥᱟᱱᱛᱟᱲᱤ)
  | 'ks'   // Kashmiri (कॉशुर / کٲشُر)
  | 'ne'   // Nepali (नेपाली)
  | 'kok'  // Konkani (कोंकणी)
  | 'doi'  // Dogri (डोगरी)
  | 'sd'   // Sindhi (سنڌي / सिन्धी)
  | 'brx'  // Bodo (बड़ो)
  | 'sa'   // Sanskrit (संस्कृतम्)
  | 'mni'; // Manipuri (মৈতৈলোন্)

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  region: string;
}

export type UserRole = 'head_chef' | 'kitchen_manager' | 'line_cook' | 'floor_staff' | 'procurement';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  staffId: string;
  role: string;
  avatar: string;
}

export type StockStatus = 'OPTIMAL' | 'LOW' | 'REORDER' | 'FULL' | 'CRITICAL';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: 'Pantry' | 'Dry Goods' | 'Dairy' | 'Spices' | 'Equipment' | 'Refrigerated';
  currentStock: number;
  maxStock: number;
  reorderPoint?: number;
  unit: string;
  price: number;
  expiryDate: string;
  daysToExpiry?: number;
  status: StockStatus;
  imageUrl: string;
  location?: string;
  consumptionVelocity?: string;
  turnoverRate?: string;
  leadTimeDays?: number;
  packagingType?: string;
  isScanned?: boolean;
  scannedAt?: number;
}

export interface ActivityLog {
  id: string;
  activity: string;
  reference: string;
  user: string;
  time: string;
  icon: string;
  type: 'shipment' | 'picklist' | 'dispatch' | 'correction' | 'new_sku' | 'removal';
}

export interface SystemAlert {
  id: string;
  title: string;
  description: string;
  time: string;
  severity: 'critical' | 'warning' | 'success' | 'info';
  icon: string;
  read: boolean;
  actionPrimary?: string;
  actionSecondary?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  supplierEmail?: string;
  supplierPhone?: string;
  itemsSummary: string;
  totalValue: number;
  skuCount: number;
  status: 'pending' | 'approved' | 'sent' | 'processing';
  isAiGenerated: boolean;
  category: string;
  orderDate?: string;
  expectedDelivery?: string;
  paymentTerms?: string;
  items?: Array<{
    sku: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
}

export interface BuyerContact {
  id: string;
  name: string;
  company: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  gstin?: string;
  avatar: string;
  totalOrdersCount: number;
  totalSpent: number;
  notes?: string;
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface DirectChatMessage {
  id: string;
  sender: 'me' | 'buyer';
  text: string;
  timestamp: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerCompany: string;
  buyerPhone: string;
  buyerWhatsapp: string;
  buyerEmail: string;
  buyerAddress: string;
  buyerGstin?: string;
  items: OrderItem[];
  subtotal: number;
  taxRate: number; // percentage (e.g. 18 for 18% GST)
  taxAmount: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  orderDate: string;
  deliveryDate?: string;
  notes?: string;
  chatHistory?: DirectChatMessage[];
}

export interface BatchRecommendation {
  id: string;
  name: string;
  sku: string;
  consumptionChange: number;
  consumptionTrend: 'up' | 'down' | 'flat';
  reorderQty: number;
  unit: string;
  addedToDraft?: boolean;
}

export interface AIAssistantAction {
  type: 'refill' | 'batch_refill' | 'reorder_draft' | 'filter_view';
  sku?: string;
  quantity?: number;
  mode?: 'add' | 'set' | 'fill_to_max';
  items?: Array<{ sku: string; quantity: number; mode: 'add' | 'set' | 'fill_to_max' }>;
  reason?: string;
}

export interface AppliedRefillDetail {
  sku: string;
  name: string;
  previousStock: number;
  newStock: number;
  addedQty: number;
  unit: string;
  status: StockStatus;
  lineValue: number;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  appliedRefills?: AppliedRefillDetail[];
  suggestions?: string[];
  isLoading?: boolean;
}


