"use client";

import { amountToArabicWords } from "@/lib/amount-words-ar";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ar } from "@/lib/i18n/ar";
import { loadCompanyPrintSettings } from "@/lib/company-print-settings";
import {
  buildPrintCodesBlockHtml,
  invoiceVerifyUrl,
  reportVerifyUrl,
  vehicleVerifyUrl
} from "@/lib/document-codes";
import {
  buildInstallmentScheduleTableHtml,
  buildLineItemsTableHtml,
  invoiceToDefaultLineItems,
  lineItemTotal,
  type InstallmentSchedulePrintRow,
  type PrintLineItem
} from "@/lib/print-line-items";
import { wrapPrintDocument } from "@/lib/print-document";
import type { Customer, Invoice, Vehicle } from "@/lib/domain";

function paymentTypeLabel(type: Invoice["type"]) {
  return ar.paymentType[type] ?? type;
}

function invoiceStatusLabel(status: Invoice["status"]) {
  const map: Record<Invoice["status"], string> = {
    draft: "مسودة",
    issued: "صادرة",
    revised: "معدّلة"
  };
  return map[status] ?? status;
}

export function buildInvoicePrintHtml(params: {
  invoiceNumber: string;
  invoice: Invoice;
  vehicle?: Vehicle;
  customer?: Customer;
  lineItems?: PrintLineItem[];
}) {
  const { invoiceNumber, invoice, vehicle, customer } = params;
  const settings = loadCompanyPrintSettings();
  const items = params.lineItems ?? invoiceToDefaultLineItems(invoice, vehicle);
  const itemsSum = items.reduce((s, it) => s + lineItemTotal(it), 0);
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
      <tr><th>الشركة</th><td>${vehicle?.manufacturer ?? "—"}</td></tr>
      <tr><th>الموديل</th><td>${vehicle?.model ?? "—"}</td></tr>
      <tr><th>الفئة</th><td>${vehicle?.trim ?? "—"}</td></tr>
      <tr><th>السنة</th><td>${vehicle?.year ?? "—"}</td></tr>
      <tr><th>اللون</th><td>${vehicle?.exteriorColor ?? "—"}</td></tr>
      <tr><th>VIN</th><td dir="ltr">${vehicle?.vin ?? "—"}</td></tr>
      <tr><th>اللوحة</th><td>${vehicle?.plateNumber ?? "—"}</td></tr>
      <tr><th>الرقم الداخلي</th><td>${vehicle?.internalNumber ?? "—"}</td></tr>
      <tr><th>الكيلومترات</th><td>${vehicle?.mileage?.toLocaleString("ar-IQ") ?? "—"}</td></tr>
    </table>
    <h2>بنود الفاتورة</h2>
    ${buildLineItemsTableHtml(items)}
    <h2>الملخص المالي</h2>
    <table class="print-summary-table">
      <tr><th>مجموع البنود (معاينة)</th><td>${formatCurrency(itemsSum)}</td></tr>
      <tr><th>سعر السيارة</th><td>${formatCurrency(invoice.total)}</td></tr>
      <tr><th>الخصم</th><td>${formatCurrency(invoice.discount)}</td></tr>
      <tr><th>الضريبة</th><td>${formatCurrency(invoice.tax)}</td></tr>
      <tr><th>الإجمالي</th><td><strong>${formatCurrency(net)}</strong></td></tr>
      <tr><th>المدفوع</th><td>${formatCurrency(paid)}</td></tr>
      <tr><th>المتبقي</th><td>${formatCurrency(remaining)}</td></tr>
      <tr><th>طريقة الدفع</th><td>${paymentTypeLabel(invoice.type)}</td></tr>
      <tr><th>حالة الفاتورة</th><td>${invoiceStatusLabel(invoice.status)}</td></tr>
    </table>
    ${buildPrintCodesBlockHtml({
      qrPayload: invoiceVerifyUrl(invoiceNumber),
      barcodeValue: invoiceNumber,
      qrCaption: "امسح للتحقق من الفاتورة",
      barcodeCaption: `كود الفاتورة: ${invoiceNumber}`
    })}
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
  const legal = settings.contractLegalText?.trim()
    ? `<div class="legal-text"><p>${settings.contractLegalText.replace(/\n/g, "</p><p>")}</p></div>`
    : "";

  const body = `
    <div class="legal-text">
      <p>تم الاتفاق بين <strong>${settings.companyName}</strong> (الطرف الأول — البائع) والسيد/ة <strong>${customer?.name ?? "—"}</strong> هوية <strong>${customer?.idNumber ?? "—"}</strong> (الطرف الثاني — المشتري) على بيع المركبة الموصوفة أدناه.</p>
    </div>
    ${legal}
    <h2>بيانات المركبة والسعر</h2>
    <table>
      <tr><th>المركبة</th><td>${vehicle ? `${vehicle.manufacturer} ${vehicle.model} ${vehicle.trim}` : "—"}</td></tr>
      <tr><th>السنة / اللون</th><td>${vehicle ? `${vehicle.year} — ${vehicle.exteriorColor}` : "—"}</td></tr>
      <tr><th>VIN</th><td dir="ltr">${vehicle?.vin ?? "—"}</td></tr>
      <tr><th>اللوحة</th><td>${vehicle?.plateNumber ?? "—"}</td></tr>
      <tr><th>سعر البيع</th><td><strong>${formatCurrency(net)}</strong></td></tr>
      <tr><th>طريقة الدفع</th><td>${paymentTypeLabel(invoice.type)}</td></tr>
    </table>
    <h2>شروط إضافية</h2>
    <div class="legal-text">
      <p>يلتزم المشتري بنقل الملكية والرسوم الرسمية ما لم يُتفق خلاف ذلك.</p>
      <p>الضمان حسب سياسة المعرض ما لم يُذكر نص صريح في العقد.</p>
      <p>يُعتبر هذا العقد ملزماً للطرفين عند التوقيع.</p>
    </div>
    ${buildPrintCodesBlockHtml({
      qrPayload: vehicle?.id ? vehicleVerifyUrl(vehicle.id) : invoiceVerifyUrl(contractNumber),
      barcodeValue: vehicle?.internalNumber || contractNumber,
      qrCaption: vehicle?.id ? "امسح لبيانات السيارة" : "امسح للتحقق من العقد",
      barcodeCaption: vehicle?.internalNumber ? `كود السيارة: ${vehicle.internalNumber}` : `عقد: ${contractNumber}`
    })}
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
  downPayment?: number;
  installmentCount?: number;
  customerName?: string;
  scheduleRows?: InstallmentSchedulePrintRow[];
}) {
  const { contractNumber, totalAmount, customerName, scheduleRows } = params;
  const settings = loadCompanyPrintSettings();
  const down = params.downPayment ?? 0;
  const count = params.installmentCount ?? scheduleRows?.length ?? 0;

  const body = `
    <p>عقد تقسيط بين <strong>${settings.companyName}</strong> والعميل <strong>${customerName ?? "—"}</strong>.</p>
    <table class="print-summary-table">
      <tr><th>المبلغ الإجمالي</th><td><strong>${formatCurrency(totalAmount)}</strong></td></tr>
      <tr><th>الدفعة الأولى</th><td>${formatCurrency(down)}</td></tr>
      <tr><th>عدد الأقساط</th><td>${count || "—"}</td></tr>
    </table>
    <h2>جدول الأقساط</h2>
    ${scheduleRows?.length ? buildInstallmentScheduleTableHtml(scheduleRows) : "<p class=\"muted\">يُسدد المبلغ على أقساط دورية حسب الجدول المعتمد في النظام.</p>"}
    <div class="legal-text"><p>${settings.contractLegalText}</p></div>
    ${buildPrintCodesBlockHtml({
      barcodeValue: contractNumber,
      qrPayload: reportVerifyUrl(contractNumber, "عقد التقسيط"),
      qrCaption: "امسح للتحقق من العقد",
      barcodeCaption: `عقد تقسيط: ${contractNumber}`
    })}
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
  const isReservation = note?.includes("حجز");

  const body = `
    <table>
      <tr><th>المستلم من</th><td>${payerName ?? "—"}</td></tr>
      <tr><th>المبلغ</th><td><strong>${formatCurrency(amount)}</strong></td></tr>
      <tr><th>المبلغ كتابةً</th><td>${amountToArabicWords(amount)}</td></tr>
      ${reference ? `<tr><th>المرجع</th><td>${reference}</td></tr>` : ""}
      ${note ? `<tr><th>البيان</th><td>${note}</td></tr>` : ""}
    </table>
    <p class="amount-words">${amountToArabicWords(amount)}</p>
    ${buildPrintCodesBlockHtml({
      barcodeValue: receiptNumber,
      qrPayload: reportVerifyUrl(receiptNumber, isReservation ? "إيصال حجز" : "إيصال دفع"),
      qrCaption: "إيصال رسمي",
      barcodeCaption: `رقم الإيصال: ${receiptNumber}`
    })}
  `;

  return wrapPrintDocument(
    {
      documentTitle: isReservation ? "إيصال حجز" : "إيصال دفع",
      documentNumber: receiptNumber,
      documentDate: new Date()
    },
    body,
    settings
  );
}

