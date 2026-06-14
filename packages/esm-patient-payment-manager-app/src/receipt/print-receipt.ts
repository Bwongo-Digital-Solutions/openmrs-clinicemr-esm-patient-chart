import type { LocalBill } from '../billing/local-bill-store';

export interface ReceiptFacility {
  name: string;
  /** Optional address / contact lines printed under the facility name. */
  details?: string[];
  /** Absolute or SPA-relative logo URL. */
  logoUrl?: string;
}

export interface PrintReceiptOptions {
  bill: LocalBill;
  facility: ReceiptFacility;
  currency: string;
  /** 'RECEIPT' for a paid bill, 'INVOICE' for a pending bill. */
  documentType?: 'RECEIPT' | 'INVOICE';
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(currency: string, value: number): string {
  return `${currency} ${new Intl.NumberFormat().format(value ?? 0)}`;
}

/**
 * Builds the printable HTML document for a bill receipt/invoice. Kept separate
 * from the React component so it can be unit-tested and reused by the billing
 * module extension.
 */
export function buildReceiptHtml({ bill, facility, currency, documentType = 'RECEIPT' }: PrintReceiptOptions): string {
  const total = bill.lineItems.reduce((sum, li) => sum + (li.price ?? 0) * (li.quantity ?? 1), 0);
  const tendered = bill.amountTendered ?? total;
  const change = Math.max(0, tendered - total);
  const paidDate = bill.paidAt ?? bill.createdAt;
  const dateStr = new Date(paidDate).toLocaleString();

  const payer =
    bill.clientType === 'CORPORATE'
      ? `${bill.insuranceProvider ?? bill.paymentMethod ?? ''} (Insurance)`
      : bill.paymentMethod ?? '';

  const rows = bill.lineItems
    .map(
      (li) => `
      <tr>
        <td>${escapeHtml(li.name || 'Service')}</td>
        <td style="text-align:center">${li.quantity ?? 1}</td>
        <td style="text-align:right">${money(currency, li.price ?? 0)}</td>
        <td style="text-align:right">${money(currency, (li.price ?? 0) * (li.quantity ?? 1))}</td>
      </tr>`,
    )
    .join('');

  const facilityDetails = (facility.details ?? []).map((line) => `<div>${escapeHtml(line)}</div>`).join('');
  const logo = facility.logoUrl
    ? `<img src="${escapeHtml(facility.logoUrl)}" alt="logo" style="max-height:64px;margin-bottom:8px" />`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(documentType === 'INVOICE' ? 'Invoice' : 'Receipt')} ${escapeHtml(bill.receiptNumber ?? '')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'IBM Plex Sans', Arial, sans-serif; color: #161616; margin: 0; padding: 24px; }
  .wrap { max-width: 480px; margin: 0 auto; }
  .center { text-align: center; }
  .facility-name { font-size: 20px; font-weight: 700; }
  .facility-details { font-size: 12px; color: #525252; margin-top: 2px; }
  .doc-title { margin: 16px 0 4px; font-size: 16px; font-weight: 600; letter-spacing: 0.08em; }
  hr { border: none; border-top: 1px dashed #8d8d8d; margin: 12px 0; }
  .meta { font-size: 12px; line-height: 1.6; }
  .meta .label { color: #525252; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th { text-align: left; border-bottom: 1px solid #161616; padding: 6px 4px; }
  td { padding: 6px 4px; border-bottom: 1px solid #e0e0e0; }
  .totals { font-size: 13px; margin-top: 8px; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals .grand { font-weight: 700; font-size: 15px; border-top: 1px solid #161616; padding-top: 6px; margin-top: 4px; }
  .footer { text-align: center; font-size: 11px; color: #525252; margin-top: 20px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="wrap">
    <div class="center">
      ${logo}
      <div class="facility-name">${escapeHtml(facility.name)}</div>
      <div class="facility-details">${facilityDetails}</div>
    </div>
    <div class="center doc-title">${documentType === 'INVOICE' ? 'INVOICE' : 'PAYMENT RECEIPT'}</div>
    <hr />
    <div class="meta">
      <div><span class="label">No:</span> <strong>${escapeHtml(bill.receiptNumber ?? '—')}</strong></div>
      <div><span class="label">Date:</span> ${escapeHtml(dateStr)}</div>
      <div><span class="label">Patient:</span> ${escapeHtml(bill.patientName || bill.patientUuid)}</div>
      ${bill.cashierName ? `<div><span class="label">Served by:</span> ${escapeHtml(bill.cashierName)}</div>` : ''}
      ${bill.requestedByName ? `<div><span class="label">Requested by:</span> ${escapeHtml(bill.requestedByName)}</div>` : ''}
      ${payer ? `<div><span class="label">Payment:</span> ${escapeHtml(payer)}</div>` : ''}
    </div>
    <table>
      <thead>
        <tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row grand"><span>Total</span><span>${money(currency, total)}</span></div>
      ${
        documentType === 'RECEIPT'
          ? `<div class="row"><span>Amount tendered</span><span>${money(currency, tendered)}</span></div>
             <div class="row"><span>Change</span><span>${money(currency, change)}</span></div>`
          : ''
      }
    </div>
    <div class="footer">
      ${documentType === 'INVOICE' ? 'This is an invoice. Please pay at the cashier.' : 'Thank you. Please keep this receipt for your records.'}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens the bill receipt/invoice in a hidden iframe and triggers the browser
 * print dialog. Falls back to a popup window if iframe printing is blocked.
 */
export function printReceipt(options: PrintReceiptOptions): void {
  const html = buildReceiptHtml(options);

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      throw new Error('iframe document unavailable');
    }
    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = () => {
      window.setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    };

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      cleanup();
    };
  } catch {
    const win = window.open('', '_blank', 'width=480,height=640');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  }
}
