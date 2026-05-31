/** QR / barcode URLs and HTML blocks for print documents. */

import { resolveClientAppOrigin } from "@/lib/runtime-config";

/** Absolute origin for verify links — always prefers the page the user opened (tunnel or production). */
export function getAppOrigin() {
  const origin = resolveClientAppOrigin();
  if (origin) return origin;
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function invoiceVerifyUrl(invoiceNumber: string) {
  return `${getAppOrigin()}/verify/invoice/${encodeURIComponent(invoiceNumber)}`;
}

export function vehicleVerifyUrl(vehicleId: string) {
  return `${getAppOrigin()}/verify/vehicle/${encodeURIComponent(vehicleId)}`;
}

export function reportVerifyUrl(reportId: string, title: string) {
  const q = new URLSearchParams({ id: reportId, title });
  return `${getAppOrigin()}/verify/report?${q.toString()}`;
}

/** Same-origin image URL for embedded print iframes. */
export function qrImageSrc(payload: string, size = 128) {
  return `/api/codes/qr?data=${encodeURIComponent(payload)}&size=${size}`;
}

export function barcodeImageSrc(value: string, height = 56) {
  return `/api/codes/barcode?data=${encodeURIComponent(value)}&height=${height}`;
}

export function buildPrintCodesBlockHtml(options: {
  qrPayload?: string;
  barcodeValue?: string;
  qrCaption?: string;
  barcodeCaption?: string;
}) {
  const { qrPayload, barcodeValue, qrCaption, barcodeCaption } = options;
  if (!qrPayload && !barcodeValue) return "";

  const qrPart = qrPayload
    ? `<div class="print-code-cell">
        <img class="print-code-img print-qr" src="${qrImageSrc(qrPayload)}" alt="QR" width="128" height="128" />
        ${qrCaption ? `<p class="print-code-caption">${qrCaption}</p>` : ""}
      </div>`
    : "";

  const barcodePart = barcodeValue
    ? `<div class="print-code-cell">
        <img class="print-code-img print-barcode" src="${barcodeImageSrc(barcodeValue)}" alt="Barcode" />
        ${barcodeCaption ? `<p class="print-code-caption">${barcodeCaption}</p>` : `<p class="print-code-caption">${barcodeValue}</p>`}
      </div>`
    : "";

  return `<section class="print-codes-row">${qrPart}${barcodePart}</section>`;
}
