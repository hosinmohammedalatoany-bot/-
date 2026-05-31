# رابط التشغيل الحالي (جلسة Cloud Agent)

> هذا الرابط **مؤقت** من Cloudflare Quick Tunnel. يتوقف عند إيقاف السيرفر أو النفق، و**يتغيّر العنوان** عند كل إعادة تشغيل. إذا ظهر `ERR_FAILED` أو «لا يمكن الوصول» — الرابط القديم انتهى؛ نفّذ `npm run tunnel` واستخدم الرابط الجديد من المخرجات.

| البند | القيمة |
|--------|--------|
| **الرابط العام (نشط الآن)** | https://tumor-harvey-legislative-abraham.trycloudflare.com |
| تسجيل الدخول | https://tumor-harvey-legislative-abraham.trycloudflare.com/login |
| **إنشاء حساب** (أول حساب = مدير النظام) | https://tumor-harvey-legislative-abraham.trycloudflare.com/register |
| إعداد بديل | https://tumor-harvey-legislative-abraham.trycloudflare.com/setup |
| لوحة التحكم | https://tumor-harvey-legislative-abraham.trycloudflare.com/dashboard/dashboard |

**رابط سابق (لم يعد يعمل):** `https://feeds-collectables-part-more.trycloudflare.com`

**آخر تحديث:** 2026-05-31 — أُعيد تشغيل التطبيق + نفق جديد بعد `ERR_FAILED`.

## إعادة تشغيل الرابط

```bash
PORT=3000 bash scripts/start-tunnel.sh
```

أو يدوياً:

```bash
npm run build
fuser -k 3000/tcp 2>/dev/null || true
HOSTNAME=0.0.0.0 PORT=3000 npm run start
# في طرفية ثانية:
cloudflared tunnel --url http://127.0.0.1:3000
```

انسخ الرابط الجديد من مخرجات `cloudflared` (سطر `trycloudflare.com`).

## للإنتاج الدائم (VPS)

راجع `docs/DEPLOY_PUBLIC_URL.md` — PM2 + Nginx + SSL + `NEXT_PUBLIC_APP_URL=https://app.powerxerp.com`
