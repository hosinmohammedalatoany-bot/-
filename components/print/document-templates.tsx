"use client";

import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Customer, Invoice, Vehicle } from "@/lib/domain";

export function buildInvoicePrintHtml(params: {
  invoiceNumber: string;
  invoice: Invoice;
  vehicle?: Vehicle;
  customer?: Customer;
  companyName?: string;
}) {
  const { invoiceNumber, invoice, vehicle, customer, companyName = "معرض براء رائد للسيارات" } = params;
  const net = invoice.total - invoice.discount + invoice.tax;
  const paid = invoice.type === "installment" ? 0 : net;
  const remaining = net - paid;

  return `
    <div class="header">
      <div>
        <div class="brand">${companyName}</div>
        <p class="muted">فاتورة بيع سيارة</p>
      </div>
      <div style="text-align:left">
        <div><strong>رقم الفاتورة:</strong> ${invoiceNumber}</div>
        <div class="muted">${formatDateTime(invoice.createdAt)}</div>
      </div>
    </div>
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
    <p class="muted" style="margin-top:24px">الشروط والأحكام: البيع نهائي بعد التسليم والفحص. جميع الرسوم الإضافية تُحدد كتابياً.</p>
    <div class="signatures">
      <div class="sign-line">توقيع العميل</div>
      <div class="sign-line">توقيع المدير</div>
    </div>
  `;
}

export function buildTableReportHtml(title: string, headers: string[], rows: string[][]) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `
    <div class="header"><div class="brand">براء رائد</div><h1>${title}</h1><p class="muted">${formatDateTime(new Date())}</p></div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  `;
}
