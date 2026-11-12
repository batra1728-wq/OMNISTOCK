import { useEffect } from 'react';
import { LanguageCode, LanguageInfo } from '../types';
import { PHRASE_DICTIONARY } from './translationsData';
import {
  translateRecordedItem,
  translateRecordedUnit,
  translateRecordedLocation,
  translateRecordedActivity,
} from './itemTranslations';

export {
  translateRecordedItem,
  translateRecordedUnit,
  translateRecordedLocation,
  translateRecordedActivity,
} from './itemTranslations';

export const INDIAN_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Pan-India / Global' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'North & Central India' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal, Tripura, Assam' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'Andhra Pradesh, Telangana' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Maharashtra, Goa' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu, Puducherry' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'Pan-India, Telangana, UP, J&K' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Gujarat, D&NH, D&D' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Kerala, Lakshadweep' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Odisha' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Punjab, Delhi, Haryana' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'Assam' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', region: 'Bihar, Jharkhand' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', region: 'Jharkhand, Odisha, WB' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कॉशुर / کٲشُر', region: 'Jammu & Kashmir' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', region: 'Sikkim, West Bengal (Darjeeling)' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', region: 'Goa, Karnataka, Maharashtra' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', region: 'Jammu & Kashmir' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي / सिन्धी', region: 'Gujarat, Maharashtra, Rajasthan' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', region: 'Assam, Meghalaya' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', region: 'Classical Language / India' },
  { code: 'mni', name: 'Manipuri (Meitei)', nativeName: 'মৈতৈলোন্', region: 'Manipur' },
];

export type I18nKey =
  | 'app_name'
  | 'nav_dashboard'
  | 'nav_inventory'
  | 'nav_orders'
  | 'nav_reorder'
  | 'nav_reordering'
  | 'nav_analytics'
  | 'nav_alerts'
  | 'btn_scan_barcode'
  | 'btn_add_stock'
  | 'btn_export_report'
  | 'btn_export_pdf'
  | 'btn_export_excel'
  | 'btn_print_invoice'
  | 'btn_print_po'
  | 'export_inventory'
  | 'export_excel'
  | 'export_pdf'
  | 'print_report'
  | 'export_po'
  | 'btn_ai_copilot'
  | 'btn_warehouse_guide'
  | 'theme_light'
  | 'theme_dark'
  | 'theme_toggle'
  | 'lang_select'
  | 'search_placeholder'
  | 'status_optimal'
  | 'status_low'
  | 'status_reorder'
  | 'status_full'
  | 'status_critical'
  | 'tab_all'
  | 'tab_orders'
  | 'tab_buyers'
  | 'buyer_contacts'
  | 'create_order'
  | 'contact_whatsapp'
  | 'direct_chat'
  | 'order_status_pending'
  | 'order_status_confirmed'
  | 'order_status_shipped'
  | 'order_status_delivered'
  | 'order_status_cancelled'
  | 'billing_and_invoice'
  | 'purchase_orders'
  | 'total_inventory_value'
  | 'critical_stock_count'
  | 'monthly_turnover'
  | 'quick_actions'
  | 'recent_activity'
  | 'switch_account'
  | 'sign_out'
  | 'delete_account'
  | 'whatsapp_order_msg';

