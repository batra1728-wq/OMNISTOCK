import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem, CustomerOrder, PurchaseOrder, BuyerContact } from '../types';

/**
 * 1. EXPORT INVENTORY TO EXCEL (.xlsx)
 */
export function exportInventoryToExcel(inventory: InventoryItem[], fileName = 'OmniStock_Inventory_Report.xlsx') {
  const data = inventory.map((item, index) => ({
    'Sr No': index + 1,
    'Item Name': item.name,
    'SKU Code': item.sku,
    Category: item.category,
    'Current Stock': item.currentStock,
    'Max Capacity': item.maxStock,
    Unit: item.unit,
    'Unit Price (INR)': item.price,
    'Total Valuation (INR)': item.currentStock * item.price,
    'Stock Status': item.status,
    'Storage Bay': item.location || 'Bay-A1',
    'Expiry Date': item.expiryDate,
    'Turnover Rate': item.turnoverRate || 'Normal',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Valuation');

  // Format column widths
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  XLSX.writeFile(workbook, fileName);
}

/**
 * 2. EXPORT INVENTORY TO PDF
 */
export function exportInventoryToPDF(inventory: InventoryItem[], title = 'OmniStock Enterprise Inventory Valuation Report') {
  const doc = new jsPDF('landscape');

  // Header Title
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('OmniStock Inventory & Valuation Report', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Generated on: ${new Date().toLocaleString()} | Total SKU Count: ${inventory.length}`, 14, 25);

  const totalValue = inventory.reduce((acc, i) => acc + i.currentStock * i.price, 0);
  doc.text(`Total Stock Valuation: INR ${totalValue.toLocaleString('en-IN')}`, 180, 25);

  const tableData = inventory.map((item, idx) => [
    idx + 1,
    item.name,
    item.sku,
    item.category,
    `${item.currentStock} / ${item.maxStock} ${item.unit}`,
    `₹${item.price.toLocaleString('en-IN')}`,
    `₹${(item.currentStock * item.price).toLocaleString('en-IN')}`,
    item.status,
    item.location || 'Bay-A1',
    item.expiryDate,
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['#', 'Item Name', 'SKU', 'Category', 'Stock / Max', 'Price', 'Valuation', 'Status', 'Location', 'Expiry']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  doc.save('OmniStock_Inventory_Catalog.pdf');
}

/**
 * 3. EXPORT BILLING / INVOICE TO EXCEL (.xlsx)
 */
export function exportInvoiceToExcel(order: CustomerOrder) {
  const metaRows = [
    { 'Tax Invoice': 'OmniStock Enterprise Billing System', Value: '' },
    { 'Tax Invoice': 'Invoice Number', Value: order.orderNumber },
    { 'Tax Invoice': 'Invoice Date', Value: order.orderDate },
    { 'Tax Invoice': 'Buyer / Customer', Value: order.buyerName },
    { 'Tax Invoice': 'Company Name', Value: order.buyerCompany },
    { 'Tax Invoice': 'Buyer Contact', Value: `${order.buyerPhone} / ${order.buyerEmail}` },
    { 'Tax Invoice': 'Billing Address', Value: order.buyerAddress },
    { 'Tax Invoice': 'Buyer GSTIN', Value: order.buyerGstin || 'URP (Unregistered)' },
    { 'Tax Invoice': 'Payment Status', Value: order.paymentStatus.toUpperCase() },
    { 'Tax Invoice': '', Value: '' },
  ];

  const itemRows = order.items.map((item, idx) => ({
    'Sr No': idx + 1,
    'SKU Code': item.sku,
    'Item Description': item.name,
    'Quantity': item.quantity,
    'Unit': item.unit,
    'Unit Rate (INR)': item.unitPrice,
    'Line Total (INR)': item.total,
  }));

  const summaryRows = [
    { 'Sr No': '', 'SKU Code': '', 'Item Description': 'Subtotal (INR)', 'Quantity': '', 'Unit': '', 'Unit Rate (INR)': '', 'Line Total (INR)': order.subtotal },
    { 'Sr No': '', 'SKU Code': '', 'Item Description': `GST / Tax (${order.taxRate}%)`, 'Quantity': '', 'Unit': '', 'Unit Rate (INR)': '', 'Line Total (INR)': order.taxAmount },
    { 'Sr No': '', 'SKU Code': '', 'Item Description': 'GRAND TOTAL (INR)', 'Quantity': '', 'Unit': '', 'Unit Rate (INR)': '', 'Line Total (INR)': order.totalAmount },
  ];

  const worksheet = XLSX.utils.json_to_sheet(metaRows, { header: ['Tax Invoice', 'Value'] });
  XLSX.utils.sheet_add_json(worksheet, itemRows, { origin: 'A12' });
  XLSX.utils.sheet_add_json(worksheet, summaryRows, { origin: `A${13 + itemRows.length}` });

  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 32 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Invoice_${order.orderNumber}`);
  XLSX.writeFile(workbook, `Invoice_${order.orderNumber}.xlsx`);
}

/**
 * 4. EXPORT BILLING / INVOICE TO PDF
 */
export function exportInvoiceToPDF(order: CustomerOrder) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('TAX INVOICE', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('OmniStock Logistics & Kitchen Supplies Private Limited', 14, 27);
  doc.text('GSTIN: 07AAFCO2026M1Z4 | info@omnistock.com | +91 98765 43210', 14, 32);

  // Invoice Meta Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 32, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice No: ${order.orderNumber}`, 18, 46);
  doc.text(`Invoice Date: ${order.orderDate}`, 18, 52);
  doc.text(`Order Status: ${order.status.toUpperCase()}`, 18, 58);
  doc.text(`Payment: ${order.paymentStatus.toUpperCase()}`, 18, 64);

  doc.text(`Billed To: ${order.buyerName} (${order.buyerCompany})`, 100, 46);
  doc.text(`Phone / WhatsApp: ${order.buyerWhatsapp || order.buyerPhone}`, 100, 52);
  doc.text(`GSTIN: ${order.buyerGstin || 'Unregistered Buyer'}`, 100, 58);
  doc.text(`Address: ${order.buyerAddress || 'Standard Warehouse Delivery'}`, 100, 64);

  // Items Table
  const tableData = order.items.map((item, idx) => [
    idx + 1,
    item.name,
    item.sku,
    `${item.quantity} ${item.unit}`,
    `₹${item.unitPrice.toLocaleString('en-IN')}`,
    `₹${item.total.toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['#', 'Item Description', 'SKU', 'Quantity', 'Rate (INR)', 'Amount (INR)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Subtotals & Tax
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Subtotal:`, 130, finalY);
  doc.setTextColor(15, 23, 42);
  doc.text(`₹${order.subtotal.toLocaleString('en-IN')}`, 175, finalY, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.text(`GST / Taxes (${order.taxRate}%):`, 130, finalY + 6);
  doc.setTextColor(15, 23, 42);
  doc.text(`₹${order.taxAmount.toLocaleString('en-IN')}`, 175, finalY + 6, { align: 'right' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(15, 23, 42);
  doc.line(130, finalY + 9, 175, finalY + 9);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total:`, 130, finalY + 16);
  doc.text(`₹${order.totalAmount.toLocaleString('en-IN')}`, 175, finalY + 16, { align: 'right' });

  // Signatures
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Authorized Signatory / Warehouse Dispatcher', 14, finalY + 28);
  doc.text('This is a computer generated invoice requiring no physical signature.', 14, finalY + 34);

  doc.save(`Invoice_${order.orderNumber}.pdf`);
}

/**
 * 5. EXPORT PURCHASE ORDER TO EXCEL (.xlsx)
 */
export function exportPOToExcel(po: PurchaseOrder) {
  const meta = [
    { Property: 'PURCHASE ORDER', Detail: 'OmniStock Procurement System' },
    { Property: 'PO Number', Detail: po.poNumber },
    { Property: 'Supplier / Vendor', Detail: po.supplier },
    { Property: 'Category', Detail: po.category },
    { Property: 'Status', Detail: po.status.toUpperCase() },
    { Property: 'Total Value (INR)', Detail: po.totalValue },
    { Property: 'SKU Count', Detail: po.skuCount },
    { Property: 'Expected Delivery', Detail: po.expectedDelivery || 'Within 48 hours' },
    { Property: 'Items Summary', Detail: po.itemsSummary },
  ];

  const worksheet = XLSX.utils.json_to_sheet(meta);
  worksheet['!cols'] = [{ wch: 22 }, { wch: 45 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `PO_${po.poNumber}`);
  XLSX.writeFile(workbook, `PurchaseOrder_${po.poNumber}.xlsx`);
}

/**
 * 6. EXPORT PURCHASE ORDER TO PDF
 */
export function exportPOToPDF(po: PurchaseOrder) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('PURCHASE ORDER (PO)', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`PO Number: ${po.poNumber} | Status: ${po.status.toUpperCase()}`, 14, 27);
  doc.text(`Date: ${po.orderDate || new Date().toISOString().split('T')[0]} | OmniStock Procurement Hub`, 14, 32);

  // Supplier Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 28, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Vendor / Supplier: ${po.supplier}`, 18, 46);
  doc.text(`Category: ${po.category}`, 18, 52);
  doc.text(`Terms: ${po.paymentTerms || 'Net 30 Days | Doorstep Delivery'}`, 18, 58);

  doc.text(`Items Count: ${po.skuCount} SKUs`, 120, 46);
  doc.text(`Expected Delivery: ${po.expectedDelivery || 'Immediate Dispatch'}`, 120, 52);
  doc.text(`Total PO Value: INR ${po.totalValue.toLocaleString('en-IN')}`, 120, 58);

  const poItems = po.items && po.items.length > 0
    ? po.items.map((i, idx) => [
        idx + 1,
        i.name,
        i.sku,
        `${i.quantity} ${i.unit}`,
        `₹${i.unitPrice.toLocaleString('en-IN')}`,
        `₹${i.total.toLocaleString('en-IN')}`,
      ])
    : [
        [1, po.itemsSummary, 'SKU-BATCH', `${po.skuCount} Units`, 'Bulk Price', `₹${po.totalValue.toLocaleString('en-IN')}`],
      ];

  autoTable(doc, {
    startY: 72,
    head: [['#', 'Material Description', 'SKU', 'Order Qty', 'Rate', 'Total Value (INR)']],
    body: poItems,
    theme: 'grid',
    headStyles: {
      fillColor: [5, 150, 105], // Emerald-600
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Total PO Amount: ₹${po.totalValue.toLocaleString('en-IN')}`, 14, finalY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Approved by Kitchen Procurement Manager | OmniStock System', 14, finalY + 14);

  doc.save(`PurchaseOrder_${po.poNumber}.pdf`);
}

/**
 * 7. PRINT HTML INVOICE / PO (Native Browser Print Sheet)
 */
export function triggerBrowserPrint(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            padding: 24px;
            margin: 0;
            background: #ffffff;
          }
          .invoice-card {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 32px;
            border-radius: 12px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          h1 { margin: 0 0 6px 0; font-size: 24px; color: #0f172a; }
          p { margin: 2px 0; font-size: 13px; color: #475569; }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            text-align: left;
            padding: 8px 12px;
            font-size: 12px;
          }
          td {
            padding: 8px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
          }
          .totals {
            margin-left: auto;
            width: 280px;
            margin-bottom: 28px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 13px;
          }
          .grand-total {
            font-size: 16px;
            font-weight: bold;
            border-top: 2px solid #0f172a;
            padding-top: 6px;
            margin-top: 6px;
          }
          @media print {
            body { padding: 0; }
            .invoice-card { border: none; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="background: #0f172a; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">
            Print Document / Save as PDF
          </button>
        </div>
        ${htmlContent}
        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
