"use client";

import { formatCurrency, formatDateTime } from "@/lib/utils";
import { loadCompanyPrintSettings } from "@/lib/company-print-settings";
import { wrapPrintDocument } from "@/lib/print-document";
import type { Customer, Invoice, Vehicle } from "@/lib/domain";

export function buildInvoicePrintHtml(params: {
  invoiceNumber: string;
  invoice: Invoice;
  vehicle?: Vehicle;
  customer?: Customer;
  companyName?: string;
}) {
  const { invoiceNumber, invoice, vehicle, customer } = params;
  const settings = loadCompanyPrintSettings();
  const net = invoice.total - invoice.discount + invoice.tax;
  const paid = invoice.type === "installment" ? 0 : net;
  const remaining = net - paid;

  const body = `
    <h2>بيانات العميل</h2>
    <table>
      <tr><th>الاسم</th><td>${customer?.name ?? "—"}</td></tr>
      <tr><th>الهاتف</th><td>${customer?.phone ?? "—"}</td></tr>
      <tr><th>العنوان</th><td>${customer?.address ?? "—"}</td></tr>
      <tr><th>رقم الهوية</th><td>${customer?.idNumber ?? "—"}</td></tr>
    </table>
    <h2>بيانات السيارة</h2>
    <table>
      <tr><th>المركبة</th><td>${vehicle ? `${vehicle.manufacturer} ${vehicle.model} ${vehicle.trim}` : "—"}</td></tr>
      <tr><th>السنة</th><td>${vehicle?.year ?? "—"}</td></tr>
      <tr><th>اللون</th><td>${vehicle?.exteriorColor ?? "—"}</td></tr>
      <tr><th>VIN</th><td dir="ltr">${vehicle?.vin ?? "—"}</td></tr>
      <tr><th>اللوحة</th><td>${vehicle?.plateNumber ?? "—"}</td></tr>
      <tr><th>الكيلومترات</th><td>${vehicle?.mileage?.toLocaleString("ar-IQ") ?? "—"}</td></tr>
    </table>
    <h2>بيانات الدفع</h2>
    <table>
      <tr><th>سعر السيارة</th><td>${formatCurrency(invoice.total)}</td></tr>
      <tr><th>الخصم</th><td>${formatCurrency(invoice.discount)}</td></tr>
      <tr><th>الضريبة</th><td>${formatCurrency(invoice.tax)}</td></tr>
      <tr><th>الإجمالي</th><td><strong>${formatCurrency(net)}</strong></td></tr>
      <tr><th>المدفوع</th><td>${formatCurrency(paid)}</td></tr>
      <tr><th>المتبقي</th><td>${formatCurrency(remaining)}</td></tr>
      <tr><th>طريقة الدفع</th><td>${invoice.type}</td></tr>
    </table>
    <div class="signatures">
      <div class="sign-line">توقيع العميل</div>
      <div class="sign-line">توقيع المدير</div>
    </div>
  `;

  return wrapPrintDocument(
    {
      documentTitle: "فاتورة بيع سيارة",
      documentNumber: invoiceNumber,
      documentDate: invoice.createdAt
    },
    body,
    settings
  );
}

