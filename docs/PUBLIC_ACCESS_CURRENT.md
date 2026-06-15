# الوصول العام الحالي — Baraa Raed

آخر تحديث: 2026-05-31

## ملاحظة مهمة (بيئة Cursor Cloud)

إذا كان التطبيق يعمل على **خادم بعيد** (Cursor Cloud Agent)، فإن `http://127.0.0.1:3000` على جهازك **لن يعمل** — يجب استخدام **نفق Cloudflare** أو تشغيل المشروع محلياً على Windows.

## الرابط النشط

| الاستخدام | الرابط |
|-----------|--------|
| **الرابط العام (نشط الآن)** | `https://bristol-violin-guardian-happened.trycloudflare.com` |
| تسجيل الدخول | https://bristol-violin-guardian-happened.trycloudflare.com/login |
| التسجيل (أول حساب عبر `/setup` = مدير النظام) | https://bristol-violin-guardian-happened.trycloudflare.com/register |
| الإعداد الأول | https://bristol-violin-guardian-happened.trycloudflare.com/setup |
| لوحة التحكم | https://bristol-violin-guardian-happened.trycloudflare.com/dashboard/dashboard |
| معرض السيارات العام | https://bristol-violin-guardian-happened.trycloudflare.com/showroom |

> **مهم:** روابط `*.trycloudflare.com` تتغيّر عند كل تشغيل لـ `npm run tunnel`. الرابط الحالي يُحفظ أيضاً في `.public-url` في جذر المشروع.

مثال سابق (منتهي): `https://loan-organizations-humanitarian-grand.trycloudflare.com` — لا يعمل بعد إيقاف النفق.

## تشغيل النفق (إنتاج — مطلوب للهاتف)

لا تستخدم `next dev` خلف Cloudflare (شاشة بيضاء / أخطاء chunks).

```bash
# طرفية 1 — Django
npm run api:dev

# طرفية 2 — Next (بعد build)
rm -rf .next && npm install && npm run build
HOSTNAME=0.0.0.0 PORT=3000 npm run start

# طرفية 3 — نفق (يربط 127.0.0.1:3000)
npm run tunnel
```

أو أمر واحد للنفق: `npm run tunnel` يشغّل **Django + Next إنتاج** على المنافذ 8000 و 3000 تلقائياً إن لم يكونا يعملان.

**بدون Docker/Postgres:** أضف في `.env.local`:

```env
USE_SQLITE=true
DJANGO_API_URL=http://127.0.0.1:8000
```

في `.env.local` (غير مُرفوع إلى Git):

```env
NEXT_PUBLIC_APP_URL=https://YOUR-SUBDOMAIN.trycloudflare.com
NEXT_PUBLIC_API_BASE_URL=https://YOUR-SUBDOMAIN.trycloudflare.com
DJANGO_API_URL=http://127.0.0.1:8000
```

`DJANGO_API_URL` للخادم فقط (BFF على نفس الجهاز). المتصفح يستخدم `NEXT_PUBLIC_*` بدون `localhost`.

## تشغيل محلي (نفس الجهاز)

```bash
npm run build
HOSTNAME=0.0.0.0 PORT=3000 npm run start
# http://127.0.0.1:3000
```

## نطاق الإنتاج

`app.powerxerp.com` في `production.env.example` **مثال فقط** — لا يعمل حتى تُسجّل DNS وتُوجّهه إلى الخادم.