export const TRANSLATIONS: Record<LanguageCode, Partial<Record<I18nKey, string>>> = {
  en: {
    app_name: 'OmniStock',
    nav_dashboard: 'Dashboard',
    nav_inventory: 'Inventory Catalog',
    nav_orders: 'Customer Orders & Buyers',
    nav_reorder: 'Reordering & POs',
    nav_analytics: 'Analytics & Insights',
    nav_alerts: 'System Alerts',
    btn_scan_barcode: 'Scan Barcode',
    btn_add_stock: 'Add New Stock',
    btn_export_report: 'Export & Print Center',
    btn_export_pdf: 'Print / Download PDF',
    btn_export_excel: 'Download Excel (.xlsx)',
    btn_print_invoice: 'Print Tax Invoice',
    btn_print_po: 'Print Purchase Order',
    btn_ai_copilot: 'AI Copilot',
    btn_warehouse_guide: 'Warehouse Layout',
    theme_light: 'Light Theme',
    theme_dark: 'Dark Theme',
    theme_toggle: 'Toggle Theme',
    lang_select: 'Select Language',
    search_placeholder: 'Search SKU, item name, buyer, PO#...',
    status_optimal: 'Optimal',
    status_low: 'Low Stock',
    status_reorder: 'Reorder Now',
    status_full: 'Full Capacity',
    status_critical: 'Critical Alert',
    tab_all: 'All',
    tab_orders: 'Customer Orders',
    tab_buyers: 'Buyer Contacts',
    buyer_contacts: 'Buyer Contacts Directory',
    create_order: 'New Customer Order',
    contact_whatsapp: 'Chat on WhatsApp',
    direct_chat: 'Direct Buyer Chat',
    order_status_pending: 'Pending',
    order_status_confirmed: 'Confirmed',
    order_status_shipped: 'Dispatched / Shipped',
    order_status_delivered: 'Delivered',
    order_status_cancelled: 'Cancelled',
    billing_and_invoice: 'GST Billing & Invoices',
    purchase_orders: 'Purchase Orders (PO)',
    total_inventory_value: 'Total Stock Valuation',
    critical_stock_count: 'Critical Stock Items',
    monthly_turnover: 'Monthly Turnover Velocity',
    quick_actions: 'Quick Operational Actions',
    recent_activity: 'Recent Warehouse Activity',
    switch_account: 'Switch Operator Account',
    sign_out: 'Sign Out',
    delete_account: 'Delete Account',
    whatsapp_order_msg: 'Hello! Regarding your order on OmniStock:',
  },
  hi: {
    app_name: 'ओम्नीस्टॉक',
    nav_dashboard: 'डैशबोर्ड',
    nav_inventory: 'इन्वेंट्री सूची',
    nav_orders: 'ग्राहक ऑर्डर और खरीदार',
    nav_reorder: 'पुनः ऑर्डर और खरीद आदेश',
    nav_analytics: 'एनालिटिक्स व रुझान',
    nav_alerts: 'सिस्टम अलर्ट',
    btn_scan_barcode: 'बारकोड स्कैन करें',
    btn_add_stock: 'नया स्टॉक जोड़ें',
    btn_export_report: 'एक्सपोर्ट और प्रिंट केंद्र',
    btn_export_pdf: 'प्रिंट / पीडीएफ डाउनलोड',
    btn_export_excel: 'एक्सेल डाउनलोड (.xlsx)',
    btn_print_invoice: 'टैक्स इनवॉइस प्रिंट करें',
    btn_print_po: 'खरीद आदेश (PO) प्रिंट करें',
    btn_ai_copilot: 'एआई सहायक',
    btn_warehouse_guide: 'गोदाम लेआउट गाइड',
    theme_light: 'लाइट थीम (सफेद)',
    theme_dark: 'डार्क थीम (काला)',
    theme_toggle: 'थीम बदलें',
    lang_select: 'भाषा चुनें',
    search_placeholder: 'एसकेयू, वस्तु नाम, खरीदार, पीओ खोजें...',
    status_optimal: 'संतोषजनक',
    status_low: 'कम स्टॉक',
    status_reorder: 'पुनः ऑर्डर आवश्यक',
    status_full: 'पूर्ण क्षमता',
    status_critical: 'अति-गंभीर स्थिति',
    tab_all: 'सभी',
    tab_orders: 'ग्राहक ऑर्डर',
    tab_buyers: 'खरीदार संपर्क',
    buyer_contacts: 'खरीदार संपर्क निर्देशिका',
    create_order: 'नया ग्राहक ऑर्डर',
    contact_whatsapp: 'व्हाट्सएप पर चैट करें',
    direct_chat: 'सीधी चैट',
    order_status_pending: 'लंबित',
    order_status_confirmed: 'पुष्टीकृत',
    order_status_shipped: 'भेज दिया गया (Shipped)',
    order_status_delivered: 'वितरित (Delivered)',
    order_status_cancelled: 'रद्द',
    billing_and_invoice: 'जीएसटी बिलिंग एवं इनवॉइस',
    purchase_orders: 'खरीद आदेश (PO)',
    total_inventory_value: 'कुल स्टॉक मूल्यांकन',
    critical_stock_count: 'गंभीर वस्तुएं',
    monthly_turnover: 'मासिक टर्नओवर',
    quick_actions: 'त्वरित संचालन क्रियाएं',
    recent_activity: 'हाल की गोदाम गतिविधि',
    switch_account: 'खाता बदलें',
    sign_out: 'लॉग आउट',
    delete_account: 'खाता हटाएं',
    whatsapp_order_msg: 'नमस्ते! ओम्नीस्टॉक पर आपके ऑर्डर के संबंध में:',
  },
  bn: {
    app_name: 'ওমনিস্টক',
    nav_dashboard: 'ড্যাশবোর্ড',
    nav_inventory: 'ইনভেন্টরি ক্যাটালগ',
    nav_orders: 'গ্রাহকের অর্ডার ও ক্রেতা',
    nav_reorder: 'পুনরায় অর্ডার ও পিও',
    nav_analytics: 'বিশ্লেষণ ও রিপোর্ট',
    nav_alerts: 'সতর্কবার্তা',
    btn_scan_barcode: 'বারকোড স্ক্যান করুন',
    btn_add_stock: 'নতুন স্টক যোগ করুন',
    btn_export_report: 'এক্সপোর্ট ও প্রিন্ট কেন্দ্র',
    btn_export_pdf: 'পিডিএফ প্রিন্ট/ডাউনলোড',
    btn_export_excel: 'এক্সেল ডাউনলোড (.xlsx)',
    btn_print_invoice: 'ট্যাক্স ইনভয়েস প্রিন্ট',
    btn_print_po: 'ক্রয় আদেশ (PO) প্রিন্ট',
    btn_ai_copilot: 'এআই কোপাইলট',
    btn_warehouse_guide: 'গুদাম গাইড',
    theme_light: 'লাইট থিম',
    theme_dark: 'ডার্ক থিম',
    theme_toggle: 'থিম পরিবর্তন',
    lang_select: 'ভাষা নির্বাচন করুন',
    search_placeholder: 'এসকেইউ, আইটেম বা ক্রেতা খুঁজুন...',
    status_optimal: 'অনুকূল',
    status_low: 'স্বল্প স্টক',
    status_reorder: 'পুনরায় অর্ডার করুন',
    status_full: 'সম্পূর্ণ',
    status_critical: 'জরুরী সতর্কতা',
    tab_all: 'সকল',
    tab_orders: 'অর্ডারসমূহ',
    tab_buyers: 'ক্রেতার পরিচিতি',
    buyer_contacts: 'ক্রেতা যোগাযোগ তালিকা',
    create_order: 'নতুন অর্ডার তৈরি করুন',
    contact_whatsapp: 'হোয়াটসঅ্যাপে চ্যাট করুন',
    direct_chat: 'সরাসরি চ্যাট',
    order_status_pending: 'অপেক্ষমাণ',
    order_status_confirmed: 'নিশ্চিত',
    order_status_shipped: 'প্রেরিত',
    order_status_delivered: 'পৌঁছে গেছে',
    order_status_cancelled: 'বাতিল',
    billing_and_invoice: 'জিএসটি বিলিং ও ইনভয়েস',
    purchase_orders: 'ক্রয় আদেশ',
    total_inventory_value: 'মোট স্টক মূল্য',
    critical_stock_count: 'সংকটপূর্ণ পণ্য',
    monthly_turnover: 'মাসিক লেনদেন',
    quick_actions: 'দ্রুত পদক্ষেপ',
    recent_activity: 'সাম্প্রতিক কার্যক্রম',
    switch_account: 'অ্যাকাউন্ট পরিবর্তন',
    sign_out: 'লগআউট',
    delete_account: 'অ্যাকাউন্ট মুছুন',
    whatsapp_order_msg: 'নমস্কার! ওমনিস্টকে আপনার অর্ডার সংক্রান্ত বার্তা:',
  },
  te: {
    app_name: 'ఓమ్నిస్టాక్',
    nav_dashboard: 'డాష్‌బోర్డ్',
    nav_inventory: 'ఇన్వెంటరీ జాబితా',
    nav_orders: 'కస్టమర్ ఆర్డర్‌లు & కొనుగోలుదారులు',
    nav_reorder: 'రీ-ఆర్డరింగ్ & కొనుగోలు ఆర్డర్‌లు',
    nav_analytics: 'విశ్లేషణలు',
    nav_alerts: 'హెచ్చరికలు',
    btn_scan_barcode: 'బార్‌కోడ్ స్కాన్ చేయండి',
    btn_add_stock: 'కొత్త స్టాక్ జోడించండి',
    btn_export_report: 'ఎగుమతి & ప్రింట్ సెంటర్',
    btn_export_pdf: 'పీడీఎఫ్ డౌన్‌లోడ్ / ప్రింట్',
    btn_export_excel: 'ఎక్సెల్ డౌన్‌లోడ్ (.xlsx)',
    btn_print_invoice: 'టాక్స్ ఇన్వాయిస్ ప్రింట్',
    btn_print_po: 'కొనుగోలు ఆర్డర్ ప్రింట్',
    btn_ai_copilot: 'ఏఐ అసిస్టెంట్',
    btn_warehouse_guide: 'వేర్‌హౌస్ గైడ్',
    theme_light: 'లైట్ థీమ్ (తెలుపు)',
    theme_dark: 'డార్క్ థీమ్ (నలుపు)',
    theme_toggle: 'థీమ్ మార్చండి',
    lang_select: 'భాషను ఎంచుకోండి',
    search_placeholder: 'SKU, వస్తువు, కొనుగోలుదారుని వెతకండి...',
    status_optimal: 'సరైనది',
    status_low: 'తక్కువ స్టాక్',
    status_reorder: 'మళ్లీ ఆర్డర్ చేయండి',
    status_full: 'పూర్తి నిల్వ',
    status_critical: 'క్లిష్టమైన హెచ్చరిక',
    tab_all: 'అన్నీ',
    tab_orders: 'ఆర్డర్‌లు',
    tab_buyers: 'కొనుగోలుదారుల కాంటాక్ట్‌లు',
    buyer_contacts: 'కొనుగోలుదారుల డైరెక్టరీ',
    create_order: 'కొత్త ఆర్డర్',
    contact_whatsapp: 'వాట్సాప్‌లో చాట్ చేయండి',
    direct_chat: 'ప్రత్యక్ష చాట్',
    order_status_pending: 'పెండింగ్',
    order_status_confirmed: 'ధృవీకరించబడింది',
    order_status_shipped: 'రవాణా చేయబడింది',
    order_status_delivered: 'డెలివరీ చేయబడింది',
    order_status_cancelled: 'రద్దు చేయబడింది',
    billing_and_invoice: 'జీఎస్టీ బిల్లింగ్ & ఇన్వాయిస్‌లు',
    purchase_orders: 'కొనుగోలు ఆర్డర్‌లు (PO)',
    total_inventory_value: 'మొత్తం ఇన్వెంటరీ విలువ',
    critical_stock_count: 'క్లిష్టమైన స్టాక్',
    monthly_turnover: 'నెలవారీ టర్నోవర్',
    quick_actions: 'త్వరిత చర్యలు',
    recent_activity: 'ఇటీవలి వేర్‌హౌస్ కార్యాచరణ',
    switch_account: 'ఖాతా మార్చండి',
    sign_out: 'సైన్ అవుట్',
    delete_account: 'ఖాతాను తొలగించండి',
    whatsapp_order_msg: 'నమస్కారం! ఓమ్నిస్టాక్‌లో మీ ఆర్డర్ వివరాలు:',
  },
  mr: {
    app_name: 'ओम्नीस्टॉक',
    nav_dashboard: 'डॅशबोर्ड',
    nav_inventory: 'इन्व्हेंटरी यादी',
    nav_orders: 'ग्राहक ऑर्डर्स व खरेदीदार',
    nav_reorder: 'पुनर्नोंदणी व खरेदी आदेश',
    nav_analytics: 'अनालिटिक्स व अहवाल',
    nav_alerts: 'सूचना व इशारे',
    btn_scan_barcode: 'बारकोड स्कॅन करा',
    btn_add_stock: 'नवीन स्टॉक जोडा',
    btn_export_report: 'निर्यात व मुद्रण केंद्र',
    btn_export_pdf: 'प्रिंट / पीडीएफ डाऊनलोड',
    btn_export_excel: 'एक्सेल डाऊनलोड (.xlsx)',
    btn_print_invoice: 'टॅक्स इनव्हॉइस प्रिंट करा',
    btn_print_po: 'खरेदी आदेश (PO) प्रिंट करा',
    btn_ai_copilot: 'एआय सहाय्यक',
    btn_warehouse_guide: 'वेअरहाऊस लेआउट',
    theme_light: 'लाईट थीम (पांढरा)',
    theme_dark: 'डार्क थीम (काळा)',
    theme_toggle: 'थीम बदला',
    lang_select: 'भाषा निवडा',
    search_placeholder: 'SKU, नाव किंवा खरेदीदार शोधा...',
    status_optimal: 'योग्य प्रमाण',
    status_low: 'कमी साठा',
    status_reorder: 'पुन्हा ऑर्डर द्या',
    status_full: 'पूर्ण क्षमता',
    status_critical: 'अत्यंत गंभीर',
    tab_all: 'सर्व',
    tab_orders: 'ग्राहक ऑर्डर्स',
    tab_buyers: 'खरेदीदार संपर्क',
    buyer_contacts: 'खरेदीदार डिरेक्टरी',
    create_order: 'नवीन ग्राहक ऑर्डर',
    contact_whatsapp: 'व्हॉट्सॲपवर चॅट करा',
    direct_chat: 'थेट चॅट',
    order_status_pending: 'प्रलंबित',
    order_status_confirmed: 'पुष्टीकृत',
    order_status_shipped: 'पाठवले (Shipped)',
    order_status_delivered: 'पोहोचवले (Delivered)',
    order_status_cancelled: 'रद्द',
    billing_and_invoice: 'जीएसटी बिलिंग व इनव्हॉइस',
    purchase_orders: 'खरेदी आदेश (PO)',
    total_inventory_value: 'एकूण स्टॉक मूल्य',
    critical_stock_count: 'गंभीर वस्तू',
    monthly_turnover: 'मासिक उलाढाल',
    quick_actions: 'जलद कृती',
    recent_activity: 'गोदाम हालचाली',
    switch_account: 'खाते बदला',
    sign_out: 'साइन आउट',
    delete_account: 'खाते हटवा',
    whatsapp_order_msg: 'नमस्कार! ओम्नीस्टॉकवरील आपल्या ऑर्डर संदर्भात माहिती:',
  },
  ta: {
    app_name: 'ஆம்னிஸ்டாக்',
    nav_dashboard: 'டாஷ்போர்டு',
    nav_inventory: 'சரக்கு இருப்பு பட்டியல்',
    nav_orders: 'வாடிக்கையாளர் ஆர்டர்கள் & வாங்குவோர்',
    nav_reorder: 'மறுஆர்டர் & கொள்முதல் ஆர்டர்கள்',
    nav_analytics: 'பகுப்பாய்வு',
    nav_alerts: 'அறிவிப்புகள்',
    btn_scan_barcode: 'பார்கோடு ஸ்கேன் செய்',
    btn_add_stock: 'புதிய சரக்கு சேர்க்க',
    btn_export_report: 'ஏற்றுமதி மற்றும் அச்சு மையம்',
    btn_export_pdf: 'PDF அச்சிடு / பதிவிறக்கு',
    btn_export_excel: 'எக்செல் பதிவிறக்கு (.xlsx)',
    btn_print_invoice: 'வரி விலைப்பட்டியல் அச்சிடு',
    btn_print_po: 'கொள்முதல் ஆர்டர் (PO) அச்சிடு',
    btn_ai_copilot: 'AI உதவியாளர்',
    btn_warehouse_guide: 'கிடங்கு வழிகாட்டி',
    theme_light: 'வெள்ளை தீம் (Light)',
    theme_dark: 'கருப்பு தீம் (Dark)',
    theme_toggle: 'தீம் மாற்று',
    lang_select: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    search_placeholder: 'SKU, பொருள் அல்லது வாங்குபவரைத் தேடுங்கள்...',
    status_optimal: 'ஏற்ற நிலை',
    status_low: 'குறைந்த இருப்பு',
    status_reorder: 'மீண்டும் ஆர்டர் செய்க',
    status_full: 'முழு இருப்பு',
    status_critical: 'முக்கிய எச்சரிக்கை',
    tab_all: 'அனைத்தும்',
    tab_orders: 'ஆர்டர்கள்',
    tab_buyers: 'வாங்குவோர் தொடர்புகள்',
    buyer_contacts: 'வாங்குவோர் பட்டியல்',
    create_order: 'புதிய ஆர்டர்',
    contact_whatsapp: 'வாட்ஸ்அப்பில் அரட்டை செய்க',
    direct_chat: 'நேரடி அரட்டை',
    order_status_pending: 'நிலுவையில்',
    order_status_confirmed: 'உறுதி செய்யப்பட்டது',
    order_status_shipped: 'அனுப்பப்பட்டது',
    order_status_delivered: 'வழங்கப்பட்டது',
    order_status_cancelled: 'ரத்து செய்யப்பட்டது',
    billing_and_invoice: 'ஜிஎஸ்டி பில்லிங் மற்றும் இன்வாய்ஸ்',
    purchase_orders: 'கொள்முதல் ஆர்டர்கள்',
    total_inventory_value: 'மொத்த சரக்கு மதிப்பு',
    critical_stock_count: 'முக்கியமான இருப்பு',
    monthly_turnover: 'மாதாந்திர விற்றுமுதல்',
    quick_actions: 'விரைவு நடவடிக்கைகள்',
    recent_activity: 'சமீபத்திய கிடங்கு நிகழ்வுகள்',
    switch_account: 'கணக்கை மாற்று',
    sign_out: 'வெளியேறு',
    delete_account: 'கணக்கை நீக்கு',
    whatsapp_order_msg: 'வணக்கம்! ஆம்னிஸ்டாக்கில் உங்கள் ஆர்டர் குறித்த தகவல்:',
  },
  ur: {
    app_name: 'اومنی اسٹاک',
    nav_dashboard: 'ڈیش بورڈ',
    nav_inventory: 'انونٹری فہرست',
    nav_orders: 'گاہک کے آرڈرز اور خریدار',
    nav_reorder: 'دوبارہ آرڈر اور خریداری آرڈرز',
    nav_analytics: 'تجزیات اور رپورٹس',
    nav_alerts: 'انتباہات',
    btn_scan_barcode: 'بارکوڈ اسکین کریں',
    btn_add_stock: 'نیا اسٹاک شامل کریں',
    btn_export_report: 'ایکسپورٹ اور پرنٹ مرکز',
    btn_export_pdf: 'پرنٹ / پی ڈی ایف ڈاؤن لوڈ',
    btn_export_excel: 'ایکسل ڈاؤن لوڈ (.xlsx)',
    btn_print_invoice: 'ٹیکس انوائس پرنٹ کریں',
    btn_print_po: 'پرچیز آرڈر (PO) پرنٹ کریں',
    btn_ai_copilot: 'اے آئی معاون',
    btn_warehouse_guide: 'گودام گائیڈ',
    theme_light: 'لائٹ تھیم (سفید)',
    theme_dark: 'ڈارک تھیم (سیاہ)',
    theme_toggle: 'تھیم تبدیل کریں',
    lang_select: 'زبان منتخب کریں',
    search_placeholder: 'ایس کے یو، شے یا خریدار تلاش کریں...',
    status_optimal: 'بہترین',
    status_low: 'کم اسٹاک',
    status_reorder: 'دوبارہ آرڈر کریں',
    status_full: 'مکمل گنجائش',
    status_critical: 'انتہائی نازک',
    tab_all: 'سب',
    tab_orders: 'گاہک آرڈرز',
    tab_buyers: 'خریداروں کے رابطے',
    buyer_contacts: 'خریداروں کی ڈائریکٹری',
    create_order: 'نیا آرڈر بنائیں',
    contact_whatsapp: 'واٹس ایپ پر رابطہ کریں',
    direct_chat: 'براہ راست چیٹ',
    order_status_pending: 'زیر التواء',
    order_status_confirmed: 'تصدیق شدہ',
    order_status_shipped: 'روانہ کر دیا گیا',
    order_status_delivered: 'ڈیلیور ہو گیا',
    order_status_cancelled: 'منسوخ',
    billing_and_invoice: 'جی ایس ٹی بلنگ اور انوائس',
    purchase_orders: 'خریداری کے آرڈرز',
    total_inventory_value: 'کل انونٹری مالیت',
    critical_stock_count: 'نازک اسٹاک اشیاء',
    monthly_turnover: 'ماہانہ ٹرن اوور',
    quick_actions: 'فوری اقدامات',
    recent_activity: 'حالیہ گودام کی سرگرمی',
    switch_account: 'اکاؤنٹ تبدیل کریں',
    sign_out: 'سائن آؤٹ',
    delete_account: 'اکاؤنٹ حذف کریں',
    whatsapp_order_msg: 'ہیلو! اومنی اسٹاک پر آپ کے آرڈر کے بارے میں:',
  },
  gu: {
    app_name: 'ઓમ્નીસ્ટોક',
    nav_dashboard: 'ડેશબોર્ડ',
    nav_inventory: 'ઇન્વેન્ટરી યાદી',
    nav_orders: 'ગ્રાહક ઓર્ડર અને ગ્રાહકો',
    nav_reorder: 'રી-ઓર્ડર અને ખરીદી ઓર્ડર',
    nav_analytics: 'એનાલિટિક્સ',
    nav_alerts: 'સિસ્ટમ ચેતવણીઓ',
    btn_scan_barcode: 'બારકોડ સ્કેન કરો',
    btn_add_stock: 'નવો સ્ટોક ઉમેરો',
    btn_export_report: 'નિકાસ અને પ્રિન્ટ સેન્ટર',
    btn_export_pdf: 'PDF પ્રિન્ટ / ડાઉનલોડ',
    btn_export_excel: 'એક્સેલ ડાઉનલોડ (.xlsx)',
    btn_print_invoice: 'ટેક્સ ઇનવોઇસ પ્રિન્ટ કરો',
    btn_print_po: 'ખરીદી ઓર્ડર (PO) પ્રિન્ટ કરો',
    btn_ai_copilot: 'AI સહાયક',
    btn_warehouse_guide: 'ગોદામ માર્ગદર્શિકા',
    theme_light: 'લાઇટ થીમ (સફેદ)',
    theme_dark: 'ડાર્ક થીમ (કાળો)',
    theme_toggle: 'થીમ બદલો',
    lang_select: 'ભાષા પસંદ કરો',
    search_placeholder: 'SKU, વસ્તુ અથવા ગ્રાહક શોધો...',
    status_optimal: 'યોગ્ય',
    status_low: 'ઓછો સ્ટોક',
    status_reorder: 'ફરીથી ઓર્ડર કરો',
    status_full: 'સંપૂર્ણ ક્ષમતા',
    status_critical: 'ગંભીર ચેતવણી',
    tab_all: 'બધા',
    tab_orders: 'ગ્રાહક ઓર્ડર્સ',
    tab_buyers: 'ગ્રાહક સંપર્કો',
    buyer_contacts: 'ગ્રાહક સંપર્ક નિર્દેશિકા',
    create_order: 'નવો ઓર્ડર બનાવો',
    contact_whatsapp: 'વોટ્સએપ પર ચેટ કરો',
    direct_chat: 'સીધી ચેટ',
    order_status_pending: 'બાકી',
    order_status_confirmed: 'પુષ્ટિ થયેલ',
    order_status_shipped: 'મોકલેલ',
    order_status_delivered: 'ડિલિવર થયેલ',
    order_status_cancelled: 'રદ કરેલ',
    billing_and_invoice: 'જીએસટી બિલિંગ અને ઇનવોઇસ',
    purchase_orders: 'ખરીદી ઓર્ડર (PO)',
    total_inventory_value: 'કુલ સ્ટોક મૂલ્ય',
    critical_stock_count: 'ગંભીર સ્ટોક',
    monthly_turnover: 'માસિક ટર્નઓવર',
    quick_actions: 'ઝડપી ક્રિયાઓ',
    recent_activity: 'તાજેતરની પ્રવૃત્તિ',
    switch_account: 'એકાઉન્ટ બદલો',
    sign_out: 'સાઇન આઉટ',
    delete_account: 'એકાઉન્ટ કાઢી નાખો',
    whatsapp_order_msg: 'નમસ્તે! ઓમ્નીસ્ટોક પર તમારા ઓર્ડર અંગેની માહિતી:',
  },
  kn: {
    app_name: 'ಓಮ್ನಿಸ್ಟಾಕ್',
    nav_dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    nav_inventory: 'ದಾಸ್ತಾನು ಪಟ್ಟಿ',
    nav_orders: 'ಗ್ರಾಹಕರ ಆದೇಶಗಳು & ಖರೀದಿದಾರರು',
    nav_reorder: 'ಮರು ಆದೇಶ & ಖರೀದಿ ಆದೇಶಗಳು',
    nav_analytics: 'ವಿಶ್ಲೇಷಣೆ',
    nav_alerts: 'ಎಚ್ಚರಿಕೆಗಳು',
    btn_scan_barcode: 'ಬಾರ್‌ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    btn_add_stock: 'ಹೊಸ ದಾಸ್ತಾನು ಸೇರಿಸಿ',
    btn_export_report: 'ರಫ್ತು ಮತ್ತು ಮುದ್ರಣ ಕೇಂದ್ರ',
    btn_export_pdf: 'PDF ಮುದ್ರಿಸಿ / ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
    btn_export_excel: 'ಎಕ್ಸೆಲ್ ಡೌನ್‌ಲೋಡ್ (.xlsx)',
    btn_print_invoice: 'ತೆರಿಗೆ ಸರಕುಪಟ್ಟಿ ಮುದ್ರಿಸಿ',
    btn_print_po: 'ಖರೀದಿ ಆದೇಶ ಮುದ್ರಿಸಿ',
    btn_ai_copilot: 'AI ಸಹಾಯಕ',
    btn_warehouse_guide: 'ಗೋದಾಮು ಮಾರ್ಗದರ್ಶಿ',
    theme_light: 'ಲೈಟ್ ಥೀಮ್ (ಬಿಳಿ)',
    theme_dark: 'ಡಾರ್ಕ್ ಥೀಮ್ (ಕಪ್ಪು)',
    theme_toggle: 'ಥೀಮ್ ಬದಲಾಯಿಸಿ',
    lang_select: 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ',
    search_placeholder: 'SKU, ಐಟಂ ಅಥವಾ ಖರೀದಿದಾರರನ್ನು ಹುಡುಕಿ...',
    status_optimal: 'ಸೂಕ್ತ',
    status_low: 'ಕಡಿಮೆ ದಾಸ್ತಾನು',
    status_reorder: 'ಮರು ಆದೇಶಿಸಿ',
    status_full: 'ಪೂರ್ಣ ಸಾಮರ್ಥ್ಯ',
    status_critical: 'ನಿರ್ಣಾಯಕ ಎಚ್ಚರಿಕೆ',
    tab_all: 'ಎಲ್ಲಾ',
    tab_orders: 'ಆದೇಶಗಳು',
    tab_buyers: 'ಖರೀದಿದಾರರ ಸಂಪರ್ಕಗಳು',
    buyer_contacts: 'ಖರೀದಿದಾರರ ಡೈರೆಕ್ಟರಿ',
    create_order: 'ಹೊಸ ಆದೇಶ',
    contact_whatsapp: 'ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಚಾಟ್ ಮಾಡಿ',
    direct_chat: 'ನೇರ ಚಾಟ್',
    order_status_pending: 'ಬಾಕಿ ಉಳಿದಿದೆ',
    order_status_confirmed: 'ದೃಢೀಕರಿಸಲಾಗಿದೆ',
    order_status_shipped: 'ರವಾನಿಸಲಾಗಿದೆ',
    order_status_delivered: 'ತಲುಪಿಸಲಾಗಿದೆ',
    order_status_cancelled: 'ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ',
    billing_and_invoice: 'ಜಿಎಸ್‌ಟಿ ಬಿಲ್ಲಿಂಗ್ ಮತ್ತು ಇನ್‌ವಾಯ್ಸ್‌ಗಳು',
    purchase_orders: 'ಖರೀದಿ ಆದೇಶಗಳು (PO)',
    total_inventory_value: 'ಒಟ್ಟು ದಾಸ್ತಾನು ಮೌಲ್ಯ',
    critical_stock_count: 'ನಿರ್ಣಾಯಕ ದಾಸ್ತಾನು',
    monthly_turnover: 'ಮಾಸಿಕ ವಹಿವಾಟು',
    quick_actions: 'ತ್ವರಿತ ಕ್ರಿಯೆಗಳು',
    recent_activity: 'ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ',
    switch_account: 'ಖಾತೆ ಬದಲಿಸಿ',
    sign_out: 'ಸೈನ್ ಔಟ್',
    delete_account: 'ಖಾತೆ ಅಳಿಸಿ',
    whatsapp_order_msg: 'ನಮಸ್ಕಾರ! ಓಮ್ನಿಸ್ಟಾಕ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಆದೇಶದ ವಿವರಗಳು:',
  },
  ml: {
    app_name: 'ഓംനിസ്റ്റോക്ക്',
    nav_dashboard: 'ഡാഷ്‌ബോർഡ്',
    nav_inventory: 'ഇൻവെന്ററി പട്ടിക',
    nav_orders: 'ഉപഭോക്തൃ ഓർഡറുകൾ & വാങ്ങുന്നവർ',
    nav_reorder: 'റീ-ഓർഡർ & പർച്ചേസ് ഓർഡറുകൾ',
    nav_analytics: 'അനലിറ്റിക്സ്',
    nav_alerts: 'അറിയിപ്പുകൾ',
    btn_scan_barcode: 'ബാർകോഡ് സ്കാൻ ചെയ്യുക',
    btn_add_stock: 'പുതിയ സ്റ്റോക്ക് ചേർക്കുക',
    btn_export_report: 'എക്സ്പോർട്ട് & പ്രിന്റ് സെന്റർ',
    btn_export_pdf: 'PDF പ്രിന്റ് / ഡൗൺലോഡ്',
    btn_export_excel: 'എക്സൽ ഡൗൺലോഡ് (.xlsx)',
    btn_print_invoice: 'നികുതി ഇൻവോയ്സ് പ്രിന്റ് ചെയ്യുക',
    btn_print_po: 'പർച്ചേസ് ഓർഡർ പ്രിന്റ് ചെയ്യുക',
    btn_ai_copilot: 'AI കോപൈലറ്റ്',
    btn_warehouse_guide: 'വെയർഹൗസ് ഗൈഡ്',
    theme_light: 'ലൈറ്റ് തീം (വെള്ള)',
    theme_dark: 'ഡാർക്ക് തീം (കറുപ്പ്)',
    theme_toggle: 'തീം മാറ്റുക',
    lang_select: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
    search_placeholder: 'SKU, ഇനം അല്ലെങ്കിൽ വാങ്ങുന്നയാളെ തിരയുക...',
    status_optimal: 'ആവശ്യാനുസരണം',
    status_low: 'കുറഞ്ഞ സ്റ്റോക്ക്',
    status_reorder: 'റീ-ഓർഡർ ചെയ്യുക',
    status_full: 'പൂർണ്ണം',
    status_critical: 'അടിയന്തിര മുന്നറിയിപ്പ്',
    tab_all: 'എല്ലാം',
    tab_orders: 'ഓർഡറുകൾ',
    tab_buyers: 'വാങ്ങുന്നവരുടെ കോൺടാക്റ്റുകൾ',
    buyer_contacts: 'വാങ്ങുന്നവരുടെ പട്ടിക',
    create_order: 'പുതിയ ഓർഡർ',
    contact_whatsapp: 'വാട്ട്‌സ്ആപ്പിൽ ചാറ്റ് ചെയ്യുക',
    direct_chat: 'നേരിട്ടുള്ള ചാറ്റ്',
    order_status_pending: 'തീർപ്പുകൽപ്പിക്കാത്തത്',
    order_status_confirmed: 'സ്ഥിരീകരിച്ചു',
    order_status_shipped: 'അയച്ചു (Shipped)',
    order_status_delivered: 'ഡെലിവർ ചെയ്തു',
    order_status_cancelled: 'റദ്ദാക്കി',
    billing_and_invoice: 'ജിഎസ്ടി ബില്ലിംഗും ഇൻവോയ്സുകളും',
    purchase_orders: 'പർച്ചേസ് ഓർഡറുകൾ (PO)',
    total_inventory_value: 'ആകെ സ്റ്റോക്ക് മൂല്യം',
    critical_stock_count: 'നിർണായക ഇനങ്ങൾ',
    monthly_turnover: 'പ്രതിമാസ വിറ്റുവരവ്',
    quick_actions: 'ദ്രുത നടപടികൾ',
    recent_activity: 'സമീപകാല പ്രവർത്തനങ്ങൾ',
    switch_account: 'അക്കൗണ്ട് മാറ്റുക',
    sign_out: 'സൈൻ ഔട്ട്',
    delete_account: 'അക്കൗണ്ട് ഇല്ലാതാക്കുക',
    whatsapp_order_msg: 'ഹലോ! ഓംനിസ്റ്റോക്കിലെ നിങ്ങളുടെ ഓർഡർ സംബന്ധിച്ച്:',
  },
  pa: {
    app_name: 'ਓਮਨੀਸਟਾਕ',
    nav_dashboard: 'ਡੈਸ਼ਬੋਰਡ',
    nav_inventory: 'ਇਨਵੈਂਟਰੀ ਸੂਚੀ',
    nav_orders: 'ਗਾਹਕ ਆਰਡਰ ਅਤੇ ਖਰੀਦਦਾਰ',
    nav_reorder: 'ਮੁੜ-ਆਰਡਰ ਅਤੇ ਖਰੀਦ ਆਰਡਰ',
    nav_analytics: 'ਵਿਸ਼ਲੇਸ਼ਣ',
    nav_alerts: 'ਚਿਤਾਵਨੀਆਂ',
    btn_scan_barcode: 'ਬਾਰਕੋਡ ਸਕੈਨ ਕਰੋ',
    btn_add_stock: 'ਨਵਾਂ ਸਟਾਕ ਸ਼ਾਮਲ ਕਰੋ',
    btn_export_report: 'ਐਕਸਪੋਰਟ ਅਤੇ ਪ੍ਰਿੰਟ ਕੇਂਦਰ',
    btn_export_pdf: 'ਪੀਡੀਐਫ ਪ੍ਰਿੰਟ / ਡਾਊਨਲੋਡ',
    btn_export_excel: 'ਐਕਸਲ ਡਾਊਨਲੋਡ (.xlsx)',
    btn_print_invoice: 'ਟੈਕਸ ਇਨਵੌਇਸ ਪ੍ਰਿੰਟ ਕਰੋ',
    btn_print_po: 'ਖਰੀਦ ਆਰਡਰ (PO) ਪ੍ਰਿੰਟ ਕਰੋ',
    btn_ai_copilot: 'AI ਸਹਾਇਕ',
    btn_warehouse_guide: 'ਵੇਅਰਹਾਊਸ ਗਾਈਡ',
    theme_light: 'ਲਾਈਟ ਥੀਮ (ਚਿੱਟਾ)',
    theme_dark: 'ਡਾਰਕ ਥੀਮ (ਕਾਲਾ)',
    theme_toggle: 'ਥੀਮ ਬਦਲੋ',
    lang_select: 'ਭਾਸ਼ਾ ਚੁਣੋ',
    search_placeholder: 'SKU, ਆਈਟਮ ਜਾਂ ਖਰੀਦਦਾਰ ਖੋਜੋ...',
    status_optimal: 'ਸੰਤੁਸ਼ਟੀਜਨਕ',
    status_low: 'ਘੱਟ ਸਟਾਕ',
    status_reorder: 'ਦੁਬਾਰਾ ਆਰਡਰ ਕਰੋ',
    status_full: 'ਪੂਰਾ ਸਟਾਕ',
    status_critical: 'ਨਾਜ਼ੁਕ ਸਥਿਤੀ',
    tab_all: 'ਸਾਰੇ',
    tab_orders: 'ਆਰਡਰ',
    tab_buyers: 'ਖਰੀਦਦਾਰ ਸੰਪਰਕ',
    buyer_contacts: 'ਖਰੀਦਦਾਰ ਡਾਇਰੈਕਟਰੀ',
    create_order: 'ਨਵਾਂ ਆਰਡਰ',
    contact_whatsapp: 'ਵਟਸਐਪ ਤੇ ਗੱਲਬਾਤ ਕਰੋ',
    direct_chat: 'ਸਿੱਧੀ ਗੱਲਬਾਤ',
    order_status_pending: 'ਬਕਾਇਆ',
    order_status_confirmed: 'ਪੁਸ਼ਟੀ ਹੋਈ',
    order_status_shipped: 'ਭੇਜਿਆ ਗਿਆ',
    order_status_delivered: 'ਪਹੁੰਚਾਇਆ ਗਿਆ',
    order_status_cancelled: 'ਰੱਦ ਕੀਤਾ ਗਿਆ',
    billing_and_invoice: 'ਜੀਐਸਟੀ ਬਿਲਿੰਗ ਅਤੇ ਇਨਵੌਇਸ',
    purchase_orders: 'ਖਰੀਦ ਆਰਡਰ',
    total_inventory_value: 'ਕੁੱਲ ਸਟਾਕ ਮੁੱਲ',
    critical_stock_count: 'ਨਾਜ਼ੁਕ ਵਸਤੂਆਂ',
    monthly_turnover: 'ਮਾਸਿਕ ਟਰਨਓਵਰ',
    quick_actions: 'ਤੇਜ਼ ਕਾਰਵਾਈਆਂ',
    recent_activity: 'ਹਾਲੀਆ ਗਤੀਵਿਧੀ',
    switch_account: 'ਖਾਤਾ ਬਦਲੋ',
    sign_out: 'ਸਾਈਨ ਆਊਟ',
    delete_account: 'ਖਾਤਾ ਮਿਟਾਓ',
    whatsapp_order_msg: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਓਮਨੀਸਟਾਕ ਤੇ ਤੁਹਾਡੇ ਆਰਡਰ ਬਾਰੇ ਜਾਣਕਾਰੀ:',
  },
  or: {
    app_name: 'ଓମ୍ନିଷ୍ଟକ୍',
    nav_dashboard: 'ଡ୍ୟାସବୋର୍ଡ',
    nav_inventory: 'ଇନଭେଣ୍ଟରୀ ତାଲିକା',
    nav_orders: 'ଗ୍ରାହକ ଅର୍ଡର ଏବଂ କ୍ରେତା',
    nav_reorder: 'ପୁନଃ ଅର୍ଡର ଏବଂ କ୍ରୟ ଅର୍ଡର',
    nav_analytics: 'ବିଶ୍ଳେଷଣ',
    nav_alerts: 'ସତର୍କତା',
    btn_scan_barcode: 'ବାରକୋଡ୍ ସ୍କାନ୍ କରନ୍ତୁ',
    btn_add_stock: 'ନୂଆ ଷ୍ଟକ୍ ଯୋଡନ୍ତୁ',
    btn_export_report: 'ରପ୍ତାନି ଏବଂ ପ୍ରିଣ୍ଟ ସେଣ୍ଟର',
    btn_export_pdf: 'PDF ପ୍ରିଣ୍ଟ / ଡାଉନଲୋଡ୍',
    btn_export_excel: 'ଏକ୍ସେଲ ଡାଉନଲୋଡ୍ (.xlsx)',
    btn_print_invoice: 'ଟ୍ୟାକ୍ସ ଇନଭଏସ୍ ପ୍ରିଣ୍ଟ୍',
    btn_print_po: 'କ୍ରୟ ଅର୍ଡର (PO) ପ୍ରିଣ୍ଟ୍',
    btn_ai_copilot: 'AI ସହାୟକ',
    btn_warehouse_guide: 'ଗୋଦାମ ନିର୍ଦ୍ଦେଶିକା',
    theme_light: 'ଲାଇଟ୍ ଥିମ୍ (ଧଳା)',
    theme_dark: 'ଡାର୍କ ଥିମ୍ (କଳା)',
    theme_toggle: 'ଥିମ୍ ବଦଳାନ୍ତୁ',
    lang_select: 'ଭାଷା ବାଛନ୍ତୁ',
    search_placeholder: 'SKU, ସାମଗ୍ରୀ କିମ୍ବା କ୍ରେତା ଖୋଜନ୍ତୁ...',
    status_optimal: 'ଉପଯୁକ୍ତ',
    status_low: 'କମ୍ ଷ୍ଟକ୍',
    status_reorder: 'ପୁନଃ ଅର୍ଡର କରନ୍ତୁ',
    status_full: 'ସମ୍ପୂର୍ଣ୍ଣ',
    status_critical: 'ଜରୁରୀ ସତର୍କତା',
    tab_all: 'ସମସ୍ତ',
    tab_orders: 'ଅର୍ଡରଗୁଡ଼ିକ',
    tab_buyers: 'କ୍ରେତା ଯୋଗାଯୋଗ',
    buyer_contacts: 'କ୍ରେତା ନିର୍ଦ୍ଦେଶିକା',
    create_order: 'ନୂଆ ଅର୍ଡର',
    contact_whatsapp: 'ହ୍ୱାଟସ୍‌ଆପ୍‌ରେ ଚାଟ୍ କରନ୍ତୁ',
    direct_chat: 'ସିଧାସଳଖ ଚାଟ୍',
    order_status_pending: 'ବାକି ଅଛି',
    order_status_confirmed: 'ନିଶ୍ଚିତ ହୋଇଛି',
    order_status_shipped: 'ପଠାଯାଇଛି',
    order_status_delivered: 'ପହଞ୍ଚିଛି',
    order_status_cancelled: 'ବାତିଲ୍',
    billing_and_invoice: 'ଜିଏସଟି ବିଲିଂ ଏବଂ ଇନଭଏସ୍',
    purchase_orders: 'କ୍ରୟ ଅର୍ଡର',
    total_inventory_value: 'ମୋଟ ଷ୍ଟକ୍ ମୂଲ୍ୟ',
    critical_stock_count: 'ଜରୁରୀ ସାମଗ୍ରୀ',
    monthly_turnover: 'ମାସିକ କାରବାର',
    quick_actions: 'ଦ୍ରୁତ କାର୍ଯ୍ୟ',
    recent_activity: 'ସାମ୍ପ୍ରତିକ କାର୍ଯ୍ୟକଳାପ',
    switch_account: 'ଖାତା ପରିବର୍ତ୍ତନ କରନ୍ତୁ',
    sign_out: 'ଲଗ୍ ଆଉଟ୍',
    delete_account: 'ଖାତା ଡିଲିଟ୍ କରନ୍ତୁ',
    whatsapp_order_msg: 'ନମସ୍କାର! ଓମ୍ନିଷ୍ଟକରେ ଆପଣଙ୍କ ଅର୍ଡର ସମ୍ପର୍କରେ:',
  },
  as: {
    app_name: 'অমনিষ্টক',
    nav_dashboard: 'ডেশ্ববৰ্ড',
    nav_inventory: 'মজুত তালিকা',
    nav_orders: 'গ্ৰাহকৰ অৰ্ডাৰ আৰু ক্ৰেতা',
    nav_reorder: 'পুনৰ অৰ্ডাৰ আৰু ক্ৰয় অৰ্ডাৰ',
    nav_analytics: 'বিশ্লেষণ',
    nav_alerts: 'সতৰ্কবাৰ্তা',
    btn_scan_barcode: 'বাৰক’ড স্কেন কৰক',
    btn_add_stock: 'নতুন ষ্টক যোগ কৰক',
    btn_export_report: 'ৰপ্তানি আৰু প্ৰিন্ট কেন্দ্ৰ',
    btn_export_pdf: 'PDF প্ৰিন্ট / ডাউনলোড',
    btn_export_excel: 'এক্সেল ডাউনলোড (.xlsx)',
    btn_print_invoice: 'টেক্স ইনভইচ প্ৰিন্ট',
    btn_print_po: 'ক্ৰয় অৰ্ডাৰ (PO) প্ৰিন্ট',
    btn_ai_copilot: 'AI সহায়ক',
    btn_warehouse_guide: 'গুদাম গাইড',
    theme_light: 'লাইট থীম (বগা)',
    theme_dark: 'ডাৰ্ক থীম (কলা)',
    theme_toggle: 'থীম সলনি কৰক',
    lang_select: 'ভাষা বাছক',
    search_placeholder: 'SKU, সামগ্ৰী বা ক্ৰেতা বিচাৰক...',
    status_optimal: 'অনুকূল',
    status_low: 'কম ষ্টক',
    status_reorder: 'পুনৰ অৰ্ডাৰ কৰক',
    status_full: 'পূৰ্ণ ক্ষমতা',
    status_critical: 'জৰুৰী সতৰ্কতা',
    tab_all: 'সকলো',
    tab_orders: 'অৰ্ডাৰসমূহ',
    tab_buyers: 'ক্ৰেতা যোগাযোগ',
    buyer_contacts: 'ক্ৰেতা ডাইৰেক্টৰি',
    create_order: 'নতুন অৰ্ডাৰ',
    contact_whatsapp: 'হোৱাটছএপত কথা পাতক',
    direct_chat: 'প্ৰত্যক্ষ চ্যাট',
    order_status_pending: 'বাকী থকা',
    order_status_confirmed: 'নিশ্চিত',
    order_status_shipped: 'প্ৰেৰণ কৰা হ’ল',
    order_status_delivered: 'প্ৰদান কৰা হ’ল',
    order_status_cancelled: 'বাতিল কৰা হ’ল',
    billing_and_invoice: 'জিএছটি বিলিং আৰু ইনভইচ',
    purchase_orders: 'ক্ৰয় অৰ্ডাৰ',
    total_inventory_value: 'মুঠ ষ্টক মূল্য',
    critical_stock_count: 'সংকটজনক ষ্টক',
    monthly_turnover: 'মাহেকীয়া লেনদেন',
    quick_actions: 'দ্ৰুত পদক্ষেপ',
    recent_activity: 'শেহতীয়া কাৰ্য্যকলাপ',
    switch_account: 'একাউণ্ট সলনি কৰক',
    sign_out: 'ছাইন আউট',
    delete_account: 'একাউণ্ট মচক',
    whatsapp_order_msg: 'নমস্কাৰ! অমনিষ্টকত আপোনাৰ অৰ্ডাৰ সম্পৰ্কত:',
  },
  mai: {
    app_name: 'ओम्नीस्टॉक',
    nav_dashboard: 'डैशबोर्ड',
    nav_inventory: 'इन्वेंट्री सूची',
    nav_orders: 'ग्राहक ऑर्डर आ खरीददार',
    nav_reorder: 'पुनः ऑर्डर आ खरीद आदेश',
    nav_analytics: 'विश्लेषण',
    nav_alerts: 'अलर्ट',
    btn_scan_barcode: 'बारकोड स्कैन करू',
    btn_add_stock: 'नव स्टॉक जोड़ू',
    btn_export_report: 'निर्यात आ प्रिंट केंद्र',
    btn_export_pdf: 'PDF प्रिंट / डाउनलोड',
    btn_export_excel: 'एक्सेल डाउनलोड (.xlsx)',
    btn_print_invoice: 'टैक्स इनवॉइस प्रिंट करू',
    btn_print_po: 'खरीद आदेश (PO) प्रिंट करू',
    btn_ai_copilot: 'एआई सहायक',
    btn_warehouse_guide: 'गोदाम गाइड',
    theme_light: 'उज्जर थीम (Light)',
    theme_dark: 'करिया थीम (Dark)',
    theme_toggle: 'थीम बदलू',
    lang_select: 'भाषा चुनू',
    search_placeholder: 'SKU, समान वा खरीददार खोजू...',
    status_optimal: 'संतोषजनक',
    status_low: 'कम स्टॉक',
    status_reorder: 'पुनः ऑर्डर करू',
    status_full: 'पूरा स्टॉक',
    status_critical: 'गंभीर स्थिति',
    tab_all: 'सब',
    tab_orders: 'ऑर्डर्स',
    tab_buyers: 'खरीददार संपर्क',
    buyer_contacts: 'खरीददार निर्देशिका',
    create_order: 'नव ऑर्डर बनाउ',
    contact_whatsapp: 'व्हाट्सएप पर बात करू',
    direct_chat: 'सीधा चैट',
    order_status_pending: 'लंबित',
    order_status_confirmed: 'पुष्टि भेल',
    order_status_shipped: 'भेजल गेल',
    order_status_delivered: 'पहुंचाओल गेल',
    order_status_cancelled: 'रद्द',
    billing_and_invoice: 'जीएसटी बिलिंग आ इनवॉइस',
    purchase_orders: 'खरीद आदेश',
    total_inventory_value: 'कुल स्टॉक मूल्यांकन',
    critical_stock_count: 'गंभीर समान',
    monthly_turnover: 'मासिक टर्नओवर',
    quick_actions: 'त्वरित काज',
    recent_activity: 'हालक गतिविधि',
    switch_account: 'खाता बदलू',
    sign_out: 'साइन आउट',
    delete_account: 'खाता हटाउ',
    whatsapp_order_msg: 'प्रणाम! ओम्नीस्टॉक पर अहाँक ऑर्डरक संबंध में:',
  },
  sat: {
    app_name: 'OmniStock (ᱥᱟᱱᱛᱟᱲᱤ)',
    nav_dashboard: 'ᱰᱮᱥᱵᱳᱨᱰ (Dashboard)',
    nav_inventory: 'ᱥᱟᱢᱟᱱ ᱞᱤᱥᱴ (Inventory)',
    nav_orders: 'ᱠᱤᱨᱤᱧᱤᱭᱟᱹ ᱚᱰᱟᱨ (Orders)',
    nav_reorder: 'ᱫᱚᱦᱲᱟ ᱚᱰᱟᱨ (Reorder & PO)',
    nav_analytics: 'ᱮᱱᱟᱞᱤᱴᱤᱠᱥ (Analytics)',
    nav_alerts: 'ᱥᱟᱛᱟᱨ ᱠᱷᱚᱵᱚᱨ (Alerts)',
    btn_scan_barcode: 'ᱵᱟᱨᱠᱳᱰ ᱥᱠᱮᱱ (Barcode Scan)',
    btn_add_stock: 'ᱱᱟᱣᱟ ᱥᱴᱚᱠ ᱡᱚᱲᱟᱣ (Add Stock)',
    btn_export_report: 'ᱮᱠᱥᱯᱳᱨᱴ & ᱯᱨᱤᱱᱴ (Export / Print)',
    btn_export_pdf: 'PDF ᱯᱨᱤᱱᱴ / ᱰᱟᱩᱱᱞᱳᱰ',
    btn_export_excel: 'Excel ᱰᱟᱩᱱᱞᱳᱰ (.xlsx)',
    btn_print_invoice: 'Tax Invoice Print',
    btn_print_po: 'Purchase Order Print',
    btn_ai_copilot: 'AI ᱜᱚᱲᱚᱭᱤᱡ',
    btn_warehouse_guide: 'ᱜᱩᱫᱟᱢ ᱜᱟᱭᱤᱰ',
    theme_light: 'ᱯᱩᱸᱰ ᱛᱷᱤᱢ (Light)',
    theme_dark: 'ᱦᱮᱸᱫᱮ ᱛᱷᱤᱢ (Dark)',
    theme_toggle: 'ᱛᱷᱤᱢ ᱵᱚᱫᱚᱞ',
    lang_select: 'ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ',
    search_placeholder: 'SKU, ᱡᱤᱱᱤᱥ ᱥᱮ ᱠᱤᱨᱤᱧᱤᱭᱟᱹ ᱥᱮᱸᱫᱽᱨᱟᱭ ᱢᱮ...',
    status_optimal: 'ᱴᱷᱤᱠ ᱜᱮᱭᱟ',
    status_low: 'ᱠᱚᱢ ᱥᱴᱚᱠ',
    status_reorder: 'ᱫᱚᱦᱲᱟ ᱚᱰᱟᱨ ᱢᱮ',
    status_full: 'ᱯᱩᱨᱟᱹ ᱥᱴᱚᱠ',
    status_critical: 'ᱵᱚᱛᱚᱨ ᱦᱟᱞᱚᱛ',
    tab_all: 'ᱡᱚᱛᱚ',
    tab_orders: 'ᱚᱰᱟᱨ ᱠᱚ',
    tab_buyers: 'ᱠᱤᱨᱤᱧᱤᱭᱟᱹ ᱠᱚ',
    buyer_contacts: 'ᱠᱤᱨᱤᱧᱤᱭᱟᱹ ᱥᱟᱹᱜᱟᱹᱭ',
    create_order: 'ᱱᱟᱣᱟ ᱚᱰᱟᱨ',
    contact_whatsapp: 'WhatsApp ᱛᱮ ᱨᱚᱯᱚᱲ',
    direct_chat: 'ᱥᱚᱡᱷᱮ ᱪᱮᱴ',
    order_status_pending: 'ᱛᱟᱺᱜᱤ ᱨᱮ',
    order_status_confirmed: 'ᱴᱷᱟᱹᱣᱠᱟᱹᱭᱮᱱᱟ',
    order_status_shipped: 'ᱠᱩᱞ ᱮᱱᱟ',
    order_status_delivered: 'ᱥᱮᱴᱮᱨ ᱮᱱᱟ',
    order_status_cancelled: 'ᱵᱟᱹᱛᱤᱞ ᱮᱱᱟ',
    billing_and_invoice: 'GST ᱵᱤᱞ & ᱤᱱᱵᱷᱚᱭᱮᱥ',
    purchase_orders: 'ᱠᱤᱨᱤᱧ ᱚᱰᱟᱨ (PO)',
    total_inventory_value: 'ᱢᱩᱴ ᱥᱴᱚᱠ ᱫᱟᱢ',
    critical_stock_count: 'ᱵᱚᱛᱚᱨᱟᱱ ᱥᱴᱚᱠ',
    monthly_turnover: 'ᱪᱟᱸᱫᱚᱠᱤᱭᱟᱹ ᱞᱮᱱ-ᱫᱮᱱ',
    quick_actions: 'ᱞᱚᱜᱚᱱ ᱠᱟᱹᱢᱤ',
    recent_activity: 'ᱱᱤᱛᱚᱜᱟᱜ ᱠᱟᱹᱢᱤᱦᱚᱨᱟ',
    switch_account: 'ᱮᱠᱟᱩᱱᱴ ᱵᱚᱫᱚᱞ',
    sign_out: 'ᱥᱟᱭᱤᱱ ᱟᱣᱴ',
    delete_account: 'ᱮᱠᱟᱩᱱᱴ ᱜᱮᱫ ᱜᱤᱰᱤ',
    whatsapp_order_msg: 'ᱡᱚᱦᱟᱨ! OmniStock ᱨᱮ ᱟᱢᱟᱜ ᱚᱰᱟᱨ ᱵᱟᱵᱚᱛ:',
  },
  ks: {
    app_name: 'اومنی اسٹاک (کٲشُر)',
    nav_dashboard: 'ڈیش بورڈ',
    nav_inventory: 'سٹاک فہرست',
    nav_orders: 'آرڈرز تہٕ خریدار',
    nav_reorder: 'دوبارہ آرڈر',
    nav_analytics: 'تجزیہٕ',
    nav_alerts: 'اطلاعات',
    btn_scan_barcode: 'بارکوڈ اسکین',
    btn_add_stock: 'نوو سٹاک دَرٕج کٔریو',
    btn_export_report: 'ایکسپورٹ تہٕ پرنٹ',
    btn_export_pdf: 'PDF ڈاؤن لوڈ / پرنٹ',
    btn_export_excel: 'Excel ڈاؤن لوڈ (.xlsx)',
    btn_print_invoice: 'ٹیکس انوائس پرنٹ',
    btn_print_po: 'خریداری آرڈر پرنٹ',
    btn_ai_copilot: 'AI مددگار',
    btn_warehouse_guide: 'گودام رہنمائی',
    theme_light: 'سفید تھیم (Light)',
    theme_dark: 'سیاہ تھیم (Dark)',
    theme_toggle: 'تھیم تبدیل',
    lang_select: 'زبان منتخب کٔریو',
    search_placeholder: 'SKU، چیز یا خریدار تلاشن کٔریو...',
    status_optimal: 'ٹھیک',
    status_low: 'کم سٹاک',
    status_reorder: 'دوبارہ منگناو',
    status_full: 'مکمل',
    status_critical: 'خطرناک',
    tab_all: 'سٲری',
    tab_orders: 'آرڈرز',
    tab_buyers: 'خریدار',
    buyer_contacts: 'خریدارن ہند رابط',
    create_order: 'نوو آرڈر',
    contact_whatsapp: 'WhatsApp پؠٹھ رابطہٕ',
    direct_chat: 'براہ راست چیٹ',
    order_status_pending: 'باقی',
    order_status_confirmed: 'منظور',
    order_status_shipped: 'روانہ',
    order_status_delivered: 'پُہنچاو',
    order_status_cancelled: 'منسوخ',
    billing_and_invoice: 'جی ایس ٹی بلنگ',
    purchase_orders: 'پرچیز آرڈر',
    total_inventory_value: 'کل سٹاک قیمت',
    critical_stock_count: 'کم سٹاک اشیاء',
    monthly_turnover: 'ماہانہ کھپت',
    quick_actions: 'فوری کام',
    recent_activity: 'حالیہ سرگرمی',
    switch_account: 'اکاؤنٹ تبدیل کٔریو',
    sign_out: 'سائن آؤٹ',
    delete_account: 'اکاؤنٹ مٹاو',
    whatsapp_order_msg: 'سلام! اومنی اسٹاکس پؠٹھ تھند آرڈر تفصیلات:',
  },
  ne: {
    app_name: 'ओम्नीस्टक',
    nav_dashboard: 'ड्यासबோர्ड',
    nav_inventory: 'सामान सूची (Inventory)',
    nav_orders: 'ग्राहक अर्डर र खरिदकर्ता',
    nav_reorder: 'पुनः अर्डर र खरिद आदेश',
    nav_analytics: 'विश्लेषण र रिपोर्ट',
    nav_alerts: 'सूचनाहरू',
    btn_scan_barcode: 'बारकोड स्क्यान गर्नुहोस्',
    btn_add_stock: 'नयाँ स्टक थप्नुहोस्',
    btn_export_report: 'निर्यात र प्रिन्ट केन्द्र',
    btn_export_pdf: 'PDF प्रिन्ट / डाउनलोड',
    btn_export_excel: 'एक्सेल डाउनलोड (.xlsx)',
    btn_print_invoice: 'कर इनभ्वाइस प्रिन्ट',
    btn_print_po: 'खरिद आदेश (PO) प्रिन्ट',
    btn_ai_copilot: 'एआई सहायक',
    btn_warehouse_guide: 'गोदाम गाइड',
    theme_light: 'सेतो थिम (Light)',
    theme_dark: 'कालो थिम (Dark)',
    theme_toggle: 'थिम परिवर्तन',
    lang_select: 'भाषा छान्नुहोस्',
    search_placeholder: 'SKU, सामान वा खरिदकर्ता खोज्नुहोस्...',
    status_optimal: 'उचित',
    status_low: 'कम स्टक',
    status_reorder: 'पुनः अर्डर गर्नुहोस्',
    status_full: 'पूर्ण स्टक',
    status_critical: 'गम्भीर स्थिति',
    tab_all: 'सबै',
    tab_orders: 'अर्डरहरू',
    tab_buyers: 'खरिदकर्ता सम्पर्क',
    buyer_contacts: 'खरिदकर्ता निर्देशिका',
    create_order: 'नयाँ अर्डर',
    contact_whatsapp: 'व्हाट्सएपमा कुरा गर्नुहोस्',
    direct_chat: 'प्रत्यक्ष च्याट',
    order_status_pending: 'बाँकी',
    order_status_confirmed: 'पुष्टि भयो',
    order_status_shipped: 'पठाइयो',
    order_status_delivered: 'वितरण भयो',
    order_status_cancelled: 'रद्द गरियो',
    billing_and_invoice: 'जीएसटी बिलिङ र इनभ्वाइस',
    purchase_orders: 'खरिद आदेश (PO)',
    total_inventory_value: 'कुल स्टक मूल्य',
    critical_stock_count: 'अति आवश्यक स्टक',
    monthly_turnover: 'मासिक कारोबार',
    quick_actions: 'छिटो कार्यहरू',
    recent_activity: 'भर्खरको गतिविधि',
    switch_account: 'खाता बदल्नुहोस्',
    sign_out: 'साइन आउट',
    delete_account: 'खाता हटाउनुहोस्',
    whatsapp_order_msg: 'नमस्ते! ओम्नीस्टकमा तपाईंको अर्डरको विवरण:',
  },
  kok: {
    app_name: 'ओम्नीस्टॉक (कोंकणी)',
    nav_dashboard: 'डॅशबोर्ड',
    nav_inventory: 'वस्तू सूची',
    nav_orders: 'ऑर्डर्स आनी गिरायकां',
    nav_reorder: 'पुनः ऑर्डर',
    nav_analytics: 'अहवाल आनी विश्लेषण',
    nav_alerts: 'शिटकावणी',
    btn_scan_barcode: 'बारकोड स्कॅन करात',
    btn_add_stock: 'नवो साठो जोडा',
    btn_export_report: 'एक्सपोर्ट आनी प्रिंट',
    btn_export_pdf: 'PDF प्रिंट / डाऊनलोड',
    btn_export_excel: 'एक्सेल डाऊनलोड (.xlsx)',
    btn_print_invoice: 'टॅक्स इनव्हॉइस प्रिंट',
    btn_print_po: 'खरेदी ऑर्डर (PO) प्रिंट',
    btn_ai_copilot: 'एआय सांगाती',
    btn_warehouse_guide: 'वेअरहाऊस मार्गदर्शक',
    theme_light: 'धवो थीम (Light)',
    theme_dark: 'काळो थीम (Dark)',
    theme_toggle: 'थीम बदला',
    lang_select: 'भास निवडा',
    search_placeholder: 'SKU, वस्तू वा गिरायकाचें नांव सोधात...',
    status_optimal: 'बरें प्रमाण',
    status_low: 'उणो साठो',
    status_reorder: 'परत ऑर्डर करात',
    status_full: 'भरिल्लें',
    status_critical: 'गंभीर',
    tab_all: 'सगळें',
    tab_orders: 'ऑर्डर्स',
    tab_buyers: 'गिरायक संपर्क',
    buyer_contacts: 'गिरायक वळेरी',
    create_order: 'नवी ऑर्डर करात',
    contact_whatsapp: 'WhatsApp चेर चॅट करात',
    direct_chat: 'थेट चॅट',
    order_status_pending: 'उरिल्लें',
    order_status_confirmed: 'पक्कें जालें',
    order_status_shipped: 'धाडिल्लें',
    order_status_delivered: 'पावलें',
    order_status_cancelled: 'रद्द जालें',
    billing_and_invoice: 'जीएसटी बिलिंग आनी इनव्हॉइस',
    purchase_orders: 'खरेदी आदेश',
    total_inventory_value: 'एकूण साठ्याचें मोल',
    critical_stock_count: 'गंभीर साठो',
    monthly_turnover: 'म्हयन्याचो वेव्हार',
    quick_actions: 'रोखडी कृती',
    recent_activity: 'हालींची हालचाल',
    switch_account: 'खातें बदला',
    sign_out: 'भायर सरा',
    delete_account: 'खातें काडून उडयात',
    whatsapp_order_msg: 'नमस्कार! ओम्नीस्टॉक वयल्या तुमच्या ऑर्डरा विशीं माहिती:',
  },
  doi: {
    app_name: 'ओम्नीस्टॉक (डोगरी)',
    nav_dashboard: 'डैशबोर्ड',
    nav_inventory: 'स्टॉक सूची',
    nav_orders: 'ग्राहक आर्डर ते खरीदार',
    nav_reorder: 'मुड़-आर्डर ते खरीद आर्डर',
    nav_analytics: 'विश्लेषण',
    nav_alerts: 'चेतावनी',
    btn_scan_barcode: 'बारकोड स्कैन करो',
    btn_add_stock: 'नमां स्टॉक जोड़ो',
    btn_export_report: 'एक्सपोर्ट ते प्रिंट केंद्र',
    btn_export_pdf: 'PDF प्रिंट / डाउनलोड',
    btn_export_excel: 'एक्सेल डाउनलोड (.xlsx)',
    btn_print_invoice: 'टैक्स इनवाइस प्रिंट करो',
    btn_print_po: 'खरीद आर्डर (PO) प्रिंट करो',
    btn_ai_copilot: 'एआई मददगार',
    btn_warehouse_guide: 'गोदाम गाइड',
    theme_light: 'चिट्ठा थीम (Light)',
    theme_dark: 'काला थीम (Dark)',
    theme_toggle: 'थीम बदलो',
    lang_select: 'बोली चुनो',
    search_placeholder: 'SKU, चीज जां खरीदार तुप्पो...',
    status_optimal: 'ठीक ठाक',
    status_low: 'घट्ट स्टॉक',
    status_reorder: 'परत आर्डर करो',
    status_full: 'पूरा भरिया',
    status_critical: 'चिंताजनक',
    tab_all: 'सब्भ',
    tab_orders: 'आर्डर',
    tab_buyers: 'खरीदार राबता',
    buyer_contacts: 'खरीदार डायरेक्टरी',
    create_order: 'नमां आर्डर',
    contact_whatsapp: 'WhatsApp पर गल्ल करो',
    direct_chat: 'सधा चैट',
    order_status_pending: 'बाकी',
    order_status_confirmed: 'पक्का',
    order_status_shipped: 'भेजे दा',
    order_status_delivered: 'पुज्जे दा',
    order_status_cancelled: 'रद्द',
    billing_and_invoice: 'जीएसटी बिलिंग ते इनवाइस',
    purchase_orders: 'खरीद आर्डर',
    total_inventory_value: 'कुल स्टॉक मुल्ल',
    critical_stock_count: 'नाजुक स्टॉक',
    monthly_turnover: 'महीने दी बिक्री',
    quick_actions: 'तेज कम्म',
    recent_activity: 'ताजा गतिविधि',
    switch_account: 'खाता बदलो',
    sign_out: 'साइन आउट',
    delete_account: 'खाता हटाओ',
    whatsapp_order_msg: 'नमस्ते! ओम्नीस्टॉक पर तुंदे आर्डर बारै जानकारी:',
  },
  sd: {
    app_name: 'اومني اسٽاڪ (سنڌي)',
    nav_dashboard: 'ڊيش بورڊ',
    nav_inventory: 'اسٽاڪ فھرست',
    nav_orders: 'گراهڪ جا آرڊر ۽ خريدار',
    nav_reorder: 'ٻيهر آرڊر ۽ خريداري آرڊر',
    nav_analytics: 'تجزيي ۽ رپورٽون',
    nav_alerts: 'چتاءُ / الرٽ',
    btn_scan_barcode: 'بارڪوڊ اسڪين ڪريو',
    btn_add_stock: 'نئون اسٽاڪ شامل ڪريو',
    btn_export_report: 'ايڪسپورٽ ۽ پرنٽ سينٽر',
    btn_export_pdf: 'PDF پرنٽ / ڊائون لوڊ',
    btn_export_excel: 'ايڪسل ڊائون لوڊ (.xlsx)',
    btn_print_invoice: 'ٽيڪس انوائس پرنٽ ڪريو',
    btn_print_po: 'خريداري آرڊر (PO) پرنٽ ڪريو',
    btn_ai_copilot: 'AI مددگار',
    btn_warehouse_guide: 'گودام ھدايت نامو',
    theme_light: 'اڇو ٿيم (Light)',
    theme_dark: 'ڪارو ٿيم (Dark)',
    theme_toggle: 'ٿيم تبديل ڪريو',
    lang_select: 'ٻولي چونڊيو',
    search_placeholder: 'SKU، شي يا خريدار ڳولھيو...',
    status_optimal: 'بهترين',
    status_low: 'گهٽ اسٽاڪ',
    status_reorder: 'ٻيهر آرڊر ڪريو',
    status_full: 'مڪمل',
    status_critical: 'نازڪ الرٽ',
    tab_all: 'سڀ',
    tab_orders: 'آرڊرز',
    tab_buyers: 'خريدار رابطا',
    buyer_contacts: 'خريدارن جي لسٽ',
    create_order: 'نئون آرڊر',
    contact_whatsapp: 'WhatsApp تي چيٽ ڪريو',
    direct_chat: 'سڌي چيٽ',
    order_status_pending: 'باقي',
    order_status_confirmed: 'تصديق ٿيل',
    order_status_shipped: 'موڪليل',
    order_status_delivered: 'پهچايو ويو',
    order_status_cancelled: 'منسوخ',
    billing_and_invoice: 'GST بلنگ ۽ انوائس',
    purchase_orders: 'خريداري آرڊر',
    total_inventory_value: 'ڪل اسٽاڪ قيمت',
    critical_stock_count: 'نازڪ اسٽاڪ شيون',
    monthly_turnover: 'ماهوار ٽرن اوور',
    quick_actions: 'تيز قدم',
    recent_activity: 'تازو سرگرميون',
    switch_account: 'کاتو تبديل ڪريو',
    sign_out: 'سائن آئوٽ',
    delete_account: 'کاتو ختم ڪريو',
    whatsapp_order_msg: 'هيلو! اومني اسٽاڪ تي توهان جي آرڊر بابت معلومات:',
  },
  brx: {
    app_name: 'ओम्नीस्टक (बड़ो)',
    nav_dashboard: 'डेशबर्ड',
    nav_inventory: 'दखाय मुवा फारिलाइ (Inventory)',
    nav_orders: 'बायगिरि बिथोन (Orders & Buyers)',
    nav_reorder: 'फिन बिथोन (Reorder & PO)',
    nav_analytics: 'आनजाद (Analytics)',
    nav_alerts: 'सांग्रां रादाब (Alerts)',
    btn_scan_barcode: 'बारखड स्केन खालाम',
    btn_add_stock: 'गोदान दखाय दाजाब',
    btn_export_report: 'एक्सपर्ट & प्रिन्ट',
    btn_export_pdf: 'PDF प्रिन्ट / डाउनलोड',
    btn_export_excel: 'एक्सेल डाउनलोड (.xlsx)',
    btn_print_invoice: 'खाजोना इनभयस प्रिन्ट',
    btn_print_po: 'बायनाय बिथोन (PO) प्रिन्ट',
    btn_ai_copilot: 'AI मददगिरि',
    btn_warehouse_guide: 'बाखार गाइड',
    theme_light: 'गुफुर थीम (Light)',
    theme_dark: 'गोसोम थीम (Dark)',
    theme_toggle: 'थीम सोलाय',
    lang_select: 'राव सायख',
    search_placeholder: 'SKU, मुवा एबा बायगिरि नागिर...',
    status_optimal: 'मोजां हालोद',
    status_low: 'खोम दखाय',
    status_reorder: 'फिन बिथोन हर',
    status_full: 'आबुं दखाय',
    status_critical: 'गोब्राब हालोद',
    tab_all: 'गासैबो',
    tab_orders: 'बिथोनफोर',
    tab_buyers: 'बायगिरिफोर',
    buyer_contacts: 'बायगिरि संबन्द',
    create_order: 'गोदान बिथोन',
    contact_whatsapp: 'WhatsApp जों रायलाय',
    direct_chat: 'थोंजों रायज्लाय',
    order_status_pending: 'नेनाय',
    order_status_confirmed: 'रोखा जाबाय',
    order_status_shipped: 'दैथायहरबाय',
    order_status_delivered: 'सौफैबाय',
    order_status_cancelled: 'बातिल',
    billing_and_invoice: 'GST बिलिं & इनभयस',
    purchase_orders: 'बायनाय बिथोन (PO)',
    total_inventory_value: 'गासै मुवा बेसेन',
    critical_stock_count: 'गोब्राब दखाय',
    monthly_turnover: 'दानारि सोलायनाय',
    quick_actions: 'गोख्रै खामानि',
    recent_activity: 'दानि खामानि',
    switch_account: 'एकाउन्ट सोलाय',
    sign_out: 'ओंखारलां',
    delete_account: 'एकाउन्ट बोखार',
    whatsapp_order_msg: 'खुलुमबाय! ओम्नीस्टक आव नोंथांनि बिथोननि सायाव:',
  },
  sa: {
    app_name: 'ओम्नीस्टॉक (संस्कृतम्)',
    nav_dashboard: 'मुख्यपटलम् (Dashboard)',
    nav_inventory: 'वस्तुसूची (Inventory)',
    nav_orders: 'क्रेतृ-आदेशाः (Orders & Buyers)',
    nav_reorder: 'पुनरादेशः क्रयादेशाश्च',
    nav_analytics: 'विश्लेषणम् (Analytics)',
    nav_alerts: 'सूचनापटलम् (Alerts)',
    btn_scan_barcode: 'दण्डसङ्केतं वीक्ष्यताम् (Scan Barcode)',
    btn_add_stock: 'नूतनसङ्ग्रहः योज्यताम्',
    btn_export_report: 'निर्यातः मुद्रणकेन्द्रं च',
    btn_export_pdf: 'PDF मुद्र्यताम् / अधोभार्यताम्',
    btn_export_excel: 'Excel अधोभार्यताम् (.xlsx)',
    btn_print_invoice: 'शुल्कपत्रं मुद्र्यताम् (Invoice)',
    btn_print_po: 'क्रयादेशपत्रं मुद्र्यताम् (PO)',
    btn_ai_copilot: 'कृत्रिमबुद्धि-सहायकः',
    btn_warehouse_guide: 'भाण्डागारमार्गदर्शिका',
    theme_light: 'श्वेत-वर्ण-विषयः (Light)',
    theme_dark: 'कृष्ण-वर्ण-विषयः (Dark)',
    theme_toggle: 'वर्णपरिवर्तनम्',
    lang_select: 'भाषां चिनोतु',
    search_placeholder: 'SKU, वस्तु, क्रेतारं वा अन्विष्यताम्...',
    status_optimal: 'सम्यक्',
    status_low: 'न्यूनसङ्ग्रहः',
    status_reorder: 'पुनरादिश्यताम्',
    status_full: 'पूर्णसङ्ग्रहः',
    status_critical: 'अत्यावश्यकी स्थितिः',
    tab_all: 'सर्वाणि',
    tab_orders: 'आदेशाः',
    tab_buyers: 'क्रेतारः',
    buyer_contacts: 'क्रेतृ-निर्देशिका',
    create_order: 'नूतनादेशः',
    contact_whatsapp: 'WhatsApp माध्यमेन सम्भाषणम्',
    direct_chat: 'प्रत्यक्ष-सम्भाषणम्',
    order_status_pending: 'प्रतीक्षमाणम्',
    order_status_confirmed: 'पुष्टीकृतम्',
    order_status_shipped: 'प्रेषितम्',
    order_status_delivered: 'प्राप्तम्',
    order_status_cancelled: 'निरस्तम्',
    billing_and_invoice: 'जीएसटी बिलिंग पत्रम् च',
    purchase_orders: 'क्रयादेशाः (PO)',
    total_inventory_value: 'कुलसङ्ग्रह-मूल्यम्',
    critical_stock_count: 'अत्यावश्यक-वस्तूनि',
    monthly_turnover: 'मासिक-संव्यवहारः',
    quick_actions: 'त्वरित-क्रियाः',
    recent_activity: 'सद्यः क्रियाकलापः',
    switch_account: 'खातापरिवर्तनम्',
    sign_out: 'बहिर्गमनम्',
    delete_account: 'खाता-निष्कासनम्',
    whatsapp_order_msg: 'नमस्ते! ओम्नीस्टॉक-तन्त्रे भवतः आदेशविषये विवरणम्:',
  },
  mni: {
    app_name: 'ওমনিষ্টোক (মৈতৈলোন্)',
    nav_dashboard: 'ড্যাশবোর্ড',
    nav_inventory: 'পোৎলৈ রোল (Inventory)',
    nav_orders: 'লৈবশিংগী ওর্ডর (Orders & Buyers)',
    nav_reorder: 'অমুক ওর্ডর তৌবা (Reorder & PO)',
    nav_analytics: 'শেন্দোং ৱাখল্লোন (Analytics)',
    nav_alerts: 'চেকশিল্লোল (Alerts)',
    btn_scan_barcode: 'বারকোড স্কেন তৌরো',
    btn_add_stock: 'অনৌবা পোৎলৈ হাপচিল্লু',
    btn_export_report: 'এক্সপোর্ট অমসুং প্রিন্ট',
    btn_export_pdf: 'PDF প্রিন্ট / দাউনলোড',
    btn_export_excel: 'এক্সেল দাউনলোড (.xlsx)',
    btn_print_invoice: 'টেক্স ইনভয়েস প্রিন্ট',
    btn_print_po: 'লৈবগী ওর্ডর (PO) প্রিন্ট',
    btn_ai_copilot: 'AI মতেং পাংবা',
    btn_warehouse_guide: 'গুদাম লমজিংবা',
    theme_light: 'অঙৌবা থিম (Light)',
    theme_dark: 'অমোম্বা থিম (Dark)',
    theme_toggle: 'থিম হোংদোকপা',
    lang_select: 'লোন খনবীয়ু',
    search_placeholder: 'SKU, পোৎলৈ নত্রগা লৈবা মী থীবীয়ু...',
    status_optimal: 'ফনা লৈরি',
    status_low: 'পোৎলৈ হন্থরে',
    status_reorder: 'অমুক ওর্ডর তৌরো',
    status_full: 'থল্লে',
    status_critical: 'অকনবা চেকশিল্লোল',
    tab_all: 'পুম্নমক',
    tab_orders: 'ওর্ডরশিং',
    tab_buyers: 'লৈবশিংগী পাউমি',
    buyer_contacts: 'লৈবা মীগী রোল',
    create_order: 'অনৌবা ওর্ডর',
    contact_whatsapp: 'WhatsApp তা ৱারী শানরো',
    direct_chat: 'নক্না ৱারী শানবা',
    order_status_pending: 'ঙাইরি',
    order_status_confirmed: 'য়েংলগা চৎনরে',
    order_status_shipped: 'থাখ্রে',
    order_status_delivered: 'য়ৌখ্রে',
    order_status_cancelled: 'তৌদ্রে',
    billing_and_invoice: 'GST বিলিং অমসুং ইনভয়েস',
    purchase_orders: 'লৈবগী ওর্ডর (PO)',
    total_inventory_value: 'অপুনবা পোৎলৈগী মল',
    critical_stock_count: 'হন্থরবা পোৎলৈশিং',
    monthly_turnover: 'থাগী শেন্দোং',
    quick_actions: 'থুনা তৌগদবা',
    recent_activity: 'হন্দক তৌখিবশিং',
    switch_account: 'একান্ত হোংদোকপা',
    sign_out: 'থোক্লিব',
    delete_account: 'একান্ত মুত্থৎপা',
    whatsapp_order_msg: 'খুরুমরজরি! ওমনিষ্টোকতা নহাক্কী ওর্ডরগী মরমদা:',
  },
};