export function buildSaleContractPrintHtml(params: {
  contractNumber: string;
  invoice: Invoice;
  vehicle?: Vehicle;
  customer?: Customer;
}) {
  const { contractNumber, invoice, vehicle, customer } = params;
  const settings = loadCompanyPrintSettings();
  const net = invoice.total - invoice.discount + invoice.tax;

  const body = `
    <p>تم الاتفاق بين ${settings.companyName} (الطرف الأول — البائع) والسيد/ة <strong>${customer?.name ?? "—"}</strong> (الطرف الثاني — المشتري) على بيع المركبة الموصوفة أدناه وفق الشروط التالية.</p>
    <h2>بيانات المركبة</h2>
    <table>
      <tr><th>المركبة</th><td>${vehicle ? `${vehicle.manufacturer} ${vehicle.model}` : "—"}</td></tr>
      <tr><th>السنة</th><td>${vehicle?.year ?? "—"}</td></tr>
      <tr><th>VIN</th><td dir="ltr">${vehicle?.vin ?? "—"}</td></tr>
      <tr><th>سعر البيع</th><td><strong>${formatCurrency(net)}</strong></td></tr>
      <tr><th>طريقة الدفع</th><td>${invoice.type}</td></tr>
    </table>
    <p class="muted">يُقر الطرفان بصحة البيانات ويتحمل المشتري مسؤولية نقل الملكية والرسوم الرسمية ما لم يُتفق خلاف ذلك.</p>
    <div class="signatures">
      <div class="sign-line">توقيع البائع</div>
      <div class="sign-line">توقيع المشتري</div>
    </div>
  `;

  return wrapPrintDocument(
    {
      documentTitle: "عقد بيع سيارة",
      documentNumber: contractNumber,
      documentDate: invoice.createdAt
    },
    body,
    settings
  );
}

export function buildInstallmentContractPrintHtml(params: {
  contractNumber: string;
  totalAmount: number;
  customerName?: string;
  scheduleNote?: string;
}) {
  const { contractNumber, totalAmount, customerName, scheduleNote } = params;
  const settings = loadCompanyPrintSettings();

  const body = `
    <p>عقد تقسيط بين ${settings.companyName} والعميل <strong>${customerName ?? "—"}</strong> بمبلغ إجمالي <strong>${formatCurrency(totalAmount)}</strong>.</p>
    ${scheduleNote ? `<p>${scheduleNote}</p>` : "<p>يُسدد المبلغ على أقساط دورية حسب الجدول المعتمد في النظام.</p>"}
    <div class="signatures">
      <div class="sign-line">توقيع المعرض</div>
      <div class="sign-line">توقيع العميل</div>
    </div>
  `;

  return wrapPrintDocument(
    {
      documentTitle: "عقد التقسيط",
      documentNumber: contractNumber,
      documentDate: new Date()
    },
    body,
    settings
  );
}

export function buildPaymentReceiptPrintHtml(params: {
  receiptNumber: string;
  amount: number;
  payerName?: string;
  reference?: string;
  note?: string;
}) {
  const { receiptNumber, amount, payerName, reference, note } = params;
  const settings = loadCompanyPrintSettings();

  const body = `
    <table>
      <tr><th>المستلم من</th><td>${payerName ?? "—"}</td></tr>
      <tr><th>المبلغ</th><td><strong>${formatCurrency(amount)}</strong></td></tr>
      ${reference ? `<tr><th>المرجع</th><td>${reference}</td></tr>` : ""}
      ${note ? `<tr><th>البيان</th><td>${note}</td></tr>` : ""}
    </table>
    <div class="signatures">
      <div class="sign-line">توقيع المحاسب</div>
      <div class="sign-line">توقيع العميل</div>
    </div>
  `;

  return wrapPrintDocument(
    {
      documentTitle: params.note?.includes("حجز") ? "إيصال حجز" : "إيصال دفع",
      documentNumber: receiptNumber,
      documentDate: new Date()
    },
    body,
    settings
  );
}

export function buildTableReportHtml(title: string, headers: string[], rows: string[][]) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  const table = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

  return wrapPrintDocument(
    {
      documentTitle: title,
      documentDate: new Date()
    },
    table
  );
}

export function buildAccountStatementPrintHtml(params: {
  title: string;
  partyName: string;
  headers: string[];
  rows: string[][];
}) {
  const intro = `<p><strong>الاسم:</strong> ${params.partyName}</p>`;
  const head = params.headers.map((h) => `<th>${h}</th>`).join("");
  const body = params.rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  const table = `${intro}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

  return wrapPrintDocument(
    {
      documentTitle: params.title,
      documentDate: new Date()
    },
    table
  );
}
