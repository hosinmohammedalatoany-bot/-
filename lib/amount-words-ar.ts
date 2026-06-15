/** تحويل مبلغ إلى كلمات عربية (دينار عراقي) للإيصالات والعقود. */

const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const teens = [
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر"
];

function under100(n: number): string {
  if (n === 0) return "";
  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (o === 0) return tens[t];
  return `${ones[o]} و${tens[t]}`;
}

function under1000(n: number): string {
  if (n === 0) return "";
  if (n < 100) return under100(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hundred =
    h === 1 ? "مائة" : h === 2 ? "مائتان" : `${ones[h]}مائة`;
  if (rest === 0) return hundred;
  return `${hundred} و${under100(rest)}`;
}

function chunkToWords(n: number, scale: string): string {
  if (n === 0) return "";
  if (n === 1 && scale) return scale.trim();
  if (n === 2 && scale) return scale === "ألف" ? "ألفان" : scale === "مليون" ? "مليونان" : `اثنان ${scale}`;
  if (n >= 3 && n <= 10 && scale) return `${under1000(n)} ${scale}`;
  if (scale) return `${under1000(n)} ${scale}`;
  return under1000(n);
}

function integerToArabicWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n === 0) return "صفر";

  const parts: string[] = [];
  let remaining = Math.floor(n);

  const millions = Math.floor(remaining / 1_000_000);
  remaining %= 1_000_000;
  if (millions) parts.push(chunkToWords(millions, "مليون"));

  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousands) parts.push(chunkToWords(thousands, "ألف"));

  if (remaining) parts.push(under1000(remaining));

  return parts.filter(Boolean).join(" و");
}

export function amountToArabicWords(amount: number, currencyLabel = "دينار عراقي"): string {
  const abs = Math.abs(amount);
  const whole = Math.floor(abs);
  const fils = Math.round((abs - whole) * 1000);

  let text = integerToArabicWords(whole);
  if (fils > 0) {
    text += ` و${integerToArabicWords(fils)} فلس`;
  }
  text += ` ${currencyLabel} فقط لا غير`;
  if (amount < 0) text = `سالب ${text}`;
  return text;
}