export function buildTableReportHtml(
  title: string,
  headers: string[],
  rows: string[][],
  summary?: { label: string; value: string }[]
) {
  const settings = loadCompanyPrintSettings();
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;
  const summaryHtml = summary?.length
    ? `<div class="print-report-summary">${summary
        .map((s) => `<span><strong>${s.label}:</strong> ${s.value}</span>`)
        .join("")}</div>`
    : `<div class="print-report-summary"><span><strong>عدد السجلات:</strong> ${rows.length}</span></div>`;

  const table = `${summaryHtml}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  const codes = buildPrintCodesBlockHtml({
    qrPayload: reportVerifyUrl(reportId, title),
    barcodeValue: reportId,
    qrCaption: "تقرير رسمي — baraa raed",
    barcodeCaption: reportId
  });

  return wrapPrintDocument(
    {
      documentTitle: title,
      documentNumber: reportId,
      documentDate: new Date()
    },
    `${table}${codes}`,
    settings
  );
}

export function buildAccountStatementPrintHtml(params: {
  title: string;
  partyName: string;
  headers: string[];
  rows: string[][];
  totals?: { label: string; value: string }[];
}) {
  const intro = `<p><strong>الاسم:</strong> ${params.partyName}</p>`;
  const head = params.headers.map((h) => `<th>${h}</th>`).join("");
  const body = params.rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  const totals =
    params.totals?.length ?
      `<table class="print-summary-table">${params.totals
        .map((t) => `<tr><th>${t.label}</th><td>${t.value}</td></tr>`)
        .join("")}</table>`
    : "";
  const table = `${intro}${totals}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

  return wrapPrintDocument(
    {
      documentTitle: params.title,
      documentDate: new Date()
    },
    table
  );
}