const translationCache = new Map<string, string>();

/**
 * Translates any UI string, phrase, key, or heading into the target Indian language.
 * Preserves leading/trailing punctuation, whitespaces, icons, and numbers.
 */
export function translateFullText(text: string, lang: LanguageCode | string = 'en'): string {
  if (!text || lang === 'en') return text;
  const code = (lang as LanguageCode) || 'en';

  const cacheKey = `${code}:${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const trimmed = text.trim();
  if (!trimmed || /^[0-9₹$%.,/:#\s+x\-()]+$/.test(trimmed)) {
    translationCache.set(cacheKey, text);
    return text;
  }

  // 1. Direct match on recorded items dictionary (e.g. Extra Virgin Olive Oil, Royal Basmati Rice)
  const recordedMatch = translateRecordedItem(trimmed, code);
  if (recordedMatch !== trimmed) {
    const res = text.replace(trimmed, recordedMatch);
    translationCache.set(cacheKey, res);
    return res;
  }

  // 2. Direct match on physical warehouse zones / locations
  const zoneMatch = translateRecordedLocation(trimmed, code);
  if (zoneMatch !== trimmed) {
    const res = text.replace(trimmed, zoneMatch);
    translationCache.set(cacheKey, res);
    return res;
  }

  // 3. Direct match on recorded activity logs
  const activityMatch = translateRecordedActivity(trimmed, code);
  if (activityMatch !== trimmed) {
    const res = text.replace(trimmed, activityMatch);
    translationCache.set(cacheKey, res);
    return res;
  }

  // 4. Direct match on packaging units
  const unitMatch = translateRecordedUnit(trimmed, code);
  if (unitMatch !== trimmed) {
    const res = text.replace(trimmed, unitMatch);
    translationCache.set(cacheKey, res);
    return res;
  }

  // 5. Check exact key in TRANSLATIONS
  const langKeyDict = TRANSLATIONS[code];
  if (langKeyDict && (langKeyDict as any)[trimmed]) {
    const res = text.replace(trimmed, (langKeyDict as any)[trimmed]!);
    translationCache.set(cacheKey, res);
    return res;
  }

  // 6. Check phrase dictionary
  const phraseDict = PHRASE_DICTIONARY[code] || PHRASE_DICTIONARY.hi || {};
  const lowerTrimmed = trimmed.toLowerCase();

  // Strip leading punctuation/bullets: • , - , : , " , '
  const leadingMatch = trimmed.match(/^([•\-\s:("'>]+)/);
  const leadingPunct = leadingMatch ? leadingMatch[1] : '';

  // Strip trailing punctuation: ... , : , ! , ? , ) , " , '
  const trailingMatch = trimmed.match(/([:!?.…)\s"']+)+$/);
  const trailingPunct = trailingMatch ? trailingMatch[0] : '';

  const coreText = trimmed
    .slice(leadingPunct.length, trimmed.length - trailingPunct.length)
    .trim();
  const lowerCore = coreText.toLowerCase();

  if (phraseDict[lowerTrimmed]) {
    const res = text.replace(trimmed, phraseDict[lowerTrimmed]);
    translationCache.set(cacheKey, res);
    return res;
  }
  if (phraseDict[lowerCore]) {
    const res = `${leadingPunct}${phraseDict[lowerCore]}${trailingPunct}`;
    translationCache.set(cacheKey, res);
    return res;
  }

  // Fallback to Hindi dictionary if this specific language dictionary has not yet registered the key
  if (code !== 'hi' && PHRASE_DICTIONARY.hi) {
    if (PHRASE_DICTIONARY.hi[lowerTrimmed]) {
      const res = text.replace(trimmed, PHRASE_DICTIONARY.hi[lowerTrimmed]);
      translationCache.set(cacheKey, res);
      return res;
    }
    if (PHRASE_DICTIONARY.hi[lowerCore]) {
      const res = `${leadingPunct}${PHRASE_DICTIONARY.hi[lowerCore]}${trailingPunct}`;
      translationCache.set(cacheKey, res);
      return res;
    }
  }

  // Multi-phrase substring replacement for composite labels (e.g. "Zone: Dry Goods", "Expires: 2026-05-10")
  let currentResult = text;
  let hasReplaced = false;

  const dictToUse = Object.keys(phraseDict).length > 0 ? phraseDict : (PHRASE_DICTIONARY.hi || {});
  for (const [key, val] of Object.entries(dictToUse)) {
    if (key.length >= 3 && lowerTrimmed.includes(key)) {
      const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(currentResult)) {
        currentResult = currentResult.replace(regex, val);
        hasReplaced = true;
      }
    }
  }

  if (hasReplaced) {
    translationCache.set(cacheKey, currentResult);
    return currentResult;
  }

  translationCache.set(cacheKey, text);
  return text;
}

export function t(key: I18nKey | string, lang: LanguageCode | string = 'en'): string {
  const code = (lang as LanguageCode) || 'en';
  if (code === 'en') {
    const enDict = TRANSLATIONS.en;
    if (enDict && (enDict as any)[key]) {
      return (enDict as any)[key]!;
    }
    return key;
  }

  // 1. Direct translation key lookup
  const langDict = TRANSLATIONS[code];
  if (langDict && (langDict as any)[key]) {
    return (langDict as any)[key]!;
  }

  // 2. Phrase dictionary lookup
  return translateFullText(key, code);
}

/**
 * High-performance, silky smooth Universal Hook that observes the entire DOM tree
 * and translates text nodes, placeholders, and titles in real-time.
 * Batches mutations with requestAnimationFrame to prevent any UI stutter or frame drops.
 */
export function useLanguageAutoTranslate(lang: LanguageCode) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let isInternalUpdate = false;
    const pendingNodes = new Set<Node>();
    let animationFrameId: number | null = null;

    const translateSingleNode = (node: Node) => {
      // Do not translate scripts, styles, raw code, or media elements
      if (
        node.parentElement &&
        ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT'].includes(
          node.parentElement.tagName
        )
      ) {
        return;
      }

      // Do not disturb active input fields during user typing
      if (
        (node.parentElement && node.parentElement.isContentEditable) ||
        (document.activeElement && (document.activeElement === node || document.activeElement === node.parentElement))
      ) {
        return;
      }

      // Handle HTML Input & Textarea Placeholders
      if (
        node instanceof HTMLInputElement ||
        node instanceof HTMLTextAreaElement
      ) {
        if (node.placeholder) {
          if (!(node as any).__origPlaceholder) {
            (node as any).__origPlaceholder = node.placeholder;
          }
          const origP = (node as any).__origPlaceholder;
          if (lang === 'en') {
            if (node.placeholder !== origP) node.placeholder = origP;
          } else {
            const nextP = translateFullText(origP, lang);
            if (node.placeholder !== nextP) node.placeholder = nextP;
          }
        }
        return;
      }

      // Handle Element Titles
      if (node instanceof HTMLElement && node.title) {
        if (!(node as any).__origTitle) {
          (node as any).__origTitle = node.title;
        }
        const origT = (node as any).__origTitle;
        if (lang === 'en') {
          if (node.title !== origT) node.title = origT;
        } else {
          const nextT = translateFullText(origT, lang);
          if (node.title !== nextT) node.title = nextT;
        }
      }

      if (node.nodeType === Node.TEXT_NODE) {
        if ((node as any).__origText === undefined) {
          (node as any).__origText = node.nodeValue;
        }
        const orig = (node as any).__origText;
        if (!orig) return;

        if (lang === 'en') {
          if (node.nodeValue !== orig) {
            isInternalUpdate = true;
            node.nodeValue = orig;
            isInternalUpdate = false;
          }
          return;
        }

        const trimmed = orig.trim();
        if (
          trimmed.length > 1 &&
          !/^[0-9₹$%.,/:#\s+x\-()]+$/.test(trimmed)
        ) {
          const translated = translateFullText(trimmed, lang);
          if (translated !== trimmed) {
            const nextVal = orig.replace(trimmed, translated);
            if (node.nodeValue !== nextVal) {
              isInternalUpdate = true;
              node.nodeValue = nextVal;
              isInternalUpdate = false;
            }
          }
        }
      } else {
        node.childNodes.forEach(translateSingleNode);
      }
    };

    const flushQueue = () => {
      animationFrameId = null;
      if (pendingNodes.size === 0) return;
      const nodesToProcess = Array.from(pendingNodes);
      pendingNodes.clear();

      for (const node of nodesToProcess) {
        try {
          translateSingleNode(node);
        } catch {
          // Keep resilient
        }
      }
    };

    const scheduleNodeProcess = (node: Node) => {
      pendingNodes.add(node);
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(flushQueue);
      }
    };

    const root = document.getElementById('root') || document.body;
    translateSingleNode(root);

    // Observe future dynamic DOM mutations with batched RAF processing
    const observer = new MutationObserver((mutations) => {
      if (isInternalUpdate) return;
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(scheduleNodeProcess);
        } else if (m.type === 'characterData' && m.target) {
          if (!isInternalUpdate) {
            scheduleNodeProcess(m.target);
          }
        }
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      observer.disconnect();
    };
  }, [lang]);
}
